import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { getToken, clearSession } from '../../utils/auth';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  Star, 
  BarChart3, 
  FileText, 
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';

const isFacultyEvaluationQuestion = (questionIdRaw) => {
  const questionId = String(questionIdRaw || '').toLowerCase().trim();
  return (
    questionId === 'overall_instructor' ||
    questionId === 'overall_rating' ||
    questionId === 'overall_recommend' ||
    questionId.startsWith('inst_') ||
    questionId.startsWith('content_') ||
    questionId.startsWith('assess_') ||
    questionId.startsWith('env_') ||
    questionId.startsWith('comp_') ||
    questionId.startsWith('method_') ||
    questionId.startsWith('engage_') ||
    questionId.startsWith('feedback_') ||
    questionId.startsWith('prof_')
  );
};

const isModuleEvaluationQuestion = (questionIdRaw) => {
  const questionId = String(questionIdRaw || '').toLowerCase().trim();
  return questionId.startsWith('learn_') || questionId === 'overall_modules';
};

const getQuestionScale = (questionIdRaw) => {
  const questionId = String(questionIdRaw || '').toLowerCase().trim();
  if (questionId.startsWith('learn_')) {
    return { min: 1, max: 4 };
  }
  if (questionId === 'overall_instructor' || questionId === 'overall_modules') {
    return { min: 1, max: 10 };
  }
  return { min: 1, max: 5 };
};

const toNormalizedFivePointRating = (rawRating, questionIdRaw) => {
  const r = Number(rawRating);
  if (isNaN(r)) return null;
  const scale = getQuestionScale(questionIdRaw);
  if (r < scale.min || r > scale.max) return null;
  const normalized = 1 + ((r - scale.min) * 4) / (scale.max - scale.min);
  return normalized;
};

const getQuestionIdFromResponseItem = (item) => (
  item?.question || item?.question_code || item?.question_id
);

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

const clampFivePoint = (n) => {
  return Math.min(5, Math.max(1, Number(n)));
};

