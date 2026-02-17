import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { 
  Users, 
  TrendingUp, 
  Star, 
  Search, 
  Download, 
  Eye,
  Edit,
  Folder,
} from 'lucide-react';

const StudentsManagement = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const [studentData, setStudentData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState(null);

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formValues, setFormValues] = useState({
    student_number: '',
    email: '',
    firstname: '',
    middlename: '',
    lastname: '',
    department: 'CITE',
    program: 'BSIT',
    year_level: '',
    birthdate: '',
    enrolled_subjects: [],
    subject_code_input: '',
    subject_description_input: '',
    subject_instructor_input: '',
    block_section: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    // sanitize student number to only digits and hyphens
    if (name === 'student_number') {
      newValue = String(value).replace(/[^0-9-]/g, '');
    }
    setFormValues((prev) => ({ ...prev, [name]: newValue }));
    // clear field-specific error when user types
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const resetForm = () => {
    setFormValues({
      student_number: '',
      email: '',
      firstname: '',
      middlename: '',
      lastname: '',
      department: 'CITE',
      program: 'BSIT',
      year_level: '',
      birthdate: '',
      enrolled_subjects: [],
      subject_code_input: '',
      subject_description_input: '',
      subject_instructor_input: '',
      block_section: '',
    });
    setErrorMessage('');
    setFormErrors({});
  };

  const validateField = (name) => {
    const value = String(formValues[name] || '').trim();
    let error;
    if (name === 'student_number') {
      if (!value) error = 'Student number is required.';
      else if (!/^[0-9-]+$/.test(value)) error = 'Only numbers and dashes are allowed.';
    } else if (name === 'email') {
      if (!value) error = 'Email is required.';
      else if (!/^\S+@\S+\.\S+$/.test(value)) error = 'Enter a valid email address.';
    } else if (name === 'firstname') {
      if (!value) error = 'First name is required.';
    } else if (name === 'middlename') {
      if (!value) error = 'Middle name is required.';
    } else if (name === 'lastname') {
      if (!value) error = 'Last name is required.';
    } else if (name === 'birthdate') {
      if (!value) error = 'Birthdate is required.';
    } else if (name === 'year_level') {
      if (!value) error = 'Year level is required.';
    } else if (name === 'block_section') {
      if (!value) error = 'Block / Section is required.';
    } else if (name === 'enrolled_subjects') {
      const list = Array.isArray(formValues.enrolled_subjects) ? formValues.enrolled_subjects : [];
      if (list.length === 0) error = 'Please add at least one enrolled subject.';
    }

    setFormErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const validateForm = () => {
    const errors = {};

    // student number
    if (!String(formValues.student_number || '').trim()) {
      errors.student_number = 'Student number is required.';
    } else if (!/^[0-9-]+$/.test(formValues.student_number)) {
      errors.student_number = 'Only numbers and dashes are allowed.';
    }

    // email
    if (!String(formValues.email || '').trim()) {
      errors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(formValues.email)) {
      errors.email = 'Enter a valid email address.';
    }

    // names
    if (!String(formValues.firstname || '').trim()) errors.firstname = 'First name is required.';
    if (!String(formValues.middlename || '').trim()) errors.middlename = 'Middle name is required.';
    if (!String(formValues.lastname || '').trim()) errors.lastname = 'Last name is required.';

    // birthdate
    if (!String(formValues.birthdate || '').trim()) errors.birthdate = 'Birthdate is required.';

    // year level
    if (!String(formValues.year_level || '').trim()) errors.year_level = 'Year level is required.';

    // block / section
    if (!String(formValues.block_section || '').trim()) errors.block_section = 'Block / Section is required.';

    // enrolled subjects
    if (!Array.isArray(formValues.enrolled_subjects) || formValues.enrolled_subjects.length === 0) {
      errors.enrolled_subjects = 'Please add at least one enrolled subject.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addSubject = () => {
    const code = String(formValues.subject_code_input || '').trim();
    const desc = String(formValues.subject_description_input || '').trim();
    const inst = String(formValues.subject_instructor_input || '').trim();
    if (!code || !desc || !inst) return;
    setFormValues((prev) => ({
      ...prev,
      enrolled_subjects: [...(prev.enrolled_subjects || []), { code, description: desc, instructor_name: inst }],
      subject_code_input: '',
      subject_description_input: '',
      subject_instructor_input: '',
    }));
    // clear enrolled_subjects error when a subject is added
    setFormErrors((prev) => ({ ...prev, enrolled_subjects: undefined }));
  };

  const removeSubject = (index) => {
    setFormValues((prev) => ({
      ...prev,
      enrolled_subjects: prev.enrolled_subjects.filter((_, i) => i !== index),
    }));
    // if removing leaves no subjects, set an error
    setTimeout(() => {
      setFormErrors((prev) => {
        const remaining = (formValues.enrolled_subjects || []).filter((_, i) => i !== index);
        return { ...prev, enrolled_subjects: remaining.length === 0 ? 'Please add at least one enrolled subject.' : undefined };
      });
    }, 0);
  };

  const closeModal = () => {
    setIsAddOpen(false);
    resetForm();
    setIsEditing(false);
    setEditingId(null);
  };

  const formatYearLabel = (level) => {
    const value = Number(level);
    if (!value) return '';
    if (value === 1) return '1st Year';
    if (value === 2) return '2nd Year';
    if (value === 3) return '3rd Year';
    return `${value}th Year`;
  };

  const mapStudent = (student) => ({
    // `id` is the display student number; `pk` is the DB primary key used for API actions
    id: student.student_number,
    pk: student.id,
    name: `${student.firstname || ''} ${student.lastname || ''}`.trim(),
    program: student.program || 'N/A',
    subject: Array.isArray(student.enrolled_subjects)
      ? student.enrolled_subjects.map(s => typeof s === 'object' ? `${s.code} - ${s.description}` : s).join(', ')
      : student.enrolled_subject || student.subject || 'N/A',
    block: student.block_section || student.block || 'N/A',
    year: formatYearLabel(student.year_level),
    modules: 0,
    completed: 0,
    pending: 0,
    status: 'Active',
  });

  // Helper function to create audit log entries
  const createAuditLog = async (action, message) => {
    try {
      const auditData = {
        action: action,
        message: message,
        category: 'USER MANAGEMENT',
        status: 'Success',
      };

      await fetch(`${API_BASE_URL}/audit-logs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(auditData),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  };

  const fetchStudents = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await fetch(`${API_BASE_URL}/students/`);
      const data = await response.json();
      if (!response.ok) {
        setLoadError('Unable to load students.');
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setStudentData(list.map(mapStudent));
    } catch {
      setLoadError('Unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArchivedStudents = async () => {
    setIsLoadingArchived(true);
    setArchiveError('');
    try {
      const res = await fetch(`${API_BASE_URL}/students/archived/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (!res.ok) {
        setArchiveError('Unable to load archived students.');
        setArchivedStudents([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setArchivedStudents(list.map(mapStudent));
    } catch (e) {
      setArchiveError('Unable to reach the server.');
      setArchivedStudents([]);
    } finally {
      setIsLoadingArchived(false);
    }
  };

  const restoreStudent = async (studentId) => {
    const ok = window.confirm('Restore this student? This will make them active again.');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) {
        setArchiveError('Unable to restore student.');
        return;
      }
      const data = await res.json();
      await createAuditLog(
        'Restored Student',
        `Restored student: ${data.firstname || ''} ${data.lastname || ''} (${data.student_number || data.id || studentId})`
      );
      // refresh lists
      fetchStudents();
      fetchArchivedStudents();
    } catch (e) {
      setArchiveError('Unable to reach the server.');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    // validate and either create or update
    if (!validateForm()) {
      setErrorMessage('Please fix the errors in the form.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formValues,
        year_level: Number(formValues.year_level),
        enrolled_subjects: formValues.enrolled_subjects || [],
      };

      const url = isEditing && editingId ? `${API_BASE_URL}/students/${editingId}/` : `${API_BASE_URL}/students/`;
      const method = isEditing && editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(payload),
      });

      let data = {};
      try { data = await response.json(); } catch { data = {}; }

      if (!response.ok) {
        const fieldErrors = Object.entries(data || {})
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages[0] : messages}`)
          .join(' | ');
        const errorText = data?.detail || data?.non_field_errors?.[0] || fieldErrors || 'Unable to save student.';
        setErrorMessage(errorText);
        return;
      }

      const saved = mapStudent({
        student_number: data.student_number || formValues.student_number,
        firstname: data.firstname || formValues.firstname,
        lastname: data.lastname || formValues.lastname,
        program: data.program || formValues.program,
        year_level: data.year_level || formValues.year_level,
        enrolled_subjects: data.enrolled_subjects || formValues.enrolled_subjects,
        block_section: data.block_section || formValues.block_section,
      });

      if (isEditing && editingId) {
        setStudentData((prev) => prev.map((s) => (s.pk === editingId ? { ...saved, pk: editingId } : s)));
        // Log the student update
        await createAuditLog(
          'Updated Student',
          `Updated student: ${saved.name} (${saved.id})`
        );
      } else {
        setStudentData((prev) => [{ ...saved, pk: data.id || data.pk }, ...prev]);
        // Log the student creation
        await createAuditLog(
          'Created Student',
          `Created new student: ${saved.name} (${saved.id})`
        );
      }

      // reset edit state and close
      setIsEditing(false);
      setEditingId(null);
      closeModal();
    } catch  {
      setErrorMessage('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkImport = async (file) => {
    if (!file) return;

    setIsBulkImporting(true);
    setBulkImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/students/bulk-import/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setBulkImportResult({
          success: false,
          message: data?.detail || 'Bulk import failed',
          errors: data?.errors || []
        });
        return;
      }

      setBulkImportResult({
        success: true,
        message: data.message,
        created_count: data.created_count,
        errors: data.errors || []
      });

      // Refresh the student list
      fetchStudents();

    } catch {
      setBulkImportResult({
        success: false,
        message: 'Unable to reach the server. Please try again.',
        errors: []
      });
    } finally {
      setIsBulkImporting(false);
    }
  };

  const showStudentDetails = async (studentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (!res.ok) {
        setErrorMessage('Unable to load student details.');
        return;
      }
      const data = await res.json();
      // include pk for consistency
      setSelectedStudent({ ...data, pk: data.student_number || data.id || studentId });
    } catch {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const startEditStudent = async (studentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (!res.ok) {
        setErrorMessage('Unable to load student for editing.');
        return;
      }
      const data = await res.json();
      // populate form
      setFormValues((prev) => ({
        ...prev,
        student_number: data.student_number || prev.student_number,
        email: data.email || prev.email,
        firstname: data.firstname || prev.firstname,
        middlename: data.middlename || prev.middlename,
        lastname: data.lastname || prev.lastname,
        department: data.department || prev.department,
        program: data.program || prev.program,
        year_level: data.year_level ? String(data.year_level) : prev.year_level,
        birthdate: data.birthdate || prev.birthdate,
        enrolled_subjects: Array.isArray(data.enrolled_subjects) ? data.enrolled_subjects.map(s => typeof s === 'object' ? s : { code: s, description: '' }) : [],
        block_section: data.block_section || prev.block_section,
      }));
      setIsEditing(true);
      setEditingId(studentId);
      setIsAddOpen(true);
    } catch {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const archiveStudent = async (studentId) => {
    const ok = window.confirm('Archive this student? This will remove them from the active list.');
    if (!ok) return;
    try {
      // PATCH to mark archived=true (soft-delete)
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) {
        setErrorMessage('Unable to archive student.');
        return;
      }
      const studentData = await res.json();
      // Log the archive action
      await createAuditLog(
        'Archived Student',
        `Archived student: ${studentData.firstname || ''} ${studentData.lastname || ''} (${studentData.student_number || studentId})`
      );

      setStudentData((prev) => prev.filter((s) => s.pk !== studentId));
    } catch (e) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">      
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="depthead" activeItem="students" />
        
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#1f2937]">Students Management</h1>
            <p className="text-slate-500 mt-1">View and manage all enrolled students</p>
          </div>

          {/* Stat Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Total Students</h3>
                  <p className="text-3xl font-black mt-2 text-[#1f2937]">{studentData.length}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-full">
                  <Users className="text-[#1f474d]" size={24} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enrolled this semester</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Active Students</h3>
                  <p className="text-3xl font-black mt-2 text-[#1f2937]">{studentData.length}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-full">
                  <TrendingUp className="text-[#1f474d]" size={24} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Currently enrolled</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Avg. Completion</h3>
                  <p className="text-3xl font-black mt-2 text-[#1f2937]">84%</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-full">
                  <Star className="text-[#1f474d]" size={24} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evaluation rate</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">All Students</h2>
                <p className="text-slate-400 text-sm">Complete list of enrolled students</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-bold hover:bg-[#18393e] transition-all"
                  onClick={() => { setIsEditing(false); setEditingId(null); resetForm(); setIsAddOpen(true); }}
                >
                  + Add Student
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                  onClick={() => { setIsArchiveOpen(true); fetchArchivedStudents(); }}
                >
                  <Folder size={16} /> Archived Students
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all"
                  onClick={() => setIsBulkImportOpen(true)}
                >
                  📁 Bulk Import
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <Download size={16} /> Export List
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by name, student ID, or program..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f474d]/20 transition-all bg-white"
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Program</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Subjects</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Block</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Year</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Modules</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Completed</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Pending</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentData.map((student, idx) => (
                    <tr key={student.pk || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{student.id}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{student.program}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{student.subject}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-center font-medium">{student.block}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-center font-bold">{student.year}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 text-center font-bold">{student.modules}</td>
                      <td className="px-3 py-3 text-sm text-emerald-600 text-center font-black">{student.completed}</td>
                      <td className="px-3 py-3 text-sm text-amber-500 text-center font-black">{student.pending}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase rounded-lg tracking-wider">
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => showStudentDetails(student.pk)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all" title="View">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => startEditStudent(student.pk)} className="p-2 text-sky-600 hover:text-sky-800 hover:bg-slate-100 rounded-lg transition-all" title="Edit">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => archiveStudent(student.pk)} className="p-2 text-rose-600 hover:text-rose-800 hover:bg-slate-100 rounded-lg transition-all" title="Archive">
                            <Folder size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(isLoading || loadError || studentData.length === 0) && (
              <div className="p-6 text-sm text-slate-500">
                {isLoading && 'Loading students...'}
                {!isLoading && loadError}
                {!isLoading && !loadError && studentData.length === 0 && 'No students found.'}
              </div>
            )}
          </div>
        </main>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">{isEditing ? 'Edit Student' : 'Add Student'}</h3>
                <p className="text-sm text-slate-400">{isEditing ? 'Update student details.' : 'Default password is generated from name + birthdate.'}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAddStudent}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Student Number</label>
                  <input
                    name="student_number"
                    value={formValues.student_number}
                    onChange={handleInputChange}
                    onBlur={() => validateField('student_number')}
                    placeholder="00-0000-000"
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.student_number ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  />
                  {formErrors.student_number && (
                    <div className="text-rose-600 text-sm mt-1">{formErrors.student_number}</div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formValues.email}
                    onChange={handleInputChange}
                    onBlur={() => validateField('email')}
                    placeholder="student@upang.edu.ph"
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.email ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  />
                  {formErrors.email && <div className="text-rose-600 text-sm mt-1">{formErrors.email}</div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">First Name</label>
                  <input
                    name="firstname"
                    value={formValues.firstname}
                    onChange={handleInputChange}
                    onBlur={() => validateField('firstname')}
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.firstname ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  />
                  {formErrors.firstname && <div className="text-rose-600 text-sm mt-1">{formErrors.firstname}</div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Middle Name</label>
                  <input
                    name="middlename"
                    value={formValues.middlename}
                    onChange={handleInputChange}
                    onBlur={() => validateField('middlename')}
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.middlename ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  />
                  {formErrors.middlename && <div className="text-rose-600 text-sm mt-1">{formErrors.middlename}</div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Last Name</label>
                  <input
                    name="lastname"
                    value={formValues.lastname}
                    onChange={handleInputChange}
                    onBlur={() => validateField('lastname')}
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.lastname ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  />
                  {formErrors.lastname && <div className="text-rose-600 text-sm mt-1">{formErrors.lastname}</div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Birthdate</label>
                  <input
                    name="birthdate"
                    type="date"
                    value={formValues.birthdate}
                    onChange={handleInputChange}
                    onBlur={() => validateField('birthdate')}
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.birthdate ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  />
                  {formErrors.birthdate && <div className="text-rose-600 text-sm mt-1">{formErrors.birthdate}</div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</label>
                  <input
                    name="department"
                    value={formValues.department}
                    onChange={handleInputChange}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Program</label>
                  <input
                    name="program"
                    value={formValues.program}
                    onChange={handleInputChange}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100"
                    disabled
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrolled Subjects</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      name="subject_code_input"
                      value={formValues.subject_code_input}
                      onChange={handleInputChange}
                      placeholder="Subject Code (e.g., COMP101)"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                      name="subject_description_input"
                      value={formValues.subject_description_input}
                      onChange={handleInputChange}
                      placeholder="Subject Description"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <input
                     name="subject_instructor_input"
                     value={formValues.subject_instructor_input}
                     onChange={handleInputChange}
                     placeholder="Instructor Name"
                     className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                   />
                    <button
                      type="button"
                      onClick={addSubject}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(formValues.enrolled_subjects || []).map((s, i) => (
                      <div key={i} className="px-3 py-1 bg-slate-100 rounded-full flex items-center gap-2 text-sm">
                        <span>{s.code} - {s.description}</span>
                        <button type="button" onClick={() => removeSubject(i)} className="text-rose-600 font-bold">×</button>
                      </div>
                    ))}
                  </div>
                  {formErrors.enrolled_subjects && <div className="text-rose-600 text-sm mt-2">{formErrors.enrolled_subjects}</div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Block / Section</label>
                  <input
                    name="block_section"
                    value={formValues.block_section}
                    onChange={handleInputChange}
                    onBlur={() => validateField('block_section')}
                    placeholder="e.g., A1, B2"
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.block_section ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  />
                  {formErrors.block_section && <div className="text-rose-600 text-sm mt-1">{formErrors.block_section}</div>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Year Level</label>
                  <select
                    name="year_level"
                    value={formValues.year_level}
                    onChange={handleInputChange}
                    onBlur={() => validateField('year_level')}
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.year_level ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                  >
                    <option value="">Select</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="text-sm text-rose-600 font-semibold" role="alert">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" className="px-4 py-2 text-sm font-bold text-slate-500" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-bold bg-[#1f474d] text-white rounded-lg hover:bg-[#18393e] disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update Student' : 'Create Student')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archived Students Modal */}
      {isArchiveOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsArchiveOpen(false)}>
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Archived Students</h3>
                <p className="text-sm text-slate-400">Students that were archived</p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setIsArchiveOpen(false)}>&times;</button>
            </div>

            <div className="p-6">
              {isLoadingArchived && <div className="text-sm text-slate-500">Loading archived students...</div>}
              {archiveError && <div className="text-sm text-rose-600">{archiveError}</div>}
              {!isLoadingArchived && !archiveError && archivedStudents.length === 0 && (
                <div className="text-sm text-slate-500">No archived students found.</div>
              )}

              {!isLoadingArchived && archivedStudents.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-sm text-slate-500">Student ID</th>
                        <th className="px-4 py-3 text-sm text-slate-500">Name</th>
                        <th className="px-4 py-3 text-sm text-slate-500">Program</th>
                        <th className="px-4 py-3 text-sm text-slate-500 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {archivedStudents.map((s, i) => (
                        <tr key={s.pk || i} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">{s.id}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-800">{s.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{s.program}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => { setIsArchiveOpen(false); showStudentDetails(s.pk); }} className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-semibold">View</button>
                              <button onClick={() => restoreStudent(s.pk)} className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-sm font-semibold">Restore</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm" onClick={() => setIsArchiveOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

        {selectedStudent && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Student Details</h3>
                  <p className="text-sm text-slate-400">Details for {selectedStudent.firstname} {selectedStudent.lastname}</p>
                </div>
                <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setSelectedStudent(null)}>&times;</button>
              </div>
              <div className="p-6 space-y-3">
                <div><strong>Student Number:</strong> {selectedStudent.student_number}</div>
                <div><strong>Email:</strong> {selectedStudent.email}</div>
                <div><strong>Name:</strong> {selectedStudent.firstname} {selectedStudent.middlename} {selectedStudent.lastname}</div>
                <div><strong>Department:</strong> {selectedStudent.department}</div>
                <div><strong>Program:</strong> {selectedStudent.program}</div>
                <div><strong>Year Level:</strong> {selectedStudent.year_level}</div>
                <div><strong>Birthdate:</strong> {selectedStudent.birthdate}</div>
                <div><strong>Block / Section:</strong> {selectedStudent.block_section}</div>
                <div><strong>Enrolled Subjects:</strong> {Array.isArray(selectedStudent.enrolled_subjects) ? selectedStudent.enrolled_subjects.map(s => typeof s === 'object' ? `${s.code} - ${s.description}` : s).join(', ') : selectedStudent.enrolled_subjects}</div>
                <div className="flex justify-end pt-4">
                  <button className="px-4 py-2 bg-[#1f474d] text-white rounded-lg" onClick={() => { setSelectedStudent(null); }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsBulkImportOpen(false)}>
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Bulk Import Students</h3>
                <p className="text-sm text-slate-400">Upload a CSV file to import multiple students at once.</p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setIsBulkImportOpen(false)}>
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">📁</div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">Upload CSV File</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Select a CSV file containing student data. Required columns: email, firstname, lastname, student_id
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleBulkImport(file);
                    }
                  }}
                  className="hidden"
                  id="csv-upload"
                  disabled={isBulkImporting}
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-bold hover:bg-[#18393e] cursor-pointer disabled:opacity-70"
                >
                  {isBulkImporting ? 'Importing...' : 'Choose CSV File'}
                </label>
              </div>

              {/* CSV Format Guide */}
                <div className="bg-slate-50 rounded-lg p-4">
                <h5 className="font-semibold text-slate-700 mb-2">CSV Format Requirements:</h5>
                <div className="text-sm text-slate-600 space-y-1">
                  <div><strong>Required columns:</strong> email, firstname, lastname, student_id</div>
                  <div><strong>Optional columns:</strong> department, year_level, course, enrolled_subjects, block_section</div>
                  <div><strong>Notes:</strong> For enrolled_subjects, use JSON format like <code>{`[{'code': 'COMP101', 'description': 'Programming Fundamentals'}, ...]`}</code></div>
                  <div><strong>Example:</strong> email,firstname,lastname,student_id,department,year_level,enrolled_subjects,block_section</div>
                  <div><strong>Sample row:</strong> john.doe@upang.edu.ph,John,,Doe,2021-0001,Computer Science,3,{`[{'code': 'COMP101', 'description': 'Programming Fundamentals'}]`},A1</div>
                </div>
              </div>

              {/* Import Results */}
              {bulkImportResult && (
                <div className={`rounded-lg p-4 ${bulkImportResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`text-lg ${bulkImportResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {bulkImportResult.success ? 'OK' : 'FAIL'}
                    </div>
                    <div className="flex-1">
                      <h5 className={`font-semibold ${bulkImportResult.success ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {bulkImportResult.success ? 'Import Successful' : 'Import Failed'}
                      </h5>
                      <p className={`text-sm mt-1 ${bulkImportResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {bulkImportResult.message}
                      </p>
                      {bulkImportResult.created_count !== undefined && (
                        <p className="text-sm text-emerald-700 mt-1">
                          Created: {bulkImportResult.created_count} students
                        </p>
                      )}
                      {bulkImportResult.errors && bulkImportResult.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-rose-800">Errors:</p>
                          <ul className="text-sm text-rose-700 mt-1 space-y-1 max-h-32 overflow-y-auto">
                            {bulkImportResult.errors.map((error, index) => (
                              <li key={index}>- {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-bold text-slate-500"
                  onClick={() => {
                    setIsBulkImportOpen(false);
                    setBulkImportResult(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagement;