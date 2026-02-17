import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { BookOpen, Users, Star, TrendingUp, MessageSquare, ChevronRight } from 'lucide-react';

const FacultyDashboard = () => {
  const [facultyInfo] = useState({
    name: "Prof. Ana Reyes",
    department: "Computer Science",
    specialization: "Web Development",
    overallRating: 4.7,
    totalEvaluations: 145,
    totalStudents: 135,
  });

  const [modules] = useState([
    {
      id: "mod_001",
      code: "CS403",
      name: "Web Development",
      semester: "2nd Semester 2025-2026",
      students: 45,
      evaluations: 42,
      averageRating: 4.8,
      responseRate: 93,
      status: "active"
    },
    {
      id: "mod_002",
      code: "CS406",
      name: "Computer Networks",
      semester: "2nd Semester 2025-2026",
      students: 42,
      evaluations: 38,
      averageRating: 4.7,
      responseRate: 90,
      status: "active"
    },
    {
      id: "mod_003",
      code: "CS401",
      name: "Advanced Database Systems",
      semester: "2nd Semester 2025-2026",
      students: 48,
      evaluations: 45,
      averageRating: 4.6,
      responseRate: 94,
      status: "active"
    },
  ]);

  const handleViewDetails = (moduleId) => alert(`Viewing detailed feedback for ${moduleId}`);

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="faculty" activeItem="dashboard" onLogout={() => {}} />

        {/* MAIN CONTENT SCROLL AREA */}
        <main className="flex-1 overflow-y-auto">
          
          {/* WELCOME BANNER (White Theme Gradient) */}
          <section className="bg-white border-b border-slate-200 py-10 px-8">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1f474d]">Welcome, {facultyInfo.name}</h1>
                <p className="text-slate-500 mt-1">{facultyInfo.department} • {facultyInfo.specialization}</p>
                <p className="text-xs mt-2 font-semibold text-slate-400 uppercase tracking-wider">
                  Employee ID: <span className="text-amber-600">{facultyInfo.employeeId}</span>
                </p>
              </div>
              <div className="hidden md:block p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <TrendingUp className="text-[#1f474d]" size={32} />
              </div>
            </div>
          </section>

          <div className="max-w-6xl mx-auto px-8 py-8">
            
            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Overall Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-4xl font-bold text-amber-500">{facultyInfo.overallRating}</p>
                  <Star className="text-amber-500 fill-amber-500" size={24} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Total Students</p>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-slate-800">{facultyInfo.totalStudents}</p>
                  <Users className="text-blue-500" size={32} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Evaluations</p>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-slate-800">{facultyInfo.totalEvaluations}</p>
                  <MessageSquare className="text-emerald-500" size={32} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase mb-2">Response Rate</p>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-purple-600">92%</p>
                  <TrendingUp className="text-purple-600" size={32} />
                </div>
              </div>
            </div>

            {/* MODULES SECTION */}
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Your Modules</h2>
                <p className="text-slate-500 text-sm mt-1">Select a module to view detailed ratings and feedback</p>
              </div>
              <span className="bg-[#1f474d]/10 text-[#1f474d] px-4 py-1.5 rounded-full text-xs font-bold">
                {modules.length} Active Modules
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {modules.map((module) => (
                <div key={module.id} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
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
                          <Star key={s} size={18} className={`${s <= Math.floor(module.averageRating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                        ))}
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{module.averageRating}</span>
                      <span className="text-slate-400 text-sm font-medium">/ 5.0</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8 text-center border-t border-slate-100 pt-6">
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

                  <button 
                    onClick={() => handleViewDetails(module.id)}
                    className="w-full flex items-center justify-center gap-2 bg-[#1f474d] text-white py-3 rounded-xl font-bold hover:bg-[#2a5d65] transition-all shadow-lg shadow-slate-200"
                  >
                    View Detailed Feedback
                    <ChevronRight size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* RECENT HIGHLIGHTS */}
            <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl">
                <p className="font-bold text-emerald-700 text-sm">Strong Performance</p>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  Web Development received 4.8/5.0 for content clarity.
                </p>
              </div>
              <div className="p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
                <p className="font-bold text-blue-700 text-sm">High Engagement</p>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  92% average response rate shows student interest.
                </p>
              </div>
              <div className="p-5 bg-purple-50 border-l-4 border-purple-500 rounded-r-xl">
                <p className="font-bold text-purple-700 text-sm">Clear Explanations</p>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                  Students praised the teaching methodology.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FacultyDashboard;