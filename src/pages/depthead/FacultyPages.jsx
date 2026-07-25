import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const getQuestionScale = (questionIdRaw) => {
  const questionId = String(questionIdRaw || '').trim().toLowerCase();

  // Current student questionnaire:
  // - learn_* uses 1..4 scale
  // - overall_* uses 1..10 scale
  if (questionId.startsWith('learn_')) return { min: 1, max: 4 };
  if (questionId === 'overall_instructor' || questionId === 'overall_modules') return { min: 1, max: 10 };

  // Legacy 5-point forms.
  if (
    questionId.startsWith('inst_') ||
    questionId.startsWith('content_') ||
    questionId.startsWith('assess_') ||
    questionId.startsWith('env_') ||
    questionId.startsWith('comp_') ||
    questionId.startsWith('method_') ||
    questionId.startsWith('engage_') ||
    questionId.startsWith('feedback_') ||
    questionId.startsWith('prof_') ||
    questionId === 'overall_rating' ||
    questionId === 'overall_recommend'
  ) {
    return { min: 1, max: 5 };
  }

  return null;
};

const toNormalizedFivePointRating = (rawRating, questionIdRaw) => {
  const rating = Number(rawRating);
  if (!Number.isFinite(rating)) return null;

  const scale = getQuestionScale(questionIdRaw);
  if (!scale) return null;
  if (rating < scale.min || rating > scale.max) return null;

  if (scale.min === 1 && scale.max === 5) return rating;
  return 1 + ((rating - scale.min) * 4) / (scale.max - scale.min);
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

const resolveModuleFormIdFromResponse = (responseItem) => {
  const modelName = String(responseItem?.form_model || '').toLowerCase();
  if (modelName && modelName !== 'moduleevaluationform') return null;

  const primary = responseItem?.form_object_id;
  if (primary !== null && primary !== undefined) return String(primary);

  const secondary = responseItem?.form_id;
  if (secondary !== null && secondary !== undefined) return String(secondary);

  const legacy = responseItem?.form;
  if (legacy !== null && legacy !== undefined) {
    if (typeof legacy === 'object') {
      const legacyId = legacy.id ?? legacy.pk;
      if (legacyId !== null && legacyId !== undefined) return String(legacyId);
    } else {
      return String(legacy);
    }
  }

  return null;
};

const FacultyPages = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const MAX_CSV_SIZE = 2 * 1024 * 1024; // 2MB

  const [facultyData, setFacultyData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [facultyInsightsById, setFacultyInsightsById] = useState({});

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showArchivedFaculty, setShowArchivedFaculty] = useState(false);
  const [archivedFaculty, setArchivedFaculty] = useState([]);
  const [isLoadingArchivedFaculty, setIsLoadingArchivedFaculty] = useState(false);
  const [archiveFacultyError, setArchiveFacultyError] = useState('');
  const [facultyToArchive, setFacultyToArchive] = useState(null);
  const [formValues, setFormValues] = useState({
    email: '',
    firstname: '',
    middlename: '',
    lastname: '',
    department: 'CITE',
    contact_number: '',
    birthdate: '',
  });

  const mapFaculty = (f, metrics = {}) => ({
    id: f?.faculty_id || f?.id || f?.email || 'N/A',
    name: `${f?.firstname || f?.name || ''} ${f?.lastname || ''}`.trim() || 'Unnamed',
    title: f?.title || 'Faculty',
    dept: f?.department || f?.dept || 'N/A',
    modules: Number(metrics?.modules ?? f?.modules) || 0,
    students: Number(metrics?.students ?? f?.students) || 0,
    evaluations: Number(metrics?.evaluations ?? f?.evaluations) || 0,
    rating: Number(metrics?.rating ?? f?.rating) || 0,
    status: normalizePersonStatus(f?.status),
  });

  const validateCsvFile = (file) => {
    if (!file) return 'No file selected.';
    if (!String(file.name || '').toLowerCase().endsWith('.csv')) return 'Only .csv files are allowed.';
    if (file.size > MAX_CSV_SIZE) return 'File is too large (max 2MB).';
    // best-effort mime check (browsers vary)
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

  const fetchFaculty = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const token = getToken();
      const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const [facultyRes, classroomsRes, formsRes, submissionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/faculty/`, { headers }),
        fetch(`${API_BASE_URL}/classrooms/`, { headers }),
        fetch(`${API_BASE_URL}/module-evaluation-forms/`, { headers }),
        fetch(`${API_BASE_URL}/feedback/submissions/`, { headers }),
      ]);

      const facultyPayload = await facultyRes.json().catch(() => []);
      if (!facultyRes.ok) {
        setLoadError(facultyPayload?.detail || 'Unable to load faculty.');
        return;
      }

      const facultyList = extractList(facultyPayload);

      const classroomsPayload = await classroomsRes.json().catch(() => []);
      const classrooms = classroomsRes.ok ? extractList(classroomsPayload) : [];

      const formsPayload = await formsRes.json().catch(() => []);
      const moduleForms = formsRes.ok ? extractList(formsPayload) : [];

      const submissionsPayload = await submissionsRes.json().catch(() => []);
      const submissions = submissionsRes.ok ? extractList(submissionsPayload) : [];

      const classroomsById = new Map();
      const facultyClassroomMap = new Map();
      for (const classroom of classrooms) {
        const classroomId = String(classroom?.id || '');
        const facultyId = String(classroom?.faculty || '');
        if (!classroomId || !facultyId) continue;

        classroomsById.set(classroomId, classroom);
        if (!facultyClassroomMap.has(facultyId)) {
          facultyClassroomMap.set(facultyId, { subjectCodes: new Set(), classroomIds: new Set() });
        }

        const bucket = facultyClassroomMap.get(facultyId);
        bucket.classroomIds.add(classroomId);

        const subjectCode = String(classroom?.subject_code || '').trim();
        if (subjectCode) bucket.subjectCodes.add(subjectCode);
      }

      const formToFacultyId = new Map();
      for (const form of moduleForms) {
        const formId = String(form?.id || '');
        const classroomId = String(form?.classroom || '');
        if (!formId || !classroomId) continue;

        const classroom = classroomsById.get(classroomId);
        if (!classroom) continue;

        const facultyId = String(classroom?.faculty || '');
        if (!facultyId) continue;
        formToFacultyId.set(formId, facultyId);
      }

      const facultySubmissionStats = new Map();
      for (const submission of submissions) {
        const formId = resolveModuleFormIdFromResponse(submission);
        if (!formId) continue;

        const facultyId = formToFacultyId.get(formId);
        if (!facultyId) continue;

        if (!facultySubmissionStats.has(facultyId)) {
          facultySubmissionStats.set(facultyId, {
            evaluations: 0,
            ratingSum: 0,
            ratingCount: 0,
            studentIds: new Set(),
          });
        }

        const statsBucket = facultySubmissionStats.get(facultyId);
        statsBucket.evaluations += 1;

        const studentId = submission?.student;
        if (studentId !== null && studentId !== undefined && String(studentId).trim()) {
          statsBucket.studentIds.add(String(studentId));
        }

        const respList = Array.isArray(submission?.responses) ? submission.responses : [];
        for (const item of respList) {
          const questionId = item?.question || item?.question_code || item?.question_id;
          const rv = toNormalizedFivePointRating(item?.rating, questionId);
          if (rv === null) continue;
          statsBucket.ratingSum += rv;
          statsBucket.ratingCount += 1;
        }
      }

      const nextInsightsById = {};
      const mapped = facultyList.map((faculty) => {
        const facultyId = String(faculty?.id || faculty?.faculty_id || '');
        const classStats = facultyClassroomMap.get(facultyId);
        const subStats = facultySubmissionStats.get(facultyId);

        const ratingBreakdown = { very_good: 0, good: 0, fair: 0, poor: 0 };

        if (subStats) {
          for (const submission of submissions) {
            const formId = resolveModuleFormIdFromResponse(submission);
            if (!formId) continue;
            const submissionFacultyId = formToFacultyId.get(formId);
            if (submissionFacultyId !== facultyId) continue;

            const respList = Array.isArray(submission?.responses) ? submission.responses : [];
            for (const item of respList) {
              const questionId = item?.question || item?.question_code || item?.question_id;
              const rv = toNormalizedFivePointRating(item?.rating, questionId);
              if (rv === null) continue;

              if (rv >= 4.5) ratingBreakdown.very_good += 1;
              else if (rv >= 3.5) ratingBreakdown.good += 1;
              else if (rv >= 2.5) ratingBreakdown.fair += 1;
              else ratingBreakdown.poor += 1;
            }
          }
        }

        const ratingTotal = ratingBreakdown.very_good + ratingBreakdown.good + ratingBreakdown.fair + ratingBreakdown.poor;
        const distribution = [
          { key: 'very_good', label: 'Very Good (>=4.5)', color: 'bg-emerald-500' },
          { key: 'good', label: 'Good (3.5-4.49)', color: 'bg-blue-500' },
          { key: 'fair', label: 'Fair (2.5-3.49)', color: 'bg-amber-500' },
          { key: 'poor', label: 'Poor (<2.5)', color: 'bg-red-500' },
        ].map((item) => ({
          ...item,
          count: ratingBreakdown[item.key],
          percent: ratingTotal > 0 ? Math.round((ratingBreakdown[item.key] / ratingTotal) * 100) : 0,
        }));

        const averageRating = subStats && subStats.ratingCount > 0
          ? Number((subStats.ratingSum / subStats.ratingCount).toFixed(1))
          : 0;

        const metrics = {
          modules: classStats ? classStats.subjectCodes.size : 0,
          students: subStats ? subStats.studentIds.size : 0,
          evaluations: subStats ? subStats.evaluations : 0,
          rating: averageRating,
        };

        if (facultyId) {
          nextInsightsById[facultyId] = {
            ...metrics,
            ratingBreakdown,
            ratingDistribution: distribution,
          };
        }

        return mapFaculty(faculty, metrics);
      });

      setFacultyData(mapped);
      setFacultyInsightsById(nextInsightsById);
    } catch {
      setLoadError('Unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const showFacultyDetails = async (facultyId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/faculty/${facultyId}/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setErrorMessage('Unable to load faculty details.');
        return;
      }
      const data = await res.json();
      const idKey = String(data.id || data.pk || facultyId);
      const localRow = facultyData.find((f) => String(f.id) === String(facultyId));
      const insight = facultyInsightsById[idKey] || {};
      // include pk for consistency
      setSelectedFaculty({
        ...data,
        pk: data.id || data.pk || facultyId,
        metrics: {
          modules: insight.modules ?? localRow?.modules ?? 0,
          students: insight.students ?? localRow?.students ?? 0,
          evaluations: insight.evaluations ?? localRow?.evaluations ?? 0,
          rating: insight.rating ?? localRow?.rating ?? 0,
          ratingDistribution: insight.ratingDistribution || [
            { key: 'very_good', label: 'Very Good (>=4.5)', color: 'bg-emerald-500', count: 0, percent: 0 },
            { key: 'good', label: 'Good (3.5-4.49)', color: 'bg-blue-500', count: 0, percent: 0 },
            { key: 'fair', label: 'Fair (2.5-3.49)', color: 'bg-amber-500', count: 0, percent: 0 },
            { key: 'poor', label: 'Poor (<2.5)', color: 'bg-red-500', count: 0, percent: 0 },
          ],
        },
      });
    } catch {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const startEditFaculty = async (facultyId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/faculty/${facultyId}/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
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

  const archiveFaculty = async (faculty) => {
    if (!faculty?.id) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/faculty/${faculty.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) {
        setErrorMessage('Unable to archive faculty.');
        return;
      }
      const facultyData = await res.json();
      await createAuditLog(
        'Archived Faculty',
        `Archived faculty member: ${facultyData.firstname || ''} ${facultyData.lastname || ''} (${facultyData.email || faculty.id})`
      );
      setFacultyData((prev) => prev.filter((f) => f.id !== faculty.id));
      setArchivedFaculty((prev) => [mapFaculty(facultyData), ...prev.filter((f) => f.id !== faculty.id)]);
      setFacultyToArchive(null);
    } catch {
      setErrorMessage('Unable to reach the server.');
    }
  };

  const fetchArchivedFaculty = async () => {
    setIsLoadingArchivedFaculty(true);
    setArchiveFacultyError('');
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/faculty/archived/`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        setArchiveFacultyError('Unable to load archived faculty.');
        setArchivedFaculty([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setArchivedFaculty(list.map(mapFaculty));
    } catch {
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
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/faculty/${facultyId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) {
        setArchiveFacultyError('Unable to restore faculty.');
        return;
      }
      const data = await res.json();
      await createAuditLog('Restored Faculty', `Restored faculty: ${data.firstname || ''} ${data.lastname || ''} (${data.email || facultyId})`);
      setFacultyData((prev) => [mapFaculty(data), ...prev.filter((f) => f.id !== facultyId)]);
      setArchivedFaculty((prev) => prev.filter((f) => f.id !== facultyId));
    } catch {
      setArchiveFacultyError('Unable to reach the server.');
    }
  };

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Restrict contact_number to digits only
    let newValue = value;
    if (name === 'contact_number') {
      newValue = String(value || '').replace(/\D+/g, '');
    }
    setFormValues((prev) => ({ ...prev, [name]: newValue }));
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
      const token = getToken()
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_BASE_URL}/faculty/${editingId}/` : `${API_BASE_URL}/faculty/`;
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

  const downloadCSVTemplate = () => {
    const csvContent = 'email,firstname,middlename,lastname,department,contact_number,birthdate\njohn.doe@upang.edu.ph,John,M,Doe,CITE,639123456789,1985-05-15\njane.smith@upang.edu.ph,Jane,L,Smith,CITE,639987654321,1990-08-22';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'faculty_import_template.csv';
    link.click();
  };

  // Export current faculty table to CSV
  const exportToCSV = (rows, headers, filename = 'faculty-list.csv') => {
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
        r.title || '',
        r.dept || '',
        r.modules ?? '',
        r.students ?? '',
        r.evaluations ?? '',
        r.rating ?? '',
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

  const handleExportFaculty = () => {
    const rows = tableFaculty;
    const headers = ['Faculty ID','Name','Title','Department','Modules','Students','Evaluations','Rating','Status'];
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    exportToCSV(rows, headers, `faculty-list_${stamp}.csv`);
  };

  const handleBulkImport = async (file) => {
    if (!file) return;

    setIsBulkImporting(true);
    setBulkImportResult(null);

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/faculty/bulk-import/`, {
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

  const filteredActiveFaculty = useMemo(() => {
    if (!searchQuery.trim()) return facultyData;
    const q = searchQuery.toLowerCase();
    return facultyData.filter((f) => 
      String(f.id).toLowerCase().includes(q) ||
      String(f.name).toLowerCase().includes(q) ||
      String(f.dept).toLowerCase().includes(q) ||
      String(f.title).toLowerCase().includes(q)
    );
  }, [searchQuery, facultyData]);

  const filteredArchivedFaculty = useMemo(() => {
    if (!searchQuery.trim()) return archivedFaculty;
    const q = searchQuery.toLowerCase();
    return archivedFaculty.filter((f) => 
      String(f.id).toLowerCase().includes(q) ||
      String(f.name).toLowerCase().includes(q) ||
      String(f.dept).toLowerCase().includes(q) ||
      String(f.title).toLowerCase().includes(q)
    );
  }, [searchQuery, archivedFaculty]);

  const tableFaculty = showArchivedFaculty ? filteredArchivedFaculty : filteredActiveFaculty;

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
          <div className="max-w-7xl mx-auto w-full">
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
                <h2 className="text-xl font-bold text-slate-800">{showArchivedFaculty ? 'Archived Faculty Members' : 'All Faculty Members'}</h2>
                <p className="text-slate-400 text-sm">{showArchivedFaculty ? 'Archived teaching staff list' : 'Complete list of teaching staff'}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setIsEditing(false); setEditingId(null); resetForm(); setIsAddOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#18393e] transition-all"
                >
                  + Add Faculty
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
                  onClick={() => {
                    const nextValue = !showArchivedFaculty;
                    setShowArchivedFaculty(nextValue);
                    if (nextValue) fetchArchivedFaculty();
                  }}
                >
                  <Folder size={16} /> {showArchivedFaculty ? 'Back To Active Faculty' : 'Archived Faculty'}
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#18393e] transition-all"
                  onClick={() => setIsBulkImportOpen(true)}
                >
                  📁 Bulk Import
                </button>
                <button onClick={handleExportFaculty} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
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
                  {tableFaculty.map((faculty, idx) => (
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
                        <span className={`px-3 py-1 border text-[10px] font-black uppercase rounded-lg tracking-wider ${faculty.status === 'Archived' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {faculty.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => showFacultyDetails(faculty.id)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all" title="View">
                            <Eye size={18} />
                          </button>
                          {showArchivedFaculty ? (
                            <button onClick={() => restoreFaculty(faculty.id)} className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-all" title="Restore">
                              <Folder size={18} />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => startEditFaculty(faculty.id)} className="p-2 text-sky-600 hover:text-sky-800 hover:bg-slate-100 rounded-lg transition-all" title="Edit">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => setFacultyToArchive(faculty)} className="p-2 text-rose-600 hover:text-rose-800 hover:bg-slate-100 rounded-lg transition-all" title="Archive">
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
            {((showArchivedFaculty && isLoadingArchivedFaculty) || (!showArchivedFaculty && isLoading)) && (
              <div className="p-6 text-sm text-slate-500">Loading faculty...</div>
            )}
            {showArchivedFaculty && archiveFacultyError && (
              <div className="p-6 text-sm text-rose-600">{archiveFacultyError}</div>
            )}
            {!showArchivedFaculty && loadError && (
              <div className="p-6 text-sm text-slate-500">{loadError}</div>
            )}
            {!isLoading && !isLoadingArchivedFaculty && !loadError && !archiveFacultyError && tableFaculty.length === 0 && (
              <div className="p-6 text-sm text-slate-500">
                {showArchivedFaculty ? 'No archived faculty found.' : 'No faculty found.'}
              </div>
            )}
          </div>
          </div>
        </main>
      </div>

      {facultyToArchive && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFacultyToArchive(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Archive Faculty Member</h3>
              <p className="text-sm text-slate-400 mt-1">This will move the faculty member to the archived section.</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to archive <span className="font-bold text-slate-900">{facultyToArchive.name}</span>?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button type="button" className="px-4 py-2 text-sm font-bold text-slate-500" onClick={() => setFacultyToArchive(null)}>
                  Cancel
                </button>
                <button type="button" className="px-4 py-2 text-sm font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700" onClick={() => archiveFaculty(facultyToArchive)}>
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    placeholder="63XXXXXXXXXX"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="11"
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
                  Select a CSV file containing faculty data. Required columns: email, firstname, lastname
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
                    id="faculty-csv-upload"
                    disabled={isBulkImporting}
                  />
                  <label
                    htmlFor="faculty-csv-upload"
                    className="inline-flex items-center px-4 py-2 bg-[#ffcc00] text-[#041c32] rounded-lg text-sm font-bold hover:bg-[#e6b800] cursor-pointer disabled:opacity-70"
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
                  <div><strong>Required columns:</strong> email, firstname, lastname</div>
                  <div><strong>Optional columns:</strong> department, middlename, contact_number, birthdate</div>
                  <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                    <div className="font-mono text-xs">
                      <div className="font-semibold mb-1">Sample CSV:</div>
                      <div>email,firstname,middlename,lastname,department,contact_number,birthdate</div>
                      <div>john.doe@upang.edu.ph,John,M,Doe,CITE,639123456789,1985-05-15</div>
                      <div>jane.smith@upang.edu.ph,Jane,L,Smith,CITE,639987654321,1990-08-22</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500"><strong>Note:</strong> Birthdate format must be YYYY-MM-DD. Email must be unique for each faculty member.</div>
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

             
            </div>
          </div>
        </div>
      )}

      {selectedFaculty && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedFaculty(null)}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Faculty Details</h3>
                <p className="text-sm text-slate-400">Complete information and evaluation metrics</p>
              </div>
              <button className="text-slate-400 hover:text-slate-700 text-2xl" onClick={() => setSelectedFaculty(null)}>&times;</button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Faculty ID</p>
                  <p className="text-xl font-bold text-slate-900">{selectedFaculty.faculty_id || selectedFaculty.id || selectedFaculty.pk || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Name</p>
                  <p className="text-xl font-bold text-slate-900">{[selectedFaculty.title, selectedFaculty.firstname, selectedFaculty.lastname].filter(Boolean).join(' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Title</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedFaculty.title || 'Professor'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Department</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedFaculty.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Specialization</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedFaculty.specialization || selectedFaculty.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                  <p className="text-lg font-semibold text-slate-900 break-all">{selectedFaculty.email || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">Teaching Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 px-4 py-4 text-center">
                    <p className="text-3xl font-black text-slate-900">{selectedFaculty.metrics?.modules ?? 0}</p>
                    <p className="text-slate-500 text-sm mt-1">Modules</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-4 text-center">
                    <p className="text-3xl font-black text-blue-600">{selectedFaculty.metrics?.students ?? 0}</p>
                    <p className="text-slate-500 text-sm mt-1">Students</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-4 text-center">
                    <p className="text-3xl font-black text-emerald-600">{selectedFaculty.metrics?.evaluations ?? 0}</p>
                    <p className="text-slate-500 text-sm mt-1">Evaluations</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">Overall Rating</h4>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Calculated from all rated items (normalized to 5-point)</p>
                  <div className="text-right">
                    <p className="text-3xl font-black text-slate-900">{Number(selectedFaculty.metrics?.rating || 0).toFixed(1)}</p>
                    <p className="text-sm text-slate-500">average rating</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">Rating Distribution</h4>
                <div className="space-y-3">
                  {(selectedFaculty.metrics?.ratingDistribution || []).map((item) => (
                    <div key={item.key} className="grid grid-cols-[115px_1fr_44px] gap-3 items-center">
                      <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                      <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                      </div>
                      <span className="text-sm text-slate-500 text-right">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
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