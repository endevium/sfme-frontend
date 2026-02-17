import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header'; // Added Header to match Student page
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

const FacultyPages = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const [facultyData, setFacultyData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Bulk Import State
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isArchiveOpenFaculty, setIsArchiveOpenFaculty] = useState(false);
  const [archivedFaculty, setArchivedFaculty] = useState([]);
  const [isLoadingArchivedFaculty, setIsLoadingArchivedFaculty] = useState(false);
  const [archiveFacultyError, setArchiveFacultyError] = useState('');
  const [formValues, setFormValues] = useState({
    email: '',
    firstname: '',
    middlename: '',
    lastname: '',
    department: 'CITE',
    contact_number: '',
    birthdate: '',
  });

  const mapFaculty = (f) => ({
    id: f?.faculty_id || f?.id || f?.email || 'N/A',
    name: `${f?.firstname || f?.name || ''} ${f?.lastname || ''}`.trim() || 'Unnamed',
    title: f?.title || 'Faculty',
    dept: f?.department || f?.dept || 'N/A',
    modules: Number(f?.modules) || 0,
    students: Number(f?.students) || 0,
    evaluations: Number(f?.evaluations) || 0,
    rating: Number(f?.rating) || 0,
    status: typeof f?.status === 'boolean' ? (f.status ? 'Active' : 'Inactive') : (f?.status || 'Active'),
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

  const fetchFaculty = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${API_BASE_URL}/faculty/`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setLoadError(data?.detail || 'Unable to load faculty.');
        return;
      }
      const list = Array.isArray(data) ? data : [];
      setFacultyData(list.map(mapFaculty));
    } catch {
      setLoadError('Unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const showFacultyDetails = async (facultyId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/faculty/${facultyId}/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (!res.ok) {
        setErrorMessage('Unable to load faculty details.');
        return;
      }
      const data = await res.json();
      // include pk for consistency
      setSelectedFaculty({ ...data, pk: data.id || data.pk || facultyId });
    } catch {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const startEditFaculty = async (facultyId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/faculty/${facultyId}/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (!res.ok) {
        setErrorMessage('Unable to load faculty for editing.');
        return;
      }
      const data = await res.json();
      // populate form
      setFormValues((prev) => ({
        ...prev,
        email: data.email || prev.email,
        firstname: data.firstname || prev.firstname,
        middlename: data.middlename || prev.middlename,
        lastname: data.lastname || prev.lastname,
        department: data.department || prev.department,
        contact_number: data.contact_number || prev.contact_number,
        birthdate: data.birthdate || prev.birthdate,
      }));
      setIsEditing(true);
      setEditingId(facultyId);
      setIsAddOpen(true);
    } catch {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const archiveFaculty = async (facultyId) => {
    const ok = window.confirm('Archive this faculty member? This will remove them from the active list.');
    if (!ok) return;
    try {
      // Soft-archive via PATCH
      const res = await fetch(`${API_BASE_URL}/faculty/${facultyId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) {
        setErrorMessage('Unable to archive faculty.');
        return;
      }
      const facultyData = await res.json();
      await createAuditLog(
        'Archived Faculty',
        `Archived faculty member: ${facultyData.firstname || ''} ${facultyData.lastname || ''} (${facultyData.email || facultyId})`
      );
      setFacultyData((prev) => prev.filter((f) => f.id !== facultyId));
    } catch (e) {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const fetchArchivedFaculty = async () => {
    setIsLoadingArchivedFaculty(true);
    setArchiveFacultyError('');
    try {
      const res = await fetch(`${API_BASE_URL}/faculty/archived/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (!res.ok) {
        setArchiveFacultyError('Unable to load archived faculty.');
        setArchivedFaculty([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setArchivedFaculty(list.map(mapFaculty));
    } catch (e) {
      setArchiveFacultyError('Unable to reach the server.');
      setArchivedFaculty([]);
    } finally {
      setIsLoadingArchivedFaculty(false);
    }
  };

  const restoreFaculty = async (facultyId) => {
    const ok = window.confirm('Restore this faculty member? This will make them active again.');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL}/faculty/${facultyId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) {
        setArchiveFacultyError('Unable to restore faculty.');
        return;
      }
      const data = await res.json();
      await createAuditLog('Restored Faculty', `Restored faculty: ${data.firstname || ''} ${data.lastname || ''} (${data.email || facultyId})`);
      fetchFaculty();
      fetchArchivedFaculty();
    } catch (e) {
      setArchiveFacultyError('Unable to reach the server.');
    }
  };

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const resetForm = () => {
    setFormValues({
      email: '',
      firstname: '',
      middlename: '',
      lastname: '',
      department: 'CITE',
      contact_number: '',
      birthdate: '',
    });
    setErrorMessage('');
    setFormErrors({});
  };

  const closeModal = () => {
    setIsAddOpen(false);
    resetForm();
    setIsEditing(false);
    setEditingId(null);
  };

  const validateField = (name) => {
    const value = String(formValues[name] || '').trim();
    let error;
    if (name === 'email') {
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
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const validateForm = () => {
    const errors = {};
    if (!String(formValues.email || '').trim()) errors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(formValues.email)) errors.email = 'Enter a valid email address.';

    if (!String(formValues.firstname || '').trim()) errors.firstname = 'First name is required.';
    if (!String(formValues.middlename || '').trim()) errors.middlename = 'Middle name is required.';
    if (!String(formValues.lastname || '').trim()) errors.lastname = 'Last name is required.';
    if (!String(formValues.birthdate || '').trim()) errors.birthdate = 'Birthdate is required.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    // Validate required fields and show inline errors
    if (!validateForm()) {
      setErrorMessage('Please fix the errors in the form.');
      return;
    }

    try {
      setIsSubmitting(true);
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_BASE_URL}/faculty/${editingId}/` : `${API_BASE_URL}/faculty/`;
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(formValues),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data?.detail || 'Unable to save faculty. Please check details.');
        return;
      }

      if (isEditing) {
        setFacultyData((prev) => prev.map((f) => f.id === editingId ? mapFaculty(data) : f));
        // Log the faculty update
        await createAuditLog(
          'Updated Faculty',
          `Updated faculty member: ${data.firstname} ${data.lastname} (${data.email})`
        );
      } else {
        setFacultyData((prev) => [mapFaculty(data), ...prev]);
        // Log the faculty creation
        await createAuditLog(
          'Created Faculty',
          `Created new faculty member: ${data.firstname} ${data.lastname} (${data.email})`
        );
      }
      closeModal();
      setIsEditing(false);
      setEditingId(null);
    } catch {
      setErrorMessage('Server connection failed.');
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

      const response = await fetch(`${API_BASE_URL}/faculty/bulk-import/`, {
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

      // Refresh the faculty list
      fetchFaculty();

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

  const filteredFaculty = useMemo(() => {
    if (!searchQuery.trim()) return facultyData;
    const q = searchQuery.toLowerCase();
    return facultyData.filter((f) => 
      String(f.id).toLowerCase().includes(q) ||
      String(f.name).toLowerCase().includes(q) ||
      String(f.dept).toLowerCase().includes(q) ||
      String(f.title).toLowerCase().includes(q)
    );
  }, [searchQuery, facultyData]);

  const totalFaculty = facultyData.length;
  const activeFaculty = facultyData.filter((f) => f.status === 'Active').length;
  const avgRating = facultyData.length === 0 
    ? 0 
    : (facultyData.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) / facultyData.length).toFixed(1);

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">

      <div className="flex flex-1 flex-row relative">
        <Sidebar role="depthead" activeItem="faculty" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#1f2937]">Faculty Management</h1>
            <p className="text-slate-500 mt-1">View and manage all teaching staff</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Total Faculty</h3>
                  <p className="text-3xl font-black mt-2 text-[#1f2937]">{totalFaculty}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-full">
                  <Users className="text-[#1b2d3d]" size={24} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teaching staff</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Active Faculty</h3>
                  <p className="text-3xl font-black mt-2 text-[#1f2937]">{activeFaculty}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-full">
                  <TrendingUp className="text-[#1b2d3d]" size={24} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Currently teaching</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-700">Avg. Rating</h3>
                  <p className="text-3xl font-black mt-2 text-[#1f2937]">{avgRating}</p>
                </div>
                <div className="p-3 bg-slate-100 rounded-full">
                  <Star className="text-[#1b2d3d]" size={24} />
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Overall average</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">All Faculty Members</h2>
                <p className="text-slate-400 text-sm">Complete list of teaching staff</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setIsEditing(false); setEditingId(null); resetForm(); setIsAddOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ffcc00] text-[#041c32] rounded-lg text-sm font-bold hover:bg-[#e6b800] transition-all"
                >
                  + Add Faculty
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                  onClick={() => { setIsArchiveOpenFaculty(true); fetchArchivedFaculty(); }}
                >
                  <Folder size={16} /> Archived Faculty
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

            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, faculty ID, or department..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f474d]/20 transition-all bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Faculty ID</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Title</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Department</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Modules</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Students</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Rating</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFaculty.map((faculty, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{faculty.id}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800">{faculty.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{faculty.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{faculty.dept}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-center font-bold">{faculty.modules}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-center font-bold">{faculty.students}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Star className="text-amber-400 fill-amber-400" size={14} />
                          <span className="text-sm font-black text-slate-800">{faculty.rating}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase rounded-lg tracking-wider">
                          {faculty.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => showFacultyDetails(faculty.id)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all" title="View">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => startEditFaculty(faculty.id)} className="p-2 text-sky-600 hover:text-sky-800 hover:bg-slate-100 rounded-lg transition-all" title="Edit">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => archiveFaculty(faculty.id)} className="p-2 text-rose-600 hover:text-rose-800 hover:bg-slate-100 rounded-lg transition-all" title="Archive">
                            <Folder size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Archived Faculty Modal */}
            {isArchiveOpenFaculty && (
              <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsArchiveOpenFaculty(false)}>
                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">Archived Faculty</h3>
                      <p className="text-sm text-slate-400">Faculty members that were archived</p>
                    </div>
                    <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setIsArchiveOpenFaculty(false)}>&times;</button>
                  </div>

                  <div className="p-6">
                    {isLoadingArchivedFaculty && <div className="text-sm text-slate-500">Loading archived faculty...</div>}
                    {archiveFacultyError && <div className="text-sm text-rose-600">{archiveFacultyError}</div>}
                    {!isLoadingArchivedFaculty && !archiveFacultyError && archivedFaculty.length === 0 && (
                      <div className="text-sm text-slate-500">No archived faculty found.</div>
                    )}

                    {!isLoadingArchivedFaculty && archivedFaculty.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-3 text-sm text-slate-500">Faculty ID</th>
                              <th className="px-4 py-3 text-sm text-slate-500">Name</th>
                              <th className="px-4 py-3 text-sm text-slate-500">Department</th>
                              <th className="px-4 py-3 text-sm text-slate-500 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {archivedFaculty.map((f, i) => (
                              <tr key={f.id || i} className="hover:bg-slate-50/80">
                                <td className="px-4 py-3 text-xs font-mono text-slate-500">{f.id}</td>
                                <td className="px-4 py-3 text-sm font-black text-slate-800">{f.name}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{f.dept}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => { setIsArchiveOpenFaculty(false); showFacultyDetails(f.id); }} className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-semibold">View</button>
                                    <button onClick={() => restoreFaculty(f.id)} className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-sm font-semibold">Restore</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex justify-end mt-4">
                      <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm" onClick={() => setIsArchiveOpenFaculty(false)}>Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {(isLoading || loadError || filteredFaculty.length === 0) && (
              <div className="p-6 text-sm text-slate-500">
                {isLoading && 'Loading faculty...'}
                {!isLoading && loadError}
                {!isLoading && !loadError && filteredFaculty.length === 0 && 'No faculty found.'}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* INTEGRATED MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">{isEditing ? 'Edit Faculty Member' : 'Add Faculty Member'}</h3>
                <p className="text-sm text-slate-400">{isEditing ? 'Update faculty details.' : 'Default password is generated from name + birthdate.'}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={handleAddFaculty}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formValues.email}
                    onChange={handleInputChange}
                    onBlur={() => validateField('email')}
                    placeholder="faculty@upang.edu.ph"
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Number</label>
                  <input
                    name="contact_number"
                    value={formValues.contact_number}
                    onChange={handleInputChange}
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</label>
                  <input
                    name="department"
                    value={formValues.department}
                    onChange={handleInputChange}
                    className={`w-full mt-2 px-3 py-2 rounded-lg text-sm border ${formErrors.department ? 'border-rose-500 ring-rose-100 bg-rose-50' : 'border-slate-200 bg-slate-100'}`}
                    disabled
                  />
                  {formErrors.department && <div className="text-rose-600 text-sm mt-1">{formErrors.department}</div>}
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
                  {isSubmitting ? 'Saving...' : (isEditing ? 'Update Faculty' : 'Create Faculty')}
                </button>
              </div>
            </form>
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
                <h3 className="text-lg font-black text-slate-800">Bulk Import Faculty</h3>
                <p className="text-sm text-slate-400">Upload a CSV file to import multiple faculty members at once.</p>
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
                  Select a CSV file containing faculty data. Required columns: email, firstname, lastname, employee_id
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
                  id="faculty-csv-upload"
                  disabled={isBulkImporting}
                />
                <label
                  htmlFor="faculty-csv-upload"
                  className="inline-flex items-center px-4 py-2 bg-[#ffcc00] text-[#041c32] rounded-lg text-sm font-bold hover:bg-[#e6b800] cursor-pointer disabled:opacity-70"
                >
                  {isBulkImporting ? 'Importing...' : 'Choose CSV File'}
                </label>
              </div>

              {/* CSV Format Guide */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h5 className="font-semibold text-slate-700 mb-2">CSV Format Requirements:</h5>
                <div className="text-sm text-slate-600 space-y-1">
                  <div><strong>Required columns:</strong> email, firstname, lastname, employee_id</div>
                  <div><strong>Optional columns:</strong> department, position</div>
                  <div><strong>Example:</strong> email,firstname,lastname,employee_id,department,position</div>
                  <div><strong>Sample row:</strong> jane.smith@upang.edu.ph,Jane,,Smith,FAC001,Computer Science,Assistant Professor</div>
                </div>
              </div>

              {/* Import Results */}
              {bulkImportResult && (
                <div className={`rounded-lg p-4 ${bulkImportResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`text-lg ${bulkImportResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {bulkImportResult.success ? '✅' : '❌'}
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
                          Created: {bulkImportResult.created_count} faculty members
                        </p>
                      )}
                      {bulkImportResult.errors && bulkImportResult.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-rose-800">Errors:</p>
                          <ul className="text-sm text-rose-700 mt-1 space-y-1 max-h-32 overflow-y-auto">
                            {bulkImportResult.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
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

      {selectedFaculty && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedFaculty(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Faculty Details</h3>
                <p className="text-sm text-slate-400">Details for {selectedFaculty.firstname} {selectedFaculty.lastname}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setSelectedFaculty(null)}>&times;</button>
            </div>
            <div className="p-6 space-y-3">
              <div><strong>Email:</strong> {selectedFaculty.email}</div>
              <div><strong>Name:</strong> {selectedFaculty.firstname} {selectedFaculty.middlename} {selectedFaculty.lastname}</div>
              <div><strong>Department:</strong> {selectedFaculty.department}</div>
              <div><strong>Contact Number:</strong> {selectedFaculty.contact_number}</div>
              <div><strong>Birthdate:</strong> {selectedFaculty.birthdate}</div>
              <div className="flex justify-end pt-4">
                <button className="px-4 py-2 bg-[#1f474d] text-white rounded-lg" onClick={() => { setSelectedFaculty(null); }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyPages;