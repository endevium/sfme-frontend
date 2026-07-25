import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Plus, Users, CircleCheck, Clock3 } from 'lucide-react';

// Helpers to extract schedule/room from various API shapes (string, nested objects, or separate fields)
const extractSchedule = (item) => {
  if (!item) return 'TBA';
  const direct = item?.schedule || item?.classroom?.schedule || item?.module?.schedule || item?.time_slot || item?.class_schedule;
  if (direct && typeof direct === 'string' && direct.trim()) return direct.trim();

  const schedObj = item?.schedule_obj || item?.classroom?.schedule_obj || item?.module?.schedule_obj || item?.schedule_info;
  if (schedObj && typeof schedObj === 'object') {
    const days = Array.isArray(schedObj.days) ? schedObj.days.join(',') : (schedObj.days || schedObj.day || '');
    const start = schedObj.start_time || schedObj.start || '';
    const end = schedObj.end_time || schedObj.end || '';
    if (days && start && end) return `${days} ${start} - ${end}`;
    if (start && end) return `${start} - ${end}`;
  }

  const daysRaw = item?.days || item?.classroom?.days || item?.module?.days || item?.day;
  const start = item?.start_time || item?.classroom?.start_time || item?.module?.start_time || item?.start;
  const end = item?.end_time || item?.classroom?.end_time || item?.module?.end_time || item?.end;
  if (daysRaw && start && end) return `${daysRaw} ${start} - ${end}`;
  if (start && end) return `${start} - ${end}`;

  return 'TBA';
};

const extractRoom = (item) => {
  return item?.room || item?.classroom?.room || item?.module?.room || item?.location || 'TBA';
};

const ClassroomPage = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  const [classrooms, setClassrooms] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeView, setActiveView] = useState('active');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const getToken = () => sessionStorage.getItem('authToken') || localStorage.getItem('authToken');

  const fetchClassrooms = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setLoadError('Not logged in');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      const res = await fetch(`${API_BASE_URL}/students/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLoadError(data?.detail || 'Unable to load classrooms');
        setClassrooms([]);
        return;
      }

      const list = data?.classrooms || data?.modules || data?.enrolled_modules || [];
      const pendingApplications = data?.applications || [];
      setClassrooms(Array.isArray(list) ? list : []);
      setApplications(Array.isArray(pendingApplications) ? pendingApplications : []);
    } catch {
      setLoadError('Unable to reach server');
      setClassrooms([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleJoinClassroom = async () => {
    const token = getToken();
    if (!token) {
      setJoinError('Session expired. Please log in again.');
      return;
    }

    const classroomCode = joinCode.trim().toUpperCase();
    if (!classroomCode) {
      setJoinError('Please enter a class code.');
      return;
    }

    if (!/^[A-Z0-9]+$/.test(classroomCode)) {
      setJoinError('Class code can only contain letters and numbers.');
      return;
    }

    setJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`${API_BASE_URL}/classrooms/join/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ classroom_code: classroomCode }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJoinError(data?.detail || data?.error || 'Unable to join classroom.');
        return;
      }

      setIsJoinModalOpen(false);
      setJoinCode('');
      setJoinError('');
      fetchClassrooms();
    } catch {
      setJoinError('Unable to reach server.');
    } finally {
      setJoining(false);
    }
  };

  const normalizedClassrooms = useMemo(() => {
    return classrooms.map((item, index) => {
      const code = item?.subject_code || item?.code || item?.module_code || '';
      const name = item?.module_name || item?.name || item?.title || code || `Classroom ${index + 1}`;
      const instructor = item?.instructor || item?.instructor_name || item?.lecturer || 'Instructor TBA';
      const section = item?.block || item?.classroom_code || item?.section || `CS-${index + 1}A`;
      const schedule = extractSchedule(item);
      const room = extractRoom(item);
      const students = Number(item?.students_count) || 0;

      const initials = String(instructor)
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'CL';

      return {
        id: item?.id || `${code}-${index}`,
        classroomId: item?.id || null,
        classCode: item?.classroom_code || item?.class_code || '',
        code: code || `CS${400 + index + 1}`,
        section,
        title: name,
        instructor,
        schedule,
        room,
        students,
        initials,
      };
    });
  }, [classrooms]);

  const normalizedApplications = useMemo(() => {
    return applications.map((item, index) => {
      const requestedDate = item?.requested_at ? new Date(item.requested_at) : null;
      const requestedAt = requestedDate && !Number.isNaN(requestedDate.getTime())
        ? requestedDate.toLocaleDateString()
        : 'N/A';

      return {
        id: item?.enrollment_id || `${item?.classroom_code || 'APP'}-${index}`,
        code: item?.subject_code || 'N/A',
        section: item?.block || item?.section || '',
        title: item?.module_name || 'Unknown Module',
        classroomCode: item?.classroom_code || 'N/A',
        instructor: item?.instructor || 'Instructor TBA',
        schedule: extractSchedule(item),
        room: extractRoom(item),
        students: Number(item?.students_count) || 0,
        requestedAt,
        status: item?.status || 'Pending',
      };
    });
  }, [applications]);

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="classroom" />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[#0f2f57] tracking-tight">Classrooms</h1>
                <p className="text-slate-600 mt-2 text-lg">Manage your enrolled classrooms</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setJoinError('');
                  setJoinCode('');
                  setIsJoinModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#2a5d65] transition-colors"
              >
                <Plus size={16} strokeWidth={2.6} />
                Join Classroom
              </button>
            </div>

            <div className="mt-1 mb-2 inline-flex items-center rounded-full bg-slate-200/60 p-1 border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveView('active')}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                  activeView === 'active'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CircleCheck size={15} strokeWidth={2.25} />
                Active ({normalizedClassrooms.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveView('applied')}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                  activeView === 'applied'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock3 size={15} strokeWidth={2.25} />
                Applied ({normalizedApplications.length})
              </button>
            </div>

            {activeView === 'active' ? (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {loading ? (
                <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-sm">
                  Loading classrooms...
                </div>
              ) : loadError ? (
                <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
                  <p className="text-slate-800 font-semibold">Error loading classrooms</p>
                  <p className="text-slate-500 mt-2">{loadError}</p>
                </div>
              ) : normalizedClassrooms.length > 0 ? (
                normalizedClassrooms.map((classroom) => (
                  <div
                    key={classroom.id}
                    className="h-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 font-bold uppercase">
                        {classroom.code}
                      </span>
                      <span className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-bold uppercase">
                        {classroom.section}
                      </span>
                    </div>

                    <h1 className="text-xl leading-tight font-bold text-slate-900 tracking-tight">{classroom.title}</h1>
                    <p className="text-sm text-slate-500 mt-1">{classroom.instructor}</p>

                    <div className="mt-6 space-y-2.5 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold">Schedule:</span>{' '}
                        <span>{classroom.schedule}</span>
                      </p>
                      <p>
                        <span className="font-semibold">Room:</span>{' '}
                        <span>{classroom.room}</span>
                      </p>
                      <p className="inline-flex items-center gap-2 text-slate-700 font-semibold">
                        <Users size={14} className="text-slate-400" />
                        {classroom.students} students
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextPath = classroom.classroomId
                          ? `/dashboard/classroom/students?classroom_id=${encodeURIComponent(classroom.classroomId)}`
                          : '/dashboard/classroom/students';
                        window.history.pushState({ classroom }, '', nextPath);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="w-full mt-auto h-11 inline-flex items-center justify-center px-4 rounded-xl bg-[#1f474d] text-white text-sm font-semibold hover:bg-[#2a5d65] transition-colors"
                    >
                      View Classroom
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
                  <p className="text-slate-700 text-xl font-semibold">No classrooms yet</p>
                  <p className="text-slate-500 mt-2">Join a classroom to get started.</p>
                </div>
              )}
              </div>
            ) : (
              <div className="mt-6">
                {normalizedApplications.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-sm">No pending applications.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {normalizedApplications.map((application) => (
                      <div key={application.id} className="h-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="font-mono text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 font-bold uppercase">
                            {application.code}
                          </span>
                          {application.section ? (
                            <span className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-bold uppercase">
                              {application.section}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase">
                            <Clock3 size={11} /> Pending Approval
                          </span>
                        </div>

                        <h3 className="text-xl leading-tight font-bold text-slate-900 tracking-tight">{application.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{application.instructor}</p>

                        <div className="mt-6 space-y-2.5 text-sm text-slate-700">
                          <p>
                            <span className="font-semibold">Schedule:</span>{' '}
                            <span>{application.schedule}</span>
                          </p>
                          <p>
                            <span className="font-semibold">Room:</span>{' '}
                            <span>{application.room}</span>
                          </p>
                          {application.students > 0 ? (
                            <p className="inline-flex items-center gap-2 text-slate-700 font-semibold">
                              <Users size={14} className="text-slate-400" />
                              {application.students} students
                            </p>
                          ) : null}
                          <p className="inline-flex items-center gap-2 text-slate-700">
                            <Clock3 size={14} className="text-slate-400" />
                            Applied on {application.requestedAt}
                          </p>
                        </div>

                        <div className="mt-auto pt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                          <p className="font-bold">Waiting for instructor approval.</p>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {isJoinModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="px-6 pt-6 pb-6">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f2f57] tracking-tight">Join Classroom</h2>
                  <p className="text-slate-500 mt-1 text-sm">Enter the class code provided by your instructor</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1"
                  aria-label="Close join classroom modal"
                >
                  ×
                </button>
              </div>

              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Class Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  const sanitizedValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setJoinCode(sanitizedValue);
                  if (joinError) setJoinError('');
                }}
                placeholder="e.g. 1234B678"
                maxLength={8}
                pattern="[A-Za-z0-9]{8}"
                className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-slate-50 text-center text-base font-mono font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1f474d]/30 focus:border-[#1f474d]"
              />
              <p className="text-slate-400 text-xs mt-1.5">Class codes are 8 characters long</p>

              {joinError && (
                <p className="text-sm text-rose-600 font-medium mt-2">{joinError}</p>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleJoinClassroom}
                  disabled={joining || joinCode.trim().length !== 8}
                  className="flex-1 h-11 rounded-xl bg-[#1f474d] text-white text-sm font-semibold hover:bg-[#2a5d65] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {joining ? 'Joining...' : 'Join Classroom'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomPage;
