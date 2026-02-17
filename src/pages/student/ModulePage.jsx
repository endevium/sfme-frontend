import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { Search, BookOpen, CheckCircle, User, Clock } from "lucide-react";

const ModulePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const [modulesFromApi, setModulesFromApi] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const fetchModules = async () => {
      if (!token) {
        setLoading(false);
        return; // not logged in
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/students/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data?.detail || 'Unable to load modules');
          return;
        }
        // API may return recent_modules, modules, or enrolled_modules
        const list = data?.modules || data?.enrolled_modules || data?.recent_modules || [];
        // fetch available module evaluation forms and create a set of subject codes
        let availableModuleCodes = new Set();
        // also build a set of the student's enrolled subject codes and a map of instructor-by-code
        let completedModuleCodes = new Set();
        let enrolledSubjectCodes = new Set();
        let enrolledByCode = new Map();
        // try to read enrolled subjects from common response shapes
        const rawEnrolled = data?.enrolled_subjects || data?.student?.enrolled_subjects || null;
        if (Array.isArray(rawEnrolled)) {
          rawEnrolled.forEach(s => {
            if (!s) return;
            if (typeof s === 'string') {
              const code = String(s).trim().toUpperCase();
              if (code) enrolledSubjectCodes.add(code);
            } else if (typeof s === 'object') {
              const code = String(s.code || s.subject_code || s.module_code || '').trim().toUpperCase();
              if (code) {
                enrolledSubjectCodes.add(code);
                const instr = s.instructor || s.instructor_name || s.lecturer || s.lecturer_name || '';
                if (instr) enrolledByCode.set(code, instr);
              }
            }
          });
        }
        try {
          const formsRes = await fetch(`${API_BASE_URL}/module-evaluation-forms/`, { headers: { Authorization: `Bearer ${token}` } });
          const formsData = await formsRes.json().catch(() => []);
          if (formsRes.ok && Array.isArray(formsData)) {
            formsData.forEach(f => {
              if (f.status === 'Active') {
                const raw = (f.title || f.subject_code || '').toString();
                const code = raw.trim().toUpperCase();
                if (code) availableModuleCodes.add(code);
                if (f.is_completed) completedModuleCodes.add(code);
              }
            });
          }
        } catch  {
          // ignore form fetch errors; modules will just show no form available
        }
        // normalize minimal shape expected by this page
        const normalized = Array.isArray(list)
          ? list.map(m => {
              const code = (m.code || m.module_code || m.id || '').toString();
                const CODE = code.trim().toUpperCase();

                // Only show a form if a form exists for the subject code AND the student is enrolled in that subject
                let form_available = (
                  !!m.form_available || !!m.has_form || !!m.form_id ||
                  (availableModuleCodes.has(CODE) && enrolledSubjectCodes.has(CODE))
                );

                // Consider module-level completion flags (from different API shapes) as well
                const isCompleted = Boolean(m.is_completed || m.completed || completedModuleCodes.has(CODE));

                // If the evaluation is already completed, ensure no form is shown / start button enabled
                if (isCompleted) form_available = false;

                // Prefer instructor info from the module object, otherwise use enrolled subject's instructor (if provided)
              const instructor = m.instructor || m.instructor_name || m.lecturer || enrolledByCode.get(CODE) || '';

              return ({
                id: m.id || m.code || m.module_id || m.module || m.module_code,
                code: code,
                name: m.name || m.title || m.module_name || m.code,
                instructor: instructor,
                credits: m.credits ?? 3,
                enrolled: enrolledSubjectCodes.has(CODE),
                status: isCompleted ? 'completed' : (form_available ? 'pending' : 'unavailable'),
                description: m.description || m.summary || '',
                form_available: form_available,
              })
            })
          : [];

        setModulesFromApi(normalized);
      } catch  {
        setLoadError('Unable to reach server');
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  const sourceModules = modulesFromApi || [];
  const searchedModules = sourceModules.filter(
    (module) =>
      (module.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.instructor || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredModules = searchedModules.filter((module) => {
    if (activeTab === "all") return true;
    return module.status === activeTab;
  });

  const counts = {
    all: searchedModules.length,
    pending: searchedModules.filter(m => m.status === "pending").length,
    completed: searchedModules.filter(m => m.status === "completed").length
  };

  const ModuleCard = ({ module }) => (
    // Card: White background, soft border, and slate text
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[10px] px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600 font-bold">
              {module.code}
            </span>
            <span className={`text-xs px-2 py-1 rounded font-bold ${
              module.status === "completed" 
              ? "bg-green-100 text-green-700" 
              : "bg-amber-100 text-amber-700"
            }`}>
              {module.status === "completed" ? "Completed" : "Pending"}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-800">{module.name}</h3>
          <p className="mt-2 text-sm text-slate-500 line-clamp-2">{module.description}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600"><User className="h-4 w-4" /><span>{module.instructor || 'TBA'}</span></div>
          <div className="flex items-center gap-2 text-slate-600"><BookOpen className="h-4 w-4" /><span>{module.credits} Credits</span></div>
        </div>
        <div className="pt-2">
          {module.status === "completed" ? (
            <button className="w-full flex items-center justify-center py-2 px-4 rounded-md border border-slate-200 text-slate-400 cursor-not-allowed text-sm font-medium" disabled>
              <CheckCircle className="h-4 w-4 mr-2" /> Evaluation Completed
            </button>
          ) : !module.form_available ? (
            <button className="w-full flex items-center justify-center py-2 px-4 rounded-md border border-slate-200 text-slate-400 text-sm font-medium cursor-not-allowed" disabled>
              No Form Available
            </button>
          ) : (
            <button 
              className="w-full bg-[#1f474d] text-white py-2 px-4 rounded-md hover:bg-[#2a5d65] font-bold transition-colors text-sm" 
              onClick={() => { window.history.pushState({}, '', `/dashboard/evaluate/${module.id}`); window.dispatchEvent(new PopStateEvent('popstate')); }}
            >
              Start Evaluation
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    // Changed bg-[#0d1b2a] to bg-slate-50 and text-white to text-slate-900
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="modules" />

        <main className="flex-1 overflow-y-auto px-6 py-12">
          <div className="container mx-auto max-w-6xl">
            {/* Page Title - Changed color to your brand teal */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#1f474d] tracking-tight">My Modules</h1>
              <p className="text-slate-500 mt-2 text-lg">Manage and evaluate your enrolled courses</p>
            </div>

            {/* Search Bar - White background with slate border */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by module name, code, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1f474d]"
                />
              </div>
            </div>

            {/* Pill Tabs - Light theme styling */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center p-1.5 bg-slate-200/50 rounded-full border border-slate-200">
                {['all', 'pending', 'completed'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-1.5 rounded-full text-sm font-bold transition-all duration-200 capitalize ${
                      activeTab === tab ? "bg-white text-[#1f474d] shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab} ({counts[tab]})
                  </button>
                ))}
              </div>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading ? (
                <div className="col-span-full py-20 text-center">
                  <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">Loading modules...</h3>
                </div>
              ) : loadError ? (
                <div className="col-span-full py-20 text-center">
                  <Clock className="h-12 w-12 text-red-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">Error loading modules</h3>
                  <p className="text-slate-500">{loadError}</p>
                </div>
              ) : filteredModules.length > 0 ? (
                filteredModules.map((module) => <ModuleCard key={module.id} module={module} />)
              ) : (
                <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-300 rounded-xl">
                  {activeTab === "pending" && counts.pending === 0 ? (
                    <><CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4 opacity-40" /><h3 className="text-lg font-bold text-slate-800">All caught up!</h3><p className="text-slate-500">No evaluations waiting.</p></>
                  ) : (
                    <><Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" /><h3 className="text-lg font-bold text-slate-800">No modules found</h3><p className="text-slate-500">Try a different search.</p></>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ModulePage;