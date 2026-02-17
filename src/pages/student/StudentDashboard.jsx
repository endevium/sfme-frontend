import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';

import { 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  History as HistoryIcon, 
  Users,
} from "lucide-react";

const StudentDashboard = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const [studentName, setStudentName] = useState('Student');
  const [stats, setStats] = useState([
    { title: "Total Modules", value: "0", description: "Enrolled this semester", icon: BookOpen, color: "bg-blue-100 text-blue-600" },
    { title: "Instructors", value: "0", description: "To evaluate", icon: Users, color: "bg-purple-100 text-purple-600" },
    { title: "Completed", value: "0", description: "Total evaluations done", icon: CheckCircle, color: "bg-green-100 text-green-600" },
    { title: "Pending", value: "0", description: "Awaiting feedback", icon: AlertCircle, color: "bg-amber-100 text-amber-600" },
  ]);
  const [recentModules, setRecentModules] = useState([]);
  const [loadError, setLoadError] = useState('');
  const handleNavigation = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const fetchDashboard = useCallback(async () => {
    setLoadError('');
    // Prefer sessionStorage (App migrates persistent tokens into sessionStorage)
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

    if (!token) {
      setLoadError('Please log in to view your dashboard.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/students/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setLoadError(data?.detail || 'Unable to load dashboard data.');
        return;
      }

      const name = `${data?.student?.firstname || ''} ${data?.student?.lastname || ''}`.trim();
      setStudentName(name || 'Student');

      const apiStats = data?.stats || {};
      setStats([
        { title: "Total Modules", value: String(apiStats.total_modules ?? 0), description: "Enrolled this semester", icon: BookOpen, color: "bg-blue-100 text-blue-600" },
        { title: "Instructors", value: String(apiStats.instructors ?? 0), description: "To evaluate", icon: Users, color: "bg-purple-100 text-purple-600" },
        { title: "Completed", value: String(apiStats.completed ?? 0), description: "Total evaluations done", icon: CheckCircle, color: "bg-green-100 text-green-600" },
        { title: "Pending", value: String(apiStats.pending ?? 0), description: "Awaiting feedback", icon: AlertCircle, color: "bg-amber-100 text-amber-600" },
      ]);

      const enrolled = data?.student?.enrolled_subjects || data?.enrolled_subjects || [];
      const instructorByCode = new Map();
      if (Array.isArray(enrolled)) {
        enrolled.forEach(s => {
          const code = (s?.code || '').toString().trim().toUpperCase();
          const inst = (s?.instructor_name || '').toString().trim();
          if (code && inst) instructorByCode.set(code, inst);
        });
      }

      const recent = Array.isArray(data?.recent_modules) ? data.recent_modules : [];
      const enriched = recent.map(m => {
        const codeKey = (
                  m?.code ||
                  m?.module_code ||
                  m?.subject_code ||
                  m?.subject?.code ||
                  m?.module?.code ||
                  '' // do NOT use id as primary code key
                ).toString().trim().toUpperCase();
        const instFromEnrollment = instructorByCode.get(codeKey);
        
        const apiInstructor = (m?.instructor || m?.instructor_name || '').toString().trim();
        const apiInstructorIsTba = !apiInstructor || apiInstructor.toUpperCase() === 'TBA';
        return {
          ...m,
          instructor: (apiInstructorIsTba ? '' : apiInstructor) || instFromEnrollment || 'TBA',
        };
      });
      setRecentModules(enriched);
    } catch {
      setLoadError('Unable to reach the server. Please try again.');
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    // Change 1: background to bg-slate-50 or bg-white and text to slate-900
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="dashboard" />
        
        <main className="flex-1 overflow-y-auto px-6 py-12">
          <div className="container mx-auto max-w-6xl space-y-12">
            
            {/* Welcome Section */}
            <header>
              <h1 className="text-4xl font-bold text-slate-900">Welcome back, <span className="text-[#1f474d]">{studentName || 'Student'}!</span></h1>
              <p className="text-slate-500 mt-2 text-lg">Here's your evaluation overview for this semester</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  // Change 2: Cards to bg-white with soft shadows and slate borders
                  <div key={stat.title} className="bg-white p-6 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</h3>
                      <div className={`p-2 rounded-lg ${stat.color}`}><Icon className="h-5 w-5" /></div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                    <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
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
                  onClick={() => handleNavigation('/dashboard/modules')}
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
                  { to: "/dashboard/modules", icon: BookOpen, label: "View All Modules", sub: "See your courses" },
                  { to: "/dashboard/instructors", icon: Users, label: "Evaluate Instructors", sub: "Provide feedback" },
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