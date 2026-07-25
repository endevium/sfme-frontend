import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import { getToken, clearSession } from '../../utils/auth';

import { 
  BookOpen,
  CheckCircle, 
  AlertCircle, 
  History as HistoryIcon, 
  Users,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const StudentDashboard = () => {
  const [studentName, setStudentName] = useState('Student');
  const [stats, setStats] = useState([
    { title: "Total Modules", value: "0", description: "Enrolled this semester", icon: BookOpen, color: "bg-slate-100 text-[#0f2f57]" },
    { title: "Instructors", value: "0", description: "To evaluate", icon: Users, color: "bg-slate-100 text-[#0f2f57]" },
    { title: "Completed", value: "0", description: "Total evaluations done", icon: CheckCircle, color: "bg-slate-100 text-[#0f2f57]" },
    { title: "Pending", value: "0", description: "Awaiting feedback", icon: AlertCircle, color: "bg-slate-100 text-[#0f2f57]" },
  ]);
  const [recentModules, setRecentModules] = useState([]);
  const [loadError, setLoadError] = useState('');
  const handleNavigation = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const fetchDashboard = useCallback(async () => {
    await Promise.resolve();
    setLoadError('');
    const token = getToken();

    if (!token) {
      setLoadError('Please log in to view your dashboard.');
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/students/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        clearSession();
        window.history.replaceState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setLoadError(data?.detail || 'Unable to load dashboard data.');
        return;
      }

      const name = `${data?.student?.firstname || ''} ${data?.student?.lastname || ''}`.trim();
      setStudentName(name || 'Student');

      // Use the same list fallback order used by the evaluation modules page.
      const moduleList = Array.isArray(data?.modules)
        ? data.modules
        : Array.isArray(data?.enrolled_modules)
          ? data.enrolled_modules
          : Array.isArray(data?.recent_modules)
            ? data.recent_modules
            : Array.isArray(data?.classrooms)
              ? data.classrooms
              : [];

      // Mirror ModulePage rules for active form availability + completion state.
      const availableModuleCodes = new Set();
      const formByCode = new Map();
      const completedModuleCodes = new Set();
      const enrolledSubjectCodes = new Set();
      const enrolledByCode = new Map();

      const rawEnrolled =
        data?.enrolled_subjects ||
        data?.student?.enrolled_subjects ||
        data?.classrooms ||
        null;

      if (Array.isArray(rawEnrolled)) {
        rawEnrolled.forEach((subject) => {
          if (!subject) return;
          if (typeof subject === 'string') {
            const code = normalizeCode(subject);
            if (code) enrolledSubjectCodes.add(code);
            return;
          }

          if (typeof subject === 'object') {
            const code = normalizeCode(subject.code || subject.subject_code || subject.module_code);
            if (!code) return;

            enrolledSubjectCodes.add(code);
            const instructor = subject.instructor || subject.instructor_name || subject.lecturer || subject.lecturer_name || '';
            if (instructor) enrolledByCode.set(code, instructor);
          }
        });
      }

      try {
        const formsRes = await fetch(`${API_BASE_URL}/module-evaluation-forms/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const formsData = await formsRes.json().catch(() => []);
        const formsList = Array.isArray(formsData)
          ? formsData
          : Array.isArray(formsData?.results)
            ? formsData.results
            : [];

        if (formsRes.ok && formsList.length > 0) {
          formsList.forEach((form) => {
            if (form?.status !== 'Active') return;
            const code = normalizeCode(form?.title || form?.subject_code);
            if (!code) return;

            availableModuleCodes.add(code);
            formByCode.set(code, form);
            if (form?.is_completed) completedModuleCodes.add(code);
          });
        }
      } catch {
        // Non-blocking: dashboard can still render using classroom/module flags.
      }

      const alignedModules = moduleList
        .map((module, idx) => {
          const code = normalizeCode(module?.code || module?.subject_code || module?.module_code);
          const form = formByCode.get(code);

          let formAvailable = Boolean(
            module?.form_available ||
            module?.has_form ||
            module?.form_id ||
            (availableModuleCodes.has(code) && enrolledSubjectCodes.has(code))
          );

          const isCompleted = Boolean(
            module?.evaluation_completed ||
            module?.is_completed ||
            module?.completed ||
            (code && completedModuleCodes.has(code))
          );

          if (isCompleted) formAvailable = false;

          // Hide modules that are unavailable and not completed (same as ModulePage).
          if (!formAvailable && !isCompleted) return null;

          return {
            id: code || String(module?.id || idx),
            name: module?.module_name || module?.name || module?.title || module?.code || 'Unknown Module',
            instructor: module?.instructor || module?.instructor_name || module?.lecturer || enrolledByCode.get(code) || 'TBA',
            status: isCompleted ? 'completed' : 'pending',
            code: code || 'N/A',
            classroom_code: module?.classroom_code || 'N/A',
            form_id: form?.id,
          };
        })
        .filter(Boolean);

      // Extract unique instructors from the same normalized list used by EvaluationPage.
      const instructorSet = new Set(alignedModules.map((m) => m.instructor).filter(Boolean));
      const totalInstructors = instructorSet.size;

      // Calculate stats from aligned modules to keep Dashboard and Evaluation page in sync.
      const totalModules = alignedModules.length;
      const completedEvaluations = alignedModules.filter((m) => m.status === 'completed').length;
      const pendingEvaluations = alignedModules.filter((m) => m.status === 'pending').length;
      setStats([
        { title: "Total Modules", value: String(totalModules), description: "Enrolled this semester", icon: BookOpen, color: "bg-slate-100 text-[#0f2f57]" },
        { title: "Instructors", value: String(totalInstructors), description: "To evaluate", icon: Users, color: "bg-slate-100 text-[#0f2f57]" },
        { title: "Completed", value: String(completedEvaluations), description: "Total evaluations done", icon: CheckCircle, color: "bg-slate-100 text-[#0f2f57]" },
        { title: "Pending", value: String(pendingEvaluations), description: "Awaiting feedback", icon: AlertCircle, color: "bg-slate-100 text-[#0f2f57]" },
      ]);

      setRecentModules(alignedModules);
    } catch {
      setLoadError('Unable to reach the server. Please try again.');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboard();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchDashboard]);

  // Re-fetch dashboard when page becomes visible (returning from evaluation form)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchDashboard]);

  return (
    // Change 1: background to bg-slate-50 or bg-white and text to slate-900
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="dashboard" />
        
        <main className="flex-1 overflow-y-auto px-6 py-12">
          <div className="container mx-auto max-w-6xl space-y-12">
            
            {/* Welcome Section */}
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-[#1f474d] tracking-tight">Welcome back, <span className="text-slate-900">{studentName || 'Student'}!</span></h1>
              <p className="text-slate-500 mt-1">Here's your evaluation overview for this semester</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-slate-600 text-sm">{stat.title}</p>
                      <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{stat.value}</p>
                      <p className="text-xs text-slate-400 mt-2">{stat.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Modules Section */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Recent Modules</h2>
                  <p className="text-slate-500 text-sm">Your enrolled courses for evaluation</p>
                </div>
                <button 
                  onClick={() => handleNavigation('/dashboard/evaluation/modules')}
                  className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-600"
                >
                  View All
                </button>
              </div>
              <div className="p-6 space-y-4">
                {recentModules.map((module) => (
                  <div key={module.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg bg-white border border-slate-100 hover:border-slate-300 transition-all group shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{module.id}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${
                          module.status === "completed" 
                          ? "bg-green-50 text-green-600 border-green-100" 
                          : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                          {module.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-xl text-slate-800 group-hover:text-[#1f474d] transition-colors">{module.name}</h3>
                      <p className="text-sm text-slate-500">{module.instructor}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {module.status === "pending" ? (
                        <button 
                          onClick={() => handleNavigation(`/dashboard/evaluate/${module.id}`)}
                          className="bg-[#1f474d] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#2a5d65] transition-colors shadow-md shadow-slate-200"
                        >
                          Evaluate
                        </button>
                      ) : (
                        <button disabled className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200">
                          <CheckCircle className="h-4 w-4" /> Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {recentModules.length === 0 && (
                  <div className="text-sm text-slate-500">No recent modules yet.</div>
                )}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-2xl font-bold text-slate-800">Quick Actions</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { to: "/dashboard/evaluation/modules", icon: BookOpen, label: "View All Modules", sub: "See your courses" },
                  { to: "/dashboard/evaluation/instructors", icon: Users, label: "Evaluate Instructors", sub: "Provide feedback" },
                  { to: "/dashboard/history", icon: HistoryIcon, label: "Evaluation History", sub: "Past submissions" }
                ].map((action, i) => (
                  <button key={i} onClick={() => handleNavigation(action.to)} className="group text-left w-full">
                    <div className="flex items-center p-4 rounded-xl bg-white border border-slate-100 group-hover:border-slate-300 group-hover:bg-slate-50 transition-all shadow-sm">
                      <div className="p-3 rounded-lg bg-slate-100 text-slate-600 mr-4 group-hover:bg-[#1f474d] group-hover:text-white transition-colors">
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-[#1f474d] transition-colors">{action.label}</div>
                        <div className="text-xs text-slate-400">{action.sub}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
          {loadError && (
            <div className="mt-6 text-sm text-rose-600 font-semibold">{loadError}</div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;