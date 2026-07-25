import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import {
  Plus,
  FileText,
  CheckCircle,
  FileEdit,
  Search,
  Eye,
  Edit3,
  Copy,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { getToken } from '../../utils/auth';

const FacultyFormsPage = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const MODULE_ENDPOINT = 'module-evaluation-forms';

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const isBlank = (value) => String(value ?? '').trim() === '';

  const [formsList, setFormsList] = useState([]);
  const [facultyModules, setFacultyModules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formValues, setFormValues] = useState({
    subject_code: '',
    subject_description: '',
    status: 'Draft',
    classroom_id: '',
  });

  useEffect(() => {
    const fetchForms = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [modulesRes, facultyModulesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/${MODULE_ENDPOINT}/`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/faculty/modules/`, { headers: getAuthHeaders() }),
        ]);

        const modules = await modulesRes.json().catch(() => []);
        const facultyModulesRaw = await facultyModulesRes.json().catch(() => []);

        if (!modulesRes.ok) {
          setLoadError('Unable to load forms.');
          return;
        }

        const mappedModules = Array.isArray(modules) ? modules.map((m) => ({ ...m, form_type: 'Module' })) : [];
        setFormsList(mappedModules);

        const moduleSource = Array.isArray(facultyModulesRaw) ? facultyModulesRaw : facultyModulesRaw?.results || [];
        const codeMap = new Map();
        moduleSource.forEach((item) => {
          const code = String(item?.subject_code || '').trim().toUpperCase();
          if (!code) return;

          const classroomId = item?.classroom_id || '';
          const classroomCode = item?.classroom_code || '';
          const description = String(
            item?.module_name || item?.subject_description || item?.description || ''
          ).trim();

          const existing = codeMap.get(code) || {};
          codeMap.set(code, {
            code,
            description: existing.description || description,
            classroomId: existing.classroomId || classroomId,
            classroomCode: existing.classroomCode || classroomCode,
          });
        });
        setFacultyModules(Array.from(codeMap.values()));
      } catch {
        setLoadError('Unable to reach the server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchForms();
  }, [API_BASE_URL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'subject_code') {
      const normalizedCode = String(value || '').trim().toUpperCase();
      const selected = facultyModules.find((m) => m.code === normalizedCode);
      setFormValues((prev) => ({
        ...prev,
        classroom_id: String(selected?.classroomId ?? ''),
        subject_code: normalizedCode,
        subject_description: selected?.description || '',
      }));
      return;
    }

    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const subjectCodeOptions = useMemo(() => {
    const options = [...facultyModules];
    const currentCode = String(formValues.subject_code || '').trim().toUpperCase();

    if (currentCode && !options.some((item) => item.code === currentCode)) {
      options.unshift({
        code: currentCode,
        description: formValues.subject_description || 'Subject from existing form',
        classroomId: formValues.classroom_id || '',
      });
    }

    return options;
  }, [facultyModules, formValues.subject_code, formValues.subject_description, formValues.classroom_id]);

  const resetForm = () => {
    setFormValues({
      classroom_id: '',
      subject_code: '',
      subject_description: '',
      status: 'Draft',
    });
    setErrorMessage('');
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setIsEditOpen(false);
    setIsPreviewOpen(false);
    setIsDeleteConfirmOpen(false);
    setSelectedForm(null);
    resetForm();
  };

  const handleAddForm = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const required = ['subject_code', 'classroom_id'];
    const missing = required.find((key) => isBlank(formValues[key]));
    if (missing) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const dataToSend = {
      classroom: Number(formValues.classroom_id),
      description: formValues.subject_description,
      status: formValues.status,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/${MODULE_ENDPOINT}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data?.detail || 'Unable to create form. Please check details.');
        return;
      }

      const created = { ...data, form_type: 'Module' };
      setFormsList((prev) => [created, ...prev]);
      closeModal();
    } catch {
      setErrorMessage('Server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditForm = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const required = ['subject_code', 'classroom_id'];
    const missing = required.find((key) => isBlank(formValues[key]));
    if (missing) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    const dataToSend = {
      classroom: Number(formValues.classroom_id),
      description: formValues.subject_description,
      status: formValues.status,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/${MODULE_ENDPOINT}/${selectedForm.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data?.detail || 'Unable to update form. Please check details.');
        return;
      }

      const updated = { ...data, form_type: 'Module' };
      setFormsList((prev) => prev.map((f) => (f.id === selectedForm.id ? updated : f)));
      closeModal();
    } catch {
      setErrorMessage('Server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = (form) => {
    setSelectedForm(form);
    setIsPreviewOpen(true);
  };

  const handleEdit = (form) => {
    setSelectedForm(form);
    const code = String(form?.subject_code || form?.title || '').trim().toUpperCase();
    const selected = facultyModules.find((m) => m.code === code);
    setFormValues({
      classroom_id: String(selected?.classroomId || form?.classroom || ''),
      subject_code: code,
      subject_description: String(form?.module_name || form?.subject_description || form?.description || selected?.description || ''),
      status: form.status,
    });
    setIsEditOpen(true);
  };

  const handleDuplicate = (form) => {
    const code = String(form?.subject_code || form?.title || '').trim().toUpperCase();
    const matched = facultyModules.find((item) => item.code === code);
    setFormValues({
      classroom_id: String(matched?.classroomId || form?.classroom || ''),
      subject_code: code,
      subject_description: matched?.description || form?.module_name || form?.subject_description || form?.description || '',
      status: 'Draft',
    });
    setIsAddOpen(true);
  };

  const handleDelete = (form) => {
    setErrorMessage('');
    setSelectedForm(form);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    const formId = Number(selectedForm?.id ?? selectedForm?.form_id ?? selectedForm?.module_form_id ?? 0);
    if (!formId) {
      setErrorMessage('Unable to delete form: missing form ID.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/${MODULE_ENDPOINT}/${formId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(data?.detail || data?.message || data?.error || 'Unable to delete form.');
        return;
      }

      setFormsList((prev) => prev.filter((f) => Number(f?.id ?? f?.form_id ?? f?.module_form_id ?? 0) !== formId));
      closeModal();
    } catch {
      setErrorMessage('Server connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormCode = (form) => String(form?.subject_code || form?.title || 'N/A').trim().toUpperCase();
  const getFormDescription = (form) => String(form?.module_name || form?.subject_description || form?.description || '').trim();
  const totalForms = formsList.length;
  const activeForms = formsList.filter((f) => f.status === 'Active').length;
  const draftForms = formsList.filter((f) => f.status === 'Draft').length;

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="faculty" activeItem="forms" />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#0f2f57] tracking-tight">Evaluation Forms</h1>
                <p className="text-slate-600 mt-2 text-lg">Create and manage evaluation forms for students</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#2a5d65] transition-colors"
              >
                <Plus size={14} strokeWidth={2.8} />
                Create Form
              </button>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { label: 'Total Forms', value: totalForms, icon: <FileText className="text-[#1f474d]" size={24} />, sub: 'All evaluation forms' },
              { label: 'Active Forms', value: activeForms, icon: <CheckCircle className="text-[#1f474d]" size={24} />, sub: 'Currently in use' },
              { label: 'Draft Forms', value: draftForms, icon: <FileEdit className="text-[#1f474d]" size={24} />, sub: 'Not yet published' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-tight">{stat.label}</h3>
                    <p className="text-3xl font-black mt-1 text-[#1f2937]">{stat.value}</p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-full">
                    {stat.icon}
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">All Forms</h2>
                <p className="text-slate-400 text-sm">Manage your evaluation forms</p>
              </div>
              <div className="relative w-full md:w-72 bg-white border border-slate-200 rounded-2xl p-3">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search forms..."
                  className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {formsList.map((form, idx) => (
                <div key={idx} className="group p-5 border border-slate-200 rounded-xl hover:border-slate-300 transition-all duration-200 hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-black text-slate-800">{getFormCode(form)}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${form.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {form.status}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-slate-100 text-slate-600">Module</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{getFormDescription(form) || 'No description provided.'}</p>
                    <div className="flex flex-wrap gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                      <span className="flex items-center gap-1.5"><FileEdit size={14} className="text-purple-400" /> Created {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(form)}
                      className="h-10 inline-flex items-center gap-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      onClick={() => handleEdit(form)}
                      className="h-10 inline-flex items-center gap-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(form)}
                      className="h-10 w-10 inline-flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#1f474d] hover:border-slate-300 transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(form)}
                      className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {(isLoading || loadError || formsList.length === 0) && (
              <div className="p-6 text-sm text-slate-500">
                {isLoading && 'Loading forms...'}
                {!isLoading && loadError}
                {!isLoading && !loadError && formsList.length === 0 && 'No forms found.'}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-slate-600 font-medium">
              <li className="flex items-center gap-2 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span className="font-black text-blue-600 not-italic">Active forms</span> are available for students to use in evaluations
              </li>
              <li className="flex items-center gap-2 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span className="font-black text-orange-600 not-italic">Draft forms</span> are not visible to students until published
              </li>
              <li className="flex items-center gap-2 italic">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Duplicate existing forms to create variations quickly
              </li>
            </ul>
          </div>
          </div>
        </main>
      </div>

      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">{isEditOpen ? 'Edit Evaluation Form' : 'Create Evaluation Form'}</h3>
                <p className="text-sm text-slate-400">{isEditOpen ? 'Update form details' : 'Add a new form for student evaluations'}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={isEditOpen ? handleEditForm : handleAddForm}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject Code</label>
                <select
                  name="subject_code"
                  value={formValues.subject_code}
                  onChange={handleInputChange}
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select subject code</option>
                  {subjectCodeOptions.map((module) => (
                    <option key={module.code} value={module.code}>
                      {module.code}
                    </option>
                  ))}
                </select>
                {subjectCodeOptions.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">No handled modules found for your account.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject Description</label>
                <input
                  name="subject_description"
                  value={formValues.subject_description}
                  readOnly
                  placeholder="Auto-filled from selected subject code"
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
                <select
                  name="status"
                  value={formValues.status}
                  onChange={handleInputChange}
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                </select>
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
                  className="h-11 inline-flex items-center justify-center px-4 text-sm font-semibold bg-[#1f474d] text-white rounded-xl hover:bg-[#2a5d65] disabled:opacity-70 transition-colors"
                >
                  {isSubmitting ? (isEditOpen ? 'Updating...' : 'Creating...') : (isEditOpen ? 'Update Form' : 'Create Form')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreviewOpen && selectedForm && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Preview: {getFormCode(selectedForm)}</h3>
                <p className="text-sm text-slate-400">Form details and configuration</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject Code</label>
                  <p className="mt-2 text-sm text-slate-800">{getFormCode(selectedForm)}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Form Type</label>
                  <p className="mt-2 text-sm text-slate-800">Module</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
                  <span className={`mt-2 inline-block px-2 py-1 text-xs font-bold uppercase rounded ${selectedForm.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedForm.status}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Created</label>
                  <p className="mt-2 text-sm text-slate-800">{selectedForm.created_at ? new Date(selectedForm.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Subject Description</label>
                  <p className="mt-2 text-sm text-slate-800">{getFormDescription(selectedForm) || 'No description provided'}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { closeModal(); handleEdit(selectedForm); }}
                  className="px-4 py-2 text-sm font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Edit Form
                </button>
                <button className="px-4 py-2 text-sm font-bold text-slate-500" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && selectedForm && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Delete Form</h3>
              <p className="text-sm text-slate-400 mt-1">This action cannot be undone</p>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete <strong>"{getFormCode(selectedForm)}"</strong>? This will permanently remove the form and cannot be undone.
              </p>

              {errorMessage && (
                <div className="text-sm text-rose-600 font-semibold mb-4" role="alert">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-bold text-slate-500"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Form'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyFormsPage;