const DeptHeadDashboard = () => {
  const handleNavigation = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const [deptHeadInfo, _setDeptHeadInfo] = useState({
    name: '',
    position: 'Department Head',
    department: '',
    email: ''
  });

  const [stats, setStats] = useState([
    { title: "Total Students", value: 0, description: "Active enrolled students", icon: GraduationCap, color: "bg-blue-50 text-blue-600", change: '' },
    { title: "Total Faculty", value: 0, description: "Active teaching staff", icon: Users, color: "bg-purple-50 text-purple-600", change: '' },
    { title: "Total Modules", value: 0, description: "Courses this semester", icon: BookOpen, color: "bg-emerald-50 text-emerald-600", change: '' },
    { title: "Evaluation Rate", value: '0%', description: "Completion rate", icon: TrendingUp, color: "bg-amber-50 text-amber-600", change: '' },
  ]);

  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const [topRatedFaculty, setTopRatedFaculty] = useState([]);
  const [_isLoading, setIsLoading] = useState(false);
  const [_loadError, setLoadError] = useState('');

  useEffect(() => {
    const token = getToken();

    // NEW: block access when logged out
    if (!token) {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    const authHeaders = { Authorization: `Bearer ${token}` };

    const fetchDashboard = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        // Fetch students count (NOW protected)
        const studentsResp = await fetch(`${API_BASE_URL}/students/`, { headers: authHeaders });
        if (studentsResp.status === 401) throw new Error('unauthorized');
        const studentsData = await studentsResp.json().catch(() => []);
        const totalStudents = Array.isArray(studentsData)
          ? studentsData.length
          : (studentsData?.count || extractList(studentsData).length || 0);

        // Fetch faculty count (NOW protected)
        const facultyResp = await fetch(`${API_BASE_URL}/faculty/`, { headers: authHeaders });
        if (facultyResp.status === 401) throw new Error('unauthorized');
        const facultyData = await facultyResp.json().catch(() => []);
        const totalFaculty = Array.isArray(facultyData)
          ? facultyData.length
          : (facultyData?.count || extractList(facultyData).length || 0);

        // Fetch module evaluation forms (NOW protected)
        const formsResp = await fetch(`${API_BASE_URL}/module-evaluation-forms/`, { headers: authHeaders });
        if (formsResp.status === 401) throw new Error('unauthorized');
        const formsData = await formsResp.json().catch(() => []);
        const formsList = extractList(formsData);
        const totalModules = formsList.length;
        const formsById = new Map(formsList.map((form) => [String(form.id), form]));

        // Fetch feedback submissions (already protected; keep it consistent)
        let submissions = [];
        const subsResp = await fetch(`${API_BASE_URL}/feedback/submissions/`, { headers: authHeaders });
        if (subsResp.status === 401) throw new Error('unauthorized');
        if (subsResp.ok) {
          const submissionsData = await subsResp.json().catch(() => []);
          submissions = extractList(submissionsData);
        }

        // Map submissions to module forms so dashboard cards are report-based (per form), not per student.
        const resolveFormIdFromSubmission = (submission) => {
          const formModel = String(submission?.form_model || '').toLowerCase();
          if (formModel && formModel !== 'moduleevaluationform') return null;

          const primary = submission?.form_object_id;
          if (primary !== null && primary !== undefined && formsById.has(String(primary))) return String(primary);

          const secondary = submission?.form_id;
          if (secondary !== null && secondary !== undefined && formsById.has(String(secondary))) return String(secondary);

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

        const responsesByForm = new Map();
        (Array.isArray(submissions) ? submissions : []).forEach((submission) => {
          const fid = resolveFormIdFromSubmission(submission);
          if (!fid) return;
          if (!responsesByForm.has(fid)) responsesByForm.set(fid, []);
          responsesByForm.get(fid).push(submission);
        });

        const moduleReportRows = formsList.map((form) => {
          const fid = String(form.id);
          const formResponses = responsesByForm.get(fid) || [];

          let ratingSum = 0;
          let ratingCount = 0;
          let moduleSum = 0;
          let moduleCnt = 0;
          let facultySum = 0;
          let facultyCnt = 0;
          
          formResponses.forEach((submission) => {
            const respList = Array.isArray(submission?.responses) ? submission.responses : [];
            respList.forEach((item) => {
              const questionId = getQuestionIdFromResponseItem(item);
              const normalized = toNormalizedFivePointRating(item?.rating, questionId);
              if (normalized !== null) {
                ratingSum += normalized;
                ratingCount += 1;
                
                if (isModuleEvaluationQuestion(questionId)) {
                  moduleSum += normalized;
                  moduleCnt += 1;
                }
                if (isFacultyEvaluationQuestion(questionId)) {
                  facultySum += normalized;
                  facultyCnt += 1;
                }
              }
            });
          });

          const averageRating = ratingCount > 0 ? clampFivePoint(ratingSum / ratingCount) : 0;
          const moduleRating = moduleCnt > 0 ? clampFivePoint(moduleSum / moduleCnt) : null;
          const facultyRating = facultyCnt > 0 ? clampFivePoint(facultySum / facultyCnt) : null;
          
          const latestSubmissionDate = formResponses
            .map((submission) => submission?.submitted_at || submission?.timestamp || submission?.time)
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0] || null;

          return {
            id: fid,
            module: form?.module_name || form?.subject_code || form?.subject_description || `Form ${fid}`,
            subjectCode: form?.subject_code || `FORM-${fid}`,
            instructor: form?.instructor_name || 'TBA',
            responsesCount: formResponses.length,
            ratingSum,
            ratingCount,
            averageRating,
            moduleRating,
            facultyRating,
            date: latestSubmissionDate || form?.created_at || '',
          };
        });

        const formsWithResponses = moduleReportRows.filter((row) => row.responsesCount > 0).length;
        const evalRate = totalModules > 0 ? Math.round((formsWithResponses / totalModules) * 100) : 0;

        setStats([
          { title: "Total Students", value: totalStudents, description: "Active enrolled students", icon: GraduationCap, color: "bg-blue-50 text-blue-600", change: '' },
          { title: "Total Faculty", value: totalFaculty, description: "Active teaching staff", icon: Users, color: "bg-purple-50 text-purple-600", change: '' },
          { title: "Total Modules", value: totalModules, description: "Courses this semester", icon: BookOpen, color: "bg-emerald-50 text-emerald-600", change: '' },
          { title: "Evaluation Rate", value: `${evalRate}%`, description: "Completion rate", icon: TrendingUp, color: "bg-amber-50 text-amber-600", change: '' },
        ]);

        // Top rated modules (by module-specific rating), high -> low
        const topModules = moduleReportRows
          .slice()
          .filter((row) => row.moduleRating !== null)
          .sort((a, b) => b.moduleRating - a.moduleRating)
          .slice(0, 5)
          .map((row) => ({
            student: row.module,
            studentId: row.subjectCode,
            module: `${row.responsesCount} response${row.responsesCount === 1 ? '' : 's'}`,
            instructor: row.instructor,
            rating: row.moduleRating, // use moduleRating as primary score here
            moduleRating: row.moduleRating,
            facultyRating: row.facultyRating,
            date: row.date,
          }));
        setRecentEvaluations(topModules);

        // Top rated faculty using overall normalized ratings (same basis as Faculty page calculations)
        const instructorMap = new Map();
        moduleReportRows.forEach((row) => {
          const instructor = String(row.instructor || '').trim();
          if (!instructor || instructor.toLowerCase() === 'tba') return;

          const sourceRating = row.averageRating || null;
          if (sourceRating === null || !Number.isFinite(sourceRating) || sourceRating <= 0) return;
          const agg = instructorMap.get(instructor) || { sum: 0, count: 0, modules: new Set() };
          agg.sum += sourceRating;
          agg.count += 1;
          agg.modules.add(row.module);
          instructorMap.set(instructor, agg);
        });
        const instructors = Array.from(instructorMap.entries()).map(([name, agg]) => ({
          name,
          rating: clampFivePoint(agg.sum / agg.count),
          evaluations: agg.count,
          modules: agg.modules.size,
        }));
        instructors.sort((a,b) => b.rating - a.rating);
        setTopRatedFaculty(instructors.slice(0,5));

      } catch (e) {
        if ((e && e.message) === 'unauthorized') {
          clearSession();
          window.history.replaceState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return;
        }
        console.error('depthead dashboard fetch error', e);
        setLoadError('Unable to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [API_BASE_URL]);

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="depthead" activeItem="dashboard" />
        
        <main className="flex-1 overflow-y-auto">
          
          {/* TOP WELCOME SECTION */}
          <section className="border-b border-slate-200 py-10">
            <div className="container mx-auto px-8 max-w-7xl w-full">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h1 className="text-4xl font-bold text-[#1f2937] tracking-tight">Department Overview</h1>
                  <p className="text-slate-500 mt-1">{deptHeadInfo.name}{deptHeadInfo.department ? ` • ${deptHeadInfo.department}` : ''}</p>
                </div>
                {/* header actions removed as requested */}
              </div>
            </div>
          </section>

          <div className="container mx-auto px-8 max-w-7xl w-full py-10">
            
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.title}</h3>
                      <div className={`p-2 rounded-xl ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {stat.change.split(' ')[0]}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium uppercase">{stat.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MAIN CONTENT TABLES/CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              
              {/* Recent Evaluations */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Top Rated Module Evaluations</h2>
                    <p className="text-slate-400 text-xs">Highest-rated module evaluations</p>
                  </div>
                  <button onClick={() => handleNavigation('/depthead-dashboard/reports')} className="text-[#1f474d] text-xs font-bold hover:underline flex items-center gap-1">
                    View All <ChevronRight size={14} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {recentEvaluations.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic">No module ratings available.</div>
                  ) : (
                    recentEvaluations.map((evaluation, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-slate-800 truncate text-sm">{evaluation.student}</p>
                            <span className="text-[10px] text-slate-400 font-mono">#{evaluation.studentId}</span>
                          </div>
                          <p className="text-xs text-[#1f474d] truncate font-bold">{evaluation.module}</p>
                          {/* <p className="text-[10px] text-slate-500 italic mt-0.5">{evaluation.instructor}</p> */}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="space-y-0.5">
                            {evaluation.moduleRating !== null && (
                              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                <Star className="h-3 w-3 fill-blue-400 text-blue-400" />
                                <span className="text-xs font-bold text-slate-800">{evaluation.moduleRating.toFixed(1)}</span>
                                <span className="text-[9px] text-slate-500">Mod</span>
                              </div>
                            )}
                            {evaluation.moduleRating === null && (
                              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="text-sm font-bold text-slate-800">{evaluation.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{evaluation.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Rated Faculty */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Top Rated Faculty</h2>
                    <p className="text-slate-400 text-xs">Department performance leaders</p>
                  </div>
                  <button onClick={() => handleNavigation('/depthead-dashboard/faculty')} className="text-[#1f474d] text-xs font-bold hover:underline flex items-center gap-1">
                    Faculty List <ChevronRight size={14} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {topRatedFaculty.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic">No faculty ratings available.</div>
                  ) : (
                    topRatedFaculty.map((faculty, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-[#1f474d] font-black text-sm shadow-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate text-sm">{faculty.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                            {faculty.evaluations} Reviews • {faculty.modules || 0} Courses
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-lg font-bold text-slate-800">{Number(faculty.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-8">
                  <BarChart3 className="text-[#1f474d]" size={24} />
                  <h2 className="text-xl font-bold text-slate-800">Management Portal</h2>
              </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { to: "/depthead-dashboard/students", icon: GraduationCap, label: "Manage Students", sub: "Roster & Enrollment" },
                  { to: "/depthead-dashboard/faculty", icon: Users, label: "Manage Faculty", sub: "Load & Assignments" },
                  { to: "/depthead-dashboard/reports", icon: BarChart3, label: "Analytics Hub", sub: "Performance Trends" },
                  { to: "#", icon: FileText, label: "Export Archives", sub: "CSV & PDF Formats" },
                ].map((action, i) => (
                  <div key={i} className="group">
                    <div onClick={() => action.to !== '#' && handleNavigation(action.to)} className="flex flex-col p-5 h-full rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#1f474d]/30 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer">
                      <div className="p-3 w-fit rounded-xl bg-white text-[#1f474d] mb-4 border border-slate-100 group-hover:bg-[#1f474d] group-hover:text-white transition-all duration-300">
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm mb-1 group-hover:text-[#1f474d] transition-colors">{action.label}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{action.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DeptHeadDashboard;