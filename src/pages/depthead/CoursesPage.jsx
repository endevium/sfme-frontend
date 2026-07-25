import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Pencil, Plus, Trash2, Users, X, ChevronDown } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { getToken } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const parseApiError = async (response, fallback = 'Request failed.') => {
  const data = await response.json().catch(() => null);
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data) && data.length > 0) return String(data[0]);
  if (typeof data === 'object') {
    const firstEntry = Object.entries(data)[0];
    if (firstEntry) {
      const [, value] = firstEntry;
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      if (typeof value === 'string') return value;
    }
  }
  return fallback;
};

const formatSubjectCode = (value) => String(value || '').toUpperCase().replace(/\s+/g, '');

const formatTitleCase = (value) => {
  const s = String(value || '').trim();
  if (!s) return '';
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
};

const formatTitleCaseForInput = (value) => {
  const v = String(value || '');
  const hasTrailingSpace = /\s$/.test(v);
  // Collapse multiple spaces to single space for display, but preserve a trailing space while typing
  const normalized = v.replace(/\s+/g, ' ').split(' ').map((w) => {
    if (!w) return '';
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
  return normalized + (hasTrailingSpace ? ' ' : '');
};

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseModalError, setCourseModalError] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [deletingCourseId, setDeletingCourseId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearLevel, setSelectedYearLevel] = useState('ALL');
  const [selectedSemester, setSelectedSemester] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards');
  const [formData, setFormData] = useState({
    department: '',
    subject_code: '',
    module_name: '',
    year_level: '',
    semester: '',
    academic_year: '2025-2026',
  });

  const isEditingCourse = editingCourseId !== null;

  const fetchPrograms = async (token) => {
    const res = await fetch(`${API_BASE_URL}/programs/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : data?.results || [];
  };

  const fetchCourses = async (token) => {
    const res = await fetch(`${API_BASE_URL}/modules/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const msg = await parseApiError(res, 'Unable to load courses.');
      throw new Error(msg);
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : data?.results || [];
  };

  const loadData = async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const [programList, courseList] = await Promise.all([
        fetchPrograms(token),
        fetchCourses(token),
      ]);
      setPrograms(programList);
      setCourses(courseList);
    } catch (err) {
      setError(err.message || 'Unable to load courses.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Intentionally load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCourses = useMemo(() => {
    let list = courses || [];
    if (selectedYearLevel !== 'ALL') {
      list = list.filter((course) => String(course?.year_level || '').trim() === selectedYearLevel);
    }
    if (selectedSemester !== 'ALL') {
      list = list.filter((course) => String(course?.semester || '').trim() === selectedSemester);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((course) => {
        const code = String(course?.subject_code || '').toLowerCase();
        const name = String(course?.module_name || '').toLowerCase();
        return code.includes(q) || name.includes(q);
      });
    }
    return list;
  }, [courses, searchQuery, selectedYearLevel, selectedSemester]);

  const yearLevels = useMemo(() => {
    const levels = Array.from(new Set((courses || []).map((c) => String(c?.year_level || '').trim()).filter(Boolean)));
    return levels;
  }, [courses]);

  const semesterOptions = useMemo(() => {
    const sems = Array.from(new Set((courses || []).map((c) => String(c?.semester || '').trim()).filter(Boolean)));
    return sems;
  }, [courses]);

  const departmentOptions = useMemo(() => {
    const fromPrograms = programs
      .map((program) => String(program?.department || '').trim())
      .filter(Boolean);
    const fromCourses = courses
      .map((course) => String(course?.department || '').trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...fromPrograms, ...fromCourses]));
    return unique;
  }, [programs, courses]);

  useEffect(() => {
    if (departmentOptions.length === 0) return;
    setFormData((prev) => {
      if (prev.department) return prev;
      return { ...prev, department: departmentOptions[0] };
    });
  }, [departmentOptions]);

  const isFormComplete = Boolean(
    formData.subject_code.trim() &&
    formData.module_name.trim() &&
    formData.year_level.trim() &&
    formData.semester.trim() &&
    formData.academic_year.trim()
  );

  const resetCourseForm = () => {
    setFormData({
      department: departmentOptions[0] || '',
      subject_code: '',
      module_name: '',
      year_level: '',
      semester: '',
      academic_year: '2025-2026',
    });
    setEditingCourseId(null);
    setCourseModalError('');
  };

  const openCreateCourseModal = () => {
    resetCourseForm();
    setIsCourseModalOpen(true);
  };

  const closeCourseModal = () => {
    setIsCourseModalOpen(false);
    resetCourseForm();
  };

  const startEditCourse = (course) => {
    setCourseModalError('');
    setEditingCourseId(course.id);
    setFormData({
      department: String(course?.department || departmentOptions[0] || '').trim(),
      subject_code: formatSubjectCode(course?.subject_code || ''),
      module_name: formatTitleCaseForInput(course?.module_name || ''),
      year_level: String(course?.year_level || '').trim(),
      semester: String(course?.semester || '').trim(),
      academic_year: String(course?.academic_year || '').trim(),
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async () => {
    setCourseModalError('');
    if (!isFormComplete) {
      setCourseModalError('Please complete all required fields.');
      return;
    }

    const token = getToken();
    if (!token) {
      setCourseModalError('Session expired. Please login again.');
      return;
    }

    setSavingCourse(true);
    try {
      const payload = {
        subject_code: formatSubjectCode(formData.subject_code),
        module_name: formatTitleCase(formData.module_name.trim()),
        year_level: formData.year_level.trim(),
        semester: formData.semester,
        academic_year: formData.academic_year.trim(),
      };

      const url = isEditingCourse ? `${API_BASE_URL}/modules/${editingCourseId}/` : `${API_BASE_URL}/modules/`;
      const res = await fetch(url, {
        method: isEditingCourse ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await parseApiError(res, isEditingCourse ? 'Unable to update course.' : 'Unable to create course.');
        setCourseModalError(msg);
        return;
      }

      closeCourseModal();
      await loadData();
    } catch {
      setCourseModalError('Unable to reach the server.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    const ok = window.confirm(`Delete ${course.module_name || 'this course'}? This action cannot be undone.`);
    if (!ok) return;

    const token = getToken();
    if (!token) {
      setError('Session expired. Please login again.');
      return;
    }

    setError('');
    setDeletingCourseId(course.id);
    try {
      const res = await fetch(`${API_BASE_URL}/modules/${course.id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const msg = await parseApiError(res, 'Unable to delete course.');
        setError(msg);
        return;
      }

      setCourses((prev) => prev.filter((item) => item.id !== course.id));
      if (editingCourseId === course.id) {
        closeCourseModal();
      }
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const cardData = filteredCourses.map((course, index) => ({
    id: course?.id || `${course?.subject_code || 'course'}-${index}`,
    subject_code: course?.subject_code || 'N/A',
    module_name: formatTitleCase(course?.module_name || 'Untitled Course'),
    semester: course?.semester || 'N/A',
    year_level: course?.year_level || 'N/A',
    enrolled: Number(course?.student_count || 0),
    department: course?.department || '',
    academic_year: course?.academic_year || '',
  }));

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="depthead" activeItem="courses" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-bold text-[#1f2937]">Courses Management</h1>
                <p className="text-slate-500 mt-1">View and manage all courses by department</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  openCreateCourseModal();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#18393e] transition-all"
              >
                <Plus size={15} />
                Create Course
              </button>
            </div>

            <section className="mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by code or title"
                    className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row lg:w-auto">
                  <div className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      aria-pressed={viewMode === 'cards'}
                      className={`inline-flex h-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${viewMode === 'cards' ? 'bg-[#1f474d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <LayoutGrid size={16} />
                      Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      aria-pressed={viewMode === 'table'}
                      className={`inline-flex h-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${viewMode === 'table' ? 'bg-[#1f474d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <List size={16} />
                      Table
                    </button>
                  </div>
                  <div className="w-full sm:w-60">
                  <select
                    value={selectedYearLevel}
                    onChange={(e) => setSelectedYearLevel(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="ALL">All Year Levels</option>
                    {yearLevels.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                  </div>
                  <div className="w-full sm:w-60">
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                  >
                    <option value="ALL">All Semesters</option>
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  </div>
                </div>
              </div>
            </section>

            <section>
              {loading ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-500">Loading courses...</div>
              ) : error ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-rose-600">{error}</div>
              ) : cardData.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-slate-500">No courses found.</div>
              ) : viewMode === 'table' ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-4 text-left font-semibold">Course Code</th>
                          <th className="px-5 py-4 text-left font-semibold">Course Name</th>
                          <th className="px-5 py-4 text-left font-semibold">Year Level</th>
                          <th className="px-5 py-4 text-left font-semibold">Semester</th>
                          <th className="px-5 py-4 text-left font-semibold">Enrolled</th>
                          <th className="px-5 py-4 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cardData.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50/80">
                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-700">
                                {course.subject_code}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-semibold text-slate-900">{course.module_name}</td>
                            <td className="px-5 py-4">{course.year_level}</td>
                            <td className="px-5 py-4">{course.semester}</td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-2 text-slate-600">
                                <Users size={14} className="text-slate-400" />
                                {course.enrolled} students
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditCourse(course)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sky-600 transition hover:bg-slate-100 hover:text-sky-800"
                                  title="Edit course"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCourse(course)}
                                  disabled={deletingCourseId === course.id}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-slate-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  title="Delete course"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {cardData.map((course) => (
                    <article key={course.id} className="h-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 font-bold uppercase">
                          {course.subject_code}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditCourse(course)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sky-600 transition hover:bg-slate-100 hover:text-sky-800"
                            title="Edit course"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(course)}
                            disabled={deletingCourseId === course.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-slate-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Delete course"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl leading-tight font-bold text-slate-900 tracking-tight mt-3">{course.module_name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{course.year_level}</p>
                      <div className="mt-6 space-y-2.5 text-sm text-slate-700">
                        <p><span className="font-semibold">Semester:</span> <span>{course.semester}</span></p>
                        <p className="inline-flex items-center gap-2 font-semibold">
                          <Users size={14} className="text-slate-400" />
                          {course.enrolled} students
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {isCourseModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-4xl font-bold text-slate-800">{isEditingCourse ? 'Edit Course' : 'Create New Course'}</h3>
                <p className="text-sm text-slate-500 mt-1">{isEditingCourse ? 'Update the selected course details.' : 'Add a new course to the system.'}</p>
              </div>
              <button
                type="button"
                onClick={closeCourseModal}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                <div className="relative">
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-slate-800 appearance-none"
                    disabled={isEditingCourse}
                  >
                    {departmentOptions.length === 0 ? (
                      <option value="">No departments available</option>
                    ) : (
                      departmentOptions.map((department) => (
                        <option key={department} value={department}>{department}</option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Code</label>
                <input
                  type="text"
                  value={formData.subject_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject_code: formatSubjectCode(e.target.value) }))}
                  placeholder="e.g., ITE 401"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Name</label>
                <input
                  type="text"
                  value={formData.module_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, module_name: formatTitleCaseForInput(e.target.value) }))}
                  placeholder="e.g., Platform Technologies"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year Level</label>
                <div className="relative">
                  <select
                    value={formData.year_level}
                    onChange={(e) => setFormData((prev) => ({ ...prev, year_level: e.target.value }))}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-slate-800 appearance-none"
                  >
                    <option value="">Select year level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                  <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Semester</label>
                <div className="relative">
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData((prev) => ({ ...prev, semester: e.target.value }))}
                    className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-slate-800 appearance-none"
                  >
                    <option value="">Select semester</option>
                    <option value="1st Sem">1st Semester</option>
                    <option value="2nd Sem">2nd Semester</option>
                    <option value="Summer">Summer</option>
                  </select>
                  <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Academic Year</label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData((prev) => ({ ...prev, academic_year: e.target.value }))}
                  placeholder="e.g., 2025-2026"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-800"
                />
              </div>

              {courseModalError && <p className="text-sm text-rose-600 font-medium">{courseModalError}</p>}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeCourseModal}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingCourse || !isFormComplete}
                  onClick={handleSaveCourse}
                  className="flex-1 h-11 rounded-xl bg-[#1f474d] text-white text-sm font-semibold hover:bg-[#2a5d65] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {savingCourse ? (isEditingCourse ? 'Saving...' : 'Creating...') : (isEditingCourse ? 'Save Changes' : 'Create Course')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursesPage;
