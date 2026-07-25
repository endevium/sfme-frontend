import React, { useEffect, useMemo, useState } from 'react';
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
import { getToken } from '../../utils/auth';

const normalizePersonStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'archived' ? 'Archived' : 'Active';
};

const StudentsManagement = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const MAX_CSV_SIZE = 2 * 1024 * 1024;

  const [studentData, setStudentData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState(null);

  const [showArchivedStudents, setShowArchivedStudents] = useState(false);
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [studentToArchive, setStudentToArchive] = useState(null);

  const [blocks, setBlocks] = useState([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [_blocksError, setBlocksError] = useState('');

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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
    modules: (function countEnrolledSubjects(s) {
      const value = s || student.enrolled_subjects || student.enrolled_subject || student.subject;
      if (!value) return 0;
      if (Array.isArray(value)) return value.length;
      if (typeof value === 'string') return value.split(/;|,/).map(x => x.trim()).filter(Boolean).length;
      return 0;
    })(student.enrolled_subjects),
    completed: 0,
    pending: 0,
    status: normalizePersonStatus(student.status),
  });

  const validateCsvFile = (file) => {
    if (!file) return 'No file selected.';
    if (!String(file.name || '').toLowerCase().endsWith('.csv')) return 'Only .csv files are allowed.';
    if (file.size > MAX_CSV_SIZE) return 'File is too large (max 2MB).';
    const allowedTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
    if (file.type && !allowedTypes.includes(file.type)) return `Invalid file type: ${file.type}. Please upload a CSV.`;
    return null;
  };

  // Helper function to create audit log entries
  const createAuditLog = async (action, message) => {
    try {
      const token = getToken();
      const auditData = { action, message, category: 'USER MANAGEMENT', status: 'Success' };

      await fetch(`${API_BASE_URL}/audit-logs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/students/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setLoadError(data?.detail || 'Unable to load students.');
        return;
      }

      const list = Array.isArray(data) ? data : [];
      const mapped = list.map(mapStudent);
      setStudentData(mapped);
      // compute completion stats after setting base student list
      computeCompletionStats(mapped);
    } catch {
      setLoadError('Unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const computeCompletionStats = async (studentsList) => {
    try {
      const token = getToken();
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      // fetch forms/submissions and all classrooms (dept head can access by department)
      const [mefRes, iefRes, subsRes, classroomsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/module-evaluation-forms/`, { headers }),
        fetch(`${API_BASE_URL}/instructor-evaluation-forms/`, { headers }),
        fetch(`${API_BASE_URL}/feedback/submissions/`, { headers }),
        fetch(`${API_BASE_URL}/classrooms/`, { headers }),
      ]);

      const mefList = mefRes.ok ? await mefRes.json().catch(() => []) : [];
      const iefList = iefRes.ok ? await iefRes.json().catch(() => []) : [];
      const subsList = subsRes.ok ? await subsRes.json().catch(() => []) : [];
      const classroomsPayload = classroomsRes.ok ? await classroomsRes.json().catch(() => []) : [];
      const classroomsList = Array.isArray(classroomsPayload)
        ? classroomsPayload
        : classroomsPayload?.results || [];

      // Count approved classroom memberships per student.
      // This becomes the source of truth for the "Modules" column.
      const classroomStudentResponses = await Promise.all(
        classroomsList.map(async (classroom) => {
          const cid = classroom?.id;
          if (!cid) return null;
          try {
            const res = await fetch(`${API_BASE_URL}/classrooms/${cid}/students/`, { headers });
            if (!res.ok) return null;
            return await res.json().catch(() => null);
          } catch {
            return null;
          }
        })
      );

      const modulesByStudent = new Map();
      for (const classroomData of classroomStudentResponses) {
        if (!classroomData) continue;
        const studentsInClass = Array.isArray(classroomData?.students) ? classroomData.students : [];
        for (const st of studentsInClass) {
          const sid = String(st?.student_id || st?.id || '');
          if (!sid) continue;
          modulesByStudent.set(sid, (modulesByStudent.get(sid) || 0) + 1);
        }
      }

      const mefById = new Map();
      (Array.isArray(mefList) ? mefList : mefList.results || []).forEach(f => mefById.set(String(f.id), f));
      const iefById = new Map();
      (Array.isArray(iefList) ? iefList : iefList.results || []).forEach(f => iefById.set(String(f.id), f));

      // studentId -> classroomId -> { module: bool, instructor: bool }
      const studentMap = new Map();

      const responses = Array.isArray(subsList) ? subsList : subsList.results || [];
      for (const r of responses) {
        const studentId = r?.student || r?.student_id || (r.student && (r.student.id || r.student.pk));
        if (!studentId) continue;

        // resolve form id
        const formId = r.form_object_id ?? r.form_id ?? (r.form && (r.form.id || r.form)) ?? null;
        if (!formId) continue;
        const fid = String(formId);

        let classroomId = null;
        let type = null;
        if (mefById.has(fid)) {
          type = 'module';
          classroomId = mefById.get(fid)?.classroom ?? mefById.get(fid)?.classroom_id ?? null;
        } else if (iefById.has(fid)) {
          type = 'instructor';
          classroomId = iefById.get(fid)?.classroom ?? iefById.get(fid)?.classroom_id ?? null;
        } else if (r.form && typeof r.form === 'object' && (r.form.classroom || r.form.classroom_id)) {
          classroomId = r.form.classroom ?? r.form.classroom_id ?? null;
          // best-effort: if title/instructor present assume instructor form else module
          type = r.form.instructor_name ? 'instructor' : 'module';
        }
        if (!classroomId) continue;

        const sid = String(studentId);
        if (!studentMap.has(sid)) studentMap.set(sid, new Map());
        const clsMap = studentMap.get(sid);
        const cid = String(classroomId);
        if (!clsMap.has(cid)) clsMap.set(cid, { module: false, instructor: false });
        const cur = clsMap.get(cid);
        if (type === 'module') cur.module = true;
        if (type === 'instructor') cur.instructor = true;
        clsMap.set(cid, cur);
      }

      // compute completed/pending per student
      const updated = studentsList.map(s => {
        const sid = String(s.pk || s.id || s.student_number || '');
        const clsMap = studentMap.get(sid) || new Map();
        let completedCount = 0;
        for (const [, val] of clsMap.entries()) {
          // Count a completed module when the module evaluation has been submitted.
          // Previously this required both module && instructor to be true,
          // which left records as pending if only the module form was completed.
          if (val.module) completedCount += 1;
        }
        const totalModules = Number(modulesByStudent.get(sid) || 0);
        const pendingCount = Math.max(0, totalModules - completedCount);
        return {
          ...s,
          modules: totalModules,
          completed: completedCount,
          pending: pendingCount,
        };
      });

      setStudentData(updated);
    } catch (err) {
      console.error('Failed to compute completion stats', err);
    }
  };

  const fetchBlocks = async () => {
    setIsLoadingBlocks(true);
    setBlocksError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/blocks/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setBlocks([]);
        setBlocksError('Unable to load blocks.');
        return;
      }
      const data = await res.json().catch(() => []);
      setBlocks(Array.isArray(data) ? data : data?.results || []);
    } catch {
      setBlocksError('Unable to reach server for blocks.');
      setBlocks([]);
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const fetchArchivedStudents = async () => {
    setIsLoadingArchived(true);
    setArchiveError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/students/archived/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setArchiveError('Unable to load archived students.');
        setArchivedStudents([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const mapped = list.map(mapStudent);
      setArchivedStudents(mapped);
      computeCompletionStats(mapped);
    } catch {
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
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'active' }),
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
    } catch {
      setArchiveError('Unable to reach the server.');
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchBlocks();
    // Intentionally load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeYearForCompare = (val) => {
    if (val == null) return '';
    const s = String(val).trim();
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return String(n);
    const m = s.match(/\d+/);
    return m ? String(parseInt(m[0], 10)) : '';
  };

  const availableBlocks = useMemo(() => {
    const target = normalizeYearForCompare(formValues.year_level);
    if (!target) return [];
    return blocks.filter((b) => normalizeYearForCompare(b.year_level) === target);
  }, [blocks, formValues.year_level]);

  const availableBlockNames = useMemo(() => availableBlocks.map((b) => b.block_name), [availableBlocks]);

  useEffect(() => {
    if (formValues.block_section && !availableBlockNames.includes(formValues.block_section)) {
      setFormValues((prev) => ({ ...prev, block_section: '' }));
    }
    // only react to changes in available blocks
  }, [availableBlockNames, formValues.block_section]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setErrorMessage('');
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

      const token = getToken();
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);
      // Debug: log file and FormData entries to ensure browser includes the file
      try {
        console.info('Bulk import - file:', { name: file.name, size: file.size, type: file.type });
        for (const pair of formData.entries()) {
          console.info('FormData entry:', pair[0], pair[1]);
        }
      } catch (e) {
        console.warn('Bulk import debug log failed', e);
      }

      const response = await fetch(`${API_BASE_URL}/students/bulk-import/`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Better error messaging with additional details
        let errorMsg = data?.detail || 'Bulk import failed';
        const errorDetails = [];
        
        // Add missing/found columns info if available
        if (data?.missing && data.missing.length > 0) {
          errorDetails.push(`Missing: ${data.missing.join(', ')}`);
        }
        if (data?.found && data.found.length > 0) {
          errorDetails.push(`Found: ${data.found.join(', ')}`);
        }
        
        setBulkImportResult({
          success: false,
          message: errorMsg,
          errors: data?.errors || errorDetails
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

  const downloadCSVTemplate = () => {
    const csvContent = 'email,firstname,middlename,lastname,student_id,department,year_level,course,block_section,birthdate,enrolled_subjects\njohn.doe@upang.edu.ph,John,M,Doe,2021-0001,CITE,1,BSIT,A1,2000-05-15,"ITE293|Systems Administration|Josephine Cruz;CS101|Programming Fundamentals|John Smith"\njane.smith@upang.edu.ph,Jane,L,Smith,2021-0002,CITE,2,BSCS,B2,1999-08-22,"MATH201|Calculus|Maria Garcia;PHYS202|Physics|Robert Lee"';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'student_import_template.csv';
    link.click();
  };

  // Export current student table to CSV
  const exportToCSV = (rows, headers, filename = 'student-list.csv') => {
    if (!rows || rows.length === 0) {
      window.alert('No records to export.');
      return;
    }

    const escape = (value) => {
      if (value === null || value === undefined) return '';
      const s = String(value).replace(/\r?\n/g, ' ');
      if (s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
      if (s.includes(',') || s.includes('\n')) return '"' + s + '"';
      return s;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      const row = [
        r.id || '',
        r.name || '',
        r.program || '',
        r.block || '',
        r.year || '',
        r.modules ?? '',
        r.completed ?? '',
        r.pending ?? '',
        r.status || '',
      ].map(escape).join(',');
      lines.push(row);
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportStudents = () => {
    const rows = filteredStudents;
    const headers = ['Student ID','Name','Program','Block','Year','Modules','Completed','Pending','Status'];
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    exportToCSV(rows, headers, `student-list_${stamp}.csv`);
  };

  const showStudentDetails = async (studentId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
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
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
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

  const archiveStudent = async (student) => {
    if (!student?.pk) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/students/${student.pk}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) {
        setErrorMessage('Unable to archive student.');
        return;
      }
      const studentData = await res.json();
      // Log the archive action
      await createAuditLog(
        'Archived Student',
        `Archived student: ${studentData.firstname || ''} ${studentData.lastname || ''} (${studentData.student_number || student.pk})`
      );

      setStudentData((prev) => prev.filter((s) => s.pk !== student.pk));
      setArchivedStudents((prev) => [mapStudent(studentData), ...prev.filter((s) => s.pk !== student.pk)]);
      setStudentToArchive(null);
    } catch {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const source = showArchivedStudents ? archivedStudents : studentData;
    if (!query) return source;
    return source.filter((student) => (
      String(student.id || '').toLowerCase().includes(query) ||
      String(student.name || '').toLowerCase().includes(query) ||
      String(student.program || '').toLowerCase().includes(query) ||
      String(student.block || '').toLowerCase().includes(query)
    ));
  }, [searchQuery, studentData, archivedStudents, showArchivedStudents]);

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">      
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="depthead" activeItem="students" />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
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
                <h2 className="text-xl font-bold text-slate-800">{showArchivedStudents ? 'Archived Students' : 'All Students'}</h2>
                <p className="text-slate-400 text-sm">{showArchivedStudents ? 'Archived student records' : 'Complete list of enrolled students'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#18393e] transition-all"
                  onClick={() => { setIsEditing(false); setEditingId(null); resetForm(); setIsAddOpen(true); }}
                >
                  + Add Student
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                  onClick={() => {
                    const nextValue = !showArchivedStudents;
                    setShowArchivedStudents(nextValue);
                    if (nextValue) fetchArchivedStudents();
                  }}
                >
                  <Folder size={16} /> {showArchivedStudents ? 'Back To Active Students' : 'Archived Students'}
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#18393e] transition-all"
                  onClick={() => setIsBulkImportOpen(true)}
                >
                  📁 Bulk Import
                </button>
                <button onClick={handleExportStudents} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  {filteredStudents.map((student, idx) => (
                    <tr key={student.pk || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{student.id}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800">{student.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{student.program}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-center font-medium">{student.block}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-center font-bold">{student.year}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 text-center font-bold">{student.modules}</td>
                      <td className="px-3 py-3 text-sm text-emerald-600 text-center font-black">{student.completed}</td>
                      <td className="px-3 py-3 text-sm text-amber-500 text-center font-black">{student.pending}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 border text-[10px] font-black uppercase rounded-lg tracking-wider ${student.status === 'Archived' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => showStudentDetails(student.pk)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all" title="View">
                            <Eye size={18} />
                          </button>
                          {showArchivedStudents ? (
                            <button onClick={() => restoreStudent(student.pk)} className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-all" title="Restore">
                              <Folder size={18} />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => startEditStudent(student.pk)} className="p-2 text-sky-600 hover:text-sky-800 hover:bg-slate-100 rounded-lg transition-all" title="Edit">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => setStudentToArchive(student)} className="p-2 text-rose-600 hover:text-rose-800 hover:bg-slate-100 rounded-lg transition-all" title="Archive">
                                <Folder size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {((showArchivedStudents && isLoadingArchived) || (!showArchivedStudents && isLoading)) && (
              <div className="p-6 text-sm text-slate-500">Loading students...</div>
            )}
            {showArchivedStudents && archiveError && (
              <div className="p-6 text-sm text-rose-600">{archiveError}</div>
            )}
            {!showArchivedStudents && loadError && (
              <div className="p-6 text-sm text-slate-500">{loadError}</div>
            )}
            {!isLoading && !isLoadingArchived && !loadError && !archiveError && filteredStudents.length === 0 && (
              <div className="p-6 text-sm text-slate-500">
                {showArchivedStudents ? 'No archived students found.' : 'No students found.'}
              </div>
            )}
          </div>
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
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Block / Section</label>
                  <div>
                    <select
                      name="block_section"
                      value={formValues.block_section}
                      onChange={handleInputChange}
                      onBlur={() => validateField('block_section')}
                      className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.block_section ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-white'}`}
                    >
                      <option value="">Select block/section</option>
                      {availableBlocks.length === 0 ? (
                        <option value="" disabled>{isLoadingBlocks ? 'Loading blocks...' : 'No blocks for selected year'}</option>
                      ) : (
                        availableBlocks.map((b) => (
                          <option key={b.id || b.block_name} value={b.block_name}>{b.block_name}</option>
                        ))
                      )}
                    </select>
                    {formErrors.block_section && <div className="text-rose-600 text-sm mt-1">{formErrors.block_section}</div>}
                  </div>
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

      {studentToArchive && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setStudentToArchive(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Archive Student</h3>
              <p className="text-sm text-slate-400 mt-1">This will move the student to the archived section.</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to archive <span className="font-bold text-slate-900">{studentToArchive.name}</span>?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button type="button" className="px-4 py-2 text-sm font-bold text-slate-500" onClick={() => setStudentToArchive(null)}>
                  Cancel
                </button>
                <button type="button" className="px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700" onClick={() => archiveStudent(studentToArchive)}>
                  Archive
                </button>
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
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
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

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">📁</div>
                <h4 className="text-lg font-semibold text-slate-700 mb-2">Upload CSV File</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Select a CSV file containing student data.<br/>
                  <strong>Required:</strong> email, firstname, lastname, student_id<br/>
                  <strong>Recommended:</strong> birthdate (for password generation), department, year_level
                </p>
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      const err = validateCsvFile(file);
                      if (err) {
                        setBulkImportResult({ success: false, message: err, errors: [] });
                        e.target.value = '';
                        return;
                      }
                      handleBulkImport(file);
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
                  <button
                    onClick={downloadCSVTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700"
                  >
                    <Download size={16} /> Download Template
                  </button>
                </div>
              </div>

              {/* CSV Format Guide */}
                <div className="bg-slate-50 rounded-lg p-4">
                <h5 className="font-semibold text-slate-700 mb-2">CSV Format Requirements:</h5>
                <div className="text-sm text-slate-600 space-y-1">
                  <div><strong>Required columns:</strong> email, firstname, lastname, student_id</div>
                  <div><strong>Optional columns:</strong> department, year_level, course, enrolled_subjects, block_section, middlename, birthdate</div>
                  <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                    <div className="font-mono text-xs">
                      <div className="font-semibold mb-1">Sample CSV:</div>
                      <div className="overflow-x-auto">
                        <div>email,firstname,middlename,lastname,student_id,department,year_level,course,block_section,birthdate,enrolled_subjects</div>
                        <div>john.doe@upang.edu.ph,John,M,Doe,2021-0001,CITE,1,BSIT,A1,2000-05-15,"ITE293|Systems Admin|J. Cruz;CS101|Programming|J. Smith"</div>
                        <div>jane.smith@upang.edu.ph,Jane,L,Smith,2021-0002,CITE,2,BSCS,B2,1999-08-22,"MATH201|Calculus|M. Garcia;PHYS202|Physics|R. Lee"</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <div><strong>Notes:</strong></div>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Birthdate format:</strong> YYYY-MM-DD (e.g., 2000-05-15). Used to auto-generate password.</li>
                      <li><strong>Enrolled subjects format:</strong> Use <strong>CODE|Description|Instructor</strong> for each subject</li>
                      <li>Separate multiple subjects with semicolons <strong>;</strong></li>
                      <li><strong>Example:</strong> "ITE293|Systems Admin|J. Cruz;CS101|Programming|J. Smith"</li>
                      <li><strong>Simple format also works:</strong> Just codes like "CS101;IT102" (description & instructor will be empty)</li>
                      <li><strong>Password generation:</strong> Auto-generated from name + birthdate (first 2 letters of each name + month + year)</li>
                      <li>Put enrolled_subjects in quotes if it contains commas or semicolons</li>
                      <li>Column names are case-sensitive</li>
                    </ul>
                  </div>
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

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagement;