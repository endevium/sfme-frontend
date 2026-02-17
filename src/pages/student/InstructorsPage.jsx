import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Users, Clock } from 'lucide-react';

const InstructorsPage = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const [enrolledModules, setEnrolledModules] = useState([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState([]);
  const [instructorForms, setInstructorForms] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

    const fetchInstructors = async () => {
      if (!token) {
        setLoadError('Not logged in');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');

      try {
        // 1) student => which instructors the student actually has
        const meRes = await fetch(`${API_BASE_URL}/students/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json().catch(() => ({}));
        if (!meRes.ok) {
          setLoadError(meData?.detail || 'Unable to load student profile');
          setEnrolledModules([]);
          setEnrolledSubjects([]);
          setInstructorForms([]);
          return;
        }
        const modules = meData?.enrolled_modules || meData?.modules || meData?.recent_modules || [];
        setEnrolledModules(Array.isArray(modules) ? modules : []);

        const subjects = meData?.student?.enrolled_subjects || meData?.enrolled_subjects || [];
        setEnrolledSubjects(Array.isArray(subjects) ? subjects : []);
        // 2) active instructor evaluation forms
        const formsRes = await fetch(`${API_BASE_URL}/instructor-evaluation-forms/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const formsData = await formsRes.json().catch(() => []);
        if (!formsRes.ok) {
          setLoadError('Unable to load instructor evaluation forms');
          setInstructorForms([]);
          return;
        }

        const active = Array.isArray(formsData)
          ? formsData.filter(f => f?.status === 'Active')
          : [];

        // Your serializer exposes instructor_name as "title"
        setInstructorForms(Array.isArray(formsData) ? formsData : []);
      } catch {
        setLoadError('Unable to reach server');
        setEnrolledModules([]);
        setEnrolledSubjects([]);
        setInstructorForms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, [API_BASE_URL]);

  const instructors = useMemo(() => {
    // Build set of instructors from the student's enrolled modules
    const studentInstructorNames = new Set();
    for (const s of enrolledSubjects || []) {
      const name = (s?.instructor_name || s?.instructor || '').toString().trim();
      if (name) studentInstructorNames.add(name.toUpperCase());
    }
    // Fallback only if enrolled_subjects has none (legacy data)
    if (studentInstructorNames.size === 0) {
      for (const m of enrolledModules || []) {
        const name =
          (m?.instructor || m?.instructor_name || m?.lecturer || '').toString().trim();
        if (name) studentInstructorNames.add(name.toUpperCase());
      }
    }

    // Map forms by instructor name (title)
    const formsByName = new Map();
    for (const f of instructorForms || []) {
      const name = (f?.title || '').toString().trim(); // title == instructor_name
      if (name) formsByName.set(name.toUpperCase(), f);
    }

    // Intersect: only show instructors the student has AND that have an active form
    const out = [];
    for (const upperName of studentInstructorNames) {
      const form = formsByName.get(upperName);
      if (!form) continue;
      out.push({
        name: form.title,
        instructorFormId: form.id,
        description: form.description || '',
        status: form.status || 'Unknown',
        isCompleted: !!form.is_completed,
        completedResponseId: form.completed_response_id ?? null,
      });
    }

    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [enrolledModules, enrolledSubjects, instructorForms]);

  const InstructorCard = ({ instructor }) => {
    const isActive = String(instructor.status || '').toLowerCase() === 'active';
    const isCompleted = !!instructor.isCompleted;

    return (
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="w-14 h-14 bg-slate-50 rounded-full mb-4 flex items-center justify-center border border-slate-100">
          <Users className="h-6 w-6 text-slate-400" />
        </div>
  
        <h3 className="text-lg font-bold text-slate-800">{instructor.name}</h3>

        <div className="mt-2">
          <span
            className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
              isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}
          >
            {isCompleted ? 'Completed' : 'Pending'}
          </span>
        </div>

        {instructor.description ? (
          <p className="text-slate-500 text-sm mt-1 line-clamp-3">{instructor.description}</p>
        ) : (
          <p className="text-slate-400 text-sm mt-1">Instructor evaluation form is available.</p>
        )}
  
        <div className="pt-5">
          <button
            disabled={!isActive || isCompleted}
            className="w-full bg-[#1f474d] text-white py-2 px-4 rounded-md hover:bg-[#2a5d65] font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1f474d]"
            onClick={() => {
              if (!isActive || isCompleted) return;
              const id = instructor.instructorFormId;
              window.history.pushState({}, '', `/dashboard/evaluate-instructor/${id}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            {isCompleted ? 'Completed' : (isActive ? 'Start Evaluation' : 'No Form Available')}
          </button>
        </div>
      </div>
    );
  };
    
    

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="instructors" />

        <main className="flex-1 overflow-y-auto px-6 py-12">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-4xl font-bold text-[#1f474d] tracking-tight">Instructors</h1>
            <p className="text-slate-500 mt-2 text-lg">
              Evaluate your instructors (only those with active instructor evaluation forms).
            </p>

            <div className="mt-10">
              {loading ? (
                <div className="py-20 text-center">
                  <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">Loading instructors...</h3>
                </div>
              ) : loadError ? (
                <div className="py-20 text-center">
                  <h3 className="text-lg font-bold text-slate-800">Error loading instructors</h3>
                  <p className="text-slate-500 mt-2">{loadError}</p>
                </div>
              ) : instructors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instructors.map(i => (
                    <InstructorCard key={i.instructorFormId} instructor={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 p-10 rounded-2xl text-center shadow-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto mb-6 flex items-center justify-center border border-slate-100">
                      <Users className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">No Instructors Available</h3>
                    <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                      You may not have active instructor evaluation forms yet.
                    </p>
                    <button
                      onClick={() => (window.location.href = '/dashboard')}
                      className="mt-6 text-sm font-bold text-[#1f474d] hover:underline"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InstructorsPage;