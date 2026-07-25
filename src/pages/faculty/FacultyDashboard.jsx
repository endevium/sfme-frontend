import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Users, Star, TrendingUp, MessageSquare } from 'lucide-react';
import { getAccessToken, getUser } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

const getQuestionScale = (questionIdRaw) => {
  const questionId = String(questionIdRaw || '').trim().toLowerCase();

  if (questionId.startsWith('learn_')) return { min: 1, max: 4 };
  if (questionId === 'overall_instructor' || questionId === 'overall_modules') return { min: 1, max: 10 };

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

const FacultyDashboard = () => {
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  const [facultyInfo, setFacultyInfo] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    const user = getUser();
    if (!token) return;

    setFacultyInfo({
      name: user?.firstname ? `${user.firstname} ${user.lastname || ''}`.trim() : user?.email || 'Faculty',
      department: user?.department || '',
      specialization: user?.specialization || '',
      employeeId: user?.employee_id || user?.employeeId || user?.id || null,
      overallRating: null,
      totalEvaluations: null,
      totalStudents: null,
      responseRate: null,
    });

    const fetchModules = async () => {
      setLoading(true);
      setError(null);

      try {
        const [modulesRes, formsRes, submissionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/faculty/modules/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${API_BASE_URL}/module-evaluation-forms/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${API_BASE_URL}/feedback/submissions/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        if (!modulesRes.ok) throw new Error(`Failed to load modules (${modulesRes.status})`);

        const moduleRows = extractList(await modulesRes.json().catch(() => []));
        const allForms = formsRes.ok ? extractList(await formsRes.json().catch(() => [])) : [];
        const allSubmissions = submissionsRes.ok ? extractList(await submissionsRes.json().catch(() => [])) : [];

        const facultyClassroomIds = new Set(
          moduleRows
            .map((row) => row?.classroom_id ?? row?.classroom)
            .filter((id) => id !== null && id !== undefined && String(id).trim() !== '')
            .map((id) => String(id))
        );

        const facultyForms = allForms.filter((form) => {
          const classroomId = form?.classroom;
          if (classroomId === null || classroomId === undefined) return false;
          return facultyClassroomIds.has(String(classroomId));
        });

        const formsById = new Map(facultyForms.map((form) => [String(form?.id), form]));
        const formsByClassroom = new Map();
        facultyForms.forEach((form) => {
          const classroomId = form?.classroom;
          if (classroomId !== null && classroomId !== undefined && String(classroomId).trim() !== '') {
            const key = String(classroomId);
            if (!formsByClassroom.has(key)) formsByClassroom.set(key, []);
            formsByClassroom.get(key).push(form);
          }
        });

        const resolveFormIdFromSubmission = (submission) => {
          const formModel = String(submission?.form_model || '').toLowerCase();
          if (formModel && formModel !== 'moduleevaluationform') return null;

          const primary = submission?.form_object_id;
          if (primary !== null && primary !== undefined && formsById.has(String(primary))) {
            return String(primary);
          }

          const secondary = submission?.form_id;
          if (secondary !== null && secondary !== undefined && formsById.has(String(secondary))) {
            return String(secondary);
          }

          const legacy = submission?.form;
          if (legacy !== null && legacy !== undefined) {
            if (typeof legacy === 'object') {
              const legacyId = legacy.id ?? legacy.pk;
              if (legacyId !== null && legacyId !== undefined && formsById.has(String(legacyId))) {
                return String(legacyId);
              }
            } else if (formsById.has(String(legacy))) {
              return String(legacy);
            }
          }

          return null;
        };

        const submissionsByFormId = new Map();
        allSubmissions.forEach((submission) => {
          const formId = resolveFormIdFromSubmission(submission);
          if (!formId) return;
          if (!submissionsByFormId.has(formId)) submissionsByFormId.set(formId, []);
          submissionsByFormId.get(formId).push(submission);
        });

        const mapped = moduleRows.map((m) => {
          const students = toNumber(m.enrolled_students ?? m.students_count);
          const moduleId = String(m.module_id || m.id || m.subject_code || '');
          const moduleCode = String(m.subject_code || '').trim().toUpperCase();
          const classroomId = m?.classroom_id ?? m?.classroom;
          const classroomKey = classroomId !== null && classroomId !== undefined ? String(classroomId) : '';
          const moduleFormId = m?.evaluation_form_id !== null && m?.evaluation_form_id !== undefined
            ? String(m.evaluation_form_id)
            : '';

          let candidateForms = [];
          if (classroomKey && formsByClassroom.has(classroomKey)) {
            candidateForms = formsByClassroom.get(classroomKey);
          } else if (moduleFormId && formsById.has(moduleFormId)) {
            candidateForms = [formsById.get(moduleFormId)];
          } else if (formsById.has(moduleId)) {
            candidateForms = [formsById.get(moduleId)];
          }

          let ratingSum = 0;
          let ratingCount = 0;
          let responsesCount = 0;

          candidateForms.forEach((form) => {
            const formId = String(form?.id || '');
            const formSubmissions = submissionsByFormId.get(formId) || [];
            responsesCount += formSubmissions.length;

            formSubmissions.forEach((submission) => {
              const respList = Array.isArray(submission?.responses) ? submission.responses : [];
              respList.forEach((item) => {
                const questionId = item?.question || item?.question_code || item?.question_id;
                const normalized = toNormalizedFivePointRating(item?.rating, questionId);
                if (normalized === null) return;
                ratingSum += normalized;
                ratingCount += 1;
              });
            });
          });

          const averageRating = ratingCount > 0
            ? Number(Math.min(5, Math.max(1, ratingSum / ratingCount)).toFixed(1))
            : null;

          const effectiveResponsesCount = responsesCount;
          const responseRate = students > 0 ? Math.min(100, Math.round((effectiveResponsesCount / students) * 100)) : 0;

          return {
            id: moduleId,
            code: moduleCode,
            name: m.module_name || m.subject_code || 'Untitled',
            semester: m.semester || m.academic_year || '',
            students,
            evaluations: effectiveResponsesCount,
            averageRating,
            responseRate,
            status: 'active',
            _ratingSum: ratingCount > 0 ? ratingSum : 0,
            _ratingCount: ratingCount > 0 ? ratingCount : 0,
          };
        });

        setModules(mapped);

        const totalStudents = mapped.reduce((sum, module) => sum + module.students, 0);
        const totalEvaluations = mapped.reduce((sum, module) => sum + module.evaluations, 0);
        const totalRatingSum = mapped.reduce((sum, module) => sum + module._ratingSum, 0);
        const totalRatingCount = mapped.reduce((sum, module) => sum + module._ratingCount, 0);

        const overallRating = totalRatingCount > 0
          ? Math.min(5, Math.max(1, totalRatingSum / totalRatingCount))
          : null;
        const responseRate = totalStudents > 0 ? Math.min(100, Math.round((totalEvaluations / totalStudents) * 100)) : 0;

        setFacultyInfo((prev) => prev ? ({
          ...prev,
          overallRating,
          totalEvaluations,
          totalStudents,
          responseRate,
        }) : prev);
      } catch (err) {
        console.error('FacultyDashboard fetch error', err);
        setError(err.message || 'Failed to load modules');
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="faculty" activeItem="dashboard" />

        {/* MAIN CONTENT SCROLL AREA */}
        <main className="flex-1 overflow-y-auto">
          <section className="py-10 px-8">
            <div className="max-w-6xl mx-auto">
              <div>
                <h1 className="text-3xl font-bold text-[#0f2f57] tracking-tight">Welcome, {facultyInfo?.name || 'Faculty'}</h1>
                <p className="text-slate-500 mt-1">{facultyInfo?.department || ''}{facultyInfo?.department && facultyInfo?.specialization ? ' • ' : ''}{facultyInfo?.specialization || ''}</p>
              </div>
            </div>
          </section>

          <div className="max-w-6xl mx-auto px-8 py-8">
            {/* OVERALL PERFORMANCE */}
            <div className="mb-12 rounded-2xl border border-[#b6cff2] bg-[#f5f7ff] p-6 md:p-7">
              <h2 className="text-3xl font-bold text-slate-900">Your Overall Performance</h2>
              <p className="text-slate-500 mt-1">Aggregated ratings from all your modules</p>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-stretch">
                <div className="rounded-xl p-2">
                  <p className="text-2xl font-semibold text-slate-800">Overall Rating</p>
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const rating = facultyInfo?.overallRating || 0;
                      return (
                        <Star
                          key={s}
                          size={22}
                          className={s <= Math.floor(rating) ? 'fill-amber-400 text-amber-400' : 'fill-amber-200 text-amber-200'}
                        />
                      );
                    })}
                  </div>
                  <p className="text-5xl font-black text-[#0f2f57] mt-2">
                    {facultyInfo?.overallRating != null ? `${facultyInfo.overallRating.toFixed(1)}/5.0` : '-'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-white/70 p-6 text-center border border-white/80">
                    <Users className="mx-auto text-blue-600" size={28} />
                    <p className="text-5xl font-black text-[#0f2f57] mt-3">{facultyInfo?.totalStudents ?? '-'}</p>
                    <p className="text-2xl text-slate-700 mt-1">Total Students</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-6 text-center border border-white/80">
                    <MessageSquare className="mx-auto text-emerald-600" size={28} />
                    <p className="text-5xl font-black text-[#0f2f57] mt-3">{facultyInfo?.totalEvaluations ?? '-'}</p>
                    <p className="text-2xl text-slate-700 mt-1">Evaluations</p>
                  </div>
                  <div className="rounded-xl bg-white/70 p-6 text-center border border-white/80">
                    <TrendingUp className="mx-auto text-violet-600" size={28} />
                    <p className="text-5xl font-black text-[#0f2f57] mt-3">{facultyInfo?.responseRate ?? 0}%</p>
                    <p className="text-2xl text-slate-700 mt-1">Response Rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* MODULES SECTION */}
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your Modules</h2>
                <p className="text-slate-500 text-sm mt-1">Module ratings and feedback summary</p>
              </div>
              <span className="bg-[#1f474d]/10 text-[#1f474d] px-4 py-1.5 rounded-full text-xs font-bold">
                {modules.length} Active Modules
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {loading ? (
                <div className="col-span-full text-center text-slate-500 py-10">Loading modules...</div>
              ) : error ? (
                <div className="col-span-full text-center text-rose-600 py-10">{error}</div>
              ) : modules.length === 0 ? (
                <div className="col-span-full text-center text-slate-500 py-10">No modules assigned yet.</div>
              ) : modules.map((module) => (
                <div key={module.id} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-amber-600 font-mono font-bold text-xs tracking-widest">{module.code}</span>
                      <h3 className="text-2xl font-bold text-slate-800 mt-1">{module.name}</h3>
                      <p className="text-slate-400 text-sm mt-1">{module.semester}</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] uppercase font-bold border border-emerald-200">
                      {module.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-6">
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-2">Module Average</p>
                    <div className="flex items-center gap-3">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={18} className={`${s <= Math.floor(module.averageRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{module.averageRating != null ? module.averageRating.toFixed(1) : 'N/A'}</span>
                      <span className="text-slate-400 text-sm font-medium">/ 5.0</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-100 pt-6">
                    <div>
                      <p className="text-xl font-bold text-slate-800">{module.students}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Students</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-600">{module.evaluations}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Responses</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-600">{module.responseRate}%</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FacultyDashboard;