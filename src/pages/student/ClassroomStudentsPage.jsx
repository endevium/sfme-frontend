import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { ArrowLeft, Users, Clock3, MapPin, GraduationCap, Search } from 'lucide-react';
import { getToken } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const initialsFromName = (name) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';

const normalizeStudent = (student, index) => ({
  id: student?.student_id || student?.id || `student-${index}`,
  name: `${student?.firstname || ''} ${student?.lastname || ''}`.trim() || student?.name || 'Unknown Student',
  studentNumber: student?.student_number || student?.student_id || 'N/A',
  email: student?.email || 'No email',
});

const ClassroomStudentsPage = () => {
  const [search, setSearch] = useState('');
  const [dbClassroom, setDbClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingClassroom, setLoadingClassroom] = useState(true);
  const [classroomError, setClassroomError] = useState('');
  const classroom = useMemo(() => window.history.state?.classroom || {}, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setClassroomError('Session expired. Please login again.');
      setLoadingClassroom(false);
      return;
    }

    const fetchClassroomStudents = async (classroomId) => {
      const res = await fetch(`${API_BASE_URL}/classrooms/${classroomId}/students/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || 'Unable to load classroom details.');
      }

      setDbClassroom(data || null);
      setStudents(Array.isArray(data?.students) ? data.students : []);
    };

    const fetchClassroomFromDb = async () => {
      setLoadingClassroom(true);
      setClassroomError('');
      try {
        const fromQuery = Number(new URLSearchParams(window.location.search).get('classroom_id') || 0);
        const directId = Number(classroom?.classroomId || fromQuery || 0);
        if (directId) {
          await fetchClassroomStudents(directId);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/students/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || 'Unable to load classroom details.');

        const list = data?.classrooms || data?.modules || data?.enrolled_modules || [];
        const byCode = list.find(
          (item) => String(item?.classroom_code || '').toUpperCase() === String(classroom?.classCode || '').toUpperCase()
        );
        const bySubjectAndBlock = list.find(
          (item) =>
            String(item?.subject_code || item?.code || '').toUpperCase() === String(classroom?.code || '').toUpperCase() &&
            String(item?.block || item?.section || '').toUpperCase() === String(classroom?.section || '').toUpperCase()
        );

        const target = byCode || bySubjectAndBlock || null;
        if (target) {
          setDbClassroom(target);
          setStudents(Array.isArray(target?.students) ? target.students : []);
        }
      } catch (err) {
        setClassroomError(err?.message || 'Unable to reach server.');
        setDbClassroom(null);
        setStudents([]);
      } finally {
        setLoadingClassroom(false);
      }
    };

    fetchClassroomFromDb();
  }, [classroom?.classCode, classroom?.classroomId, classroom?.code, classroom?.section]);

  const classInfo = useMemo(() => {
    const dbCode = dbClassroom?.subject_code;
    const dbSection = dbClassroom?.block || dbClassroom?.section;
    const dbTitle = dbClassroom?.module_name || dbClassroom?.title || dbClassroom?.name;
    const dbClassCode = dbClassroom?.classroom_code;

    return {
      subjectCode: dbCode || classroom.code || 'ITE 384',
      section: dbSection || classroom.section || 'BSIT-3',
      title: dbTitle || classroom.title || 'Classroom',
      instructor: dbClassroom?.instructor || dbClassroom?.instructor_name || classroom.instructor || 'Instructor TBA',
      schedule: dbClassroom?.schedule || classroom.schedule || 'TBA',
      room: dbClassroom?.room || classroom.room || 'TBA',
      classCode: dbClassCode || classroom.classCode || 'N/A',
      students: Number(dbClassroom?.total_students ?? classroom.students ?? students.length) || students.length,
    };
  }, [classroom, dbClassroom, students.length]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const normalized = students.map((student, index) => normalizeStudent(student, index));

    if (!query) return normalized;
    return normalized.filter((student) =>
      [student.name, student.studentNumber, student.email].join(' ').toLowerCase().includes(query)
    );
  }, [search, students]);

  const goBack = () => {
    window.history.pushState({}, '', '/dashboard/classroom');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="classroom" />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="container mx-auto max-w-7xl">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-300"
            >
              <ArrowLeft size={14} />
              Back to Classrooms
            </button>

            <div className="mt-4 rounded-2xl p-6 text-white bg-gradient-to-r from-blue-600 to-blue-700 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
              <div>
                {loadingClassroom && <p className="text-sm text-blue-100 mb-2">Loading classroom details...</p>}
                {!loadingClassroom && classroomError && <p className="text-sm text-rose-100 mb-2">{classroomError}</p>}
                <h1 className="text-4xl leading-tight font-semibold tracking-tight">{classInfo.title}</h1>
                <p className="mt-2 text-blue-100 text-lg">{classInfo.classCode}</p>
              </div>

              <div className="w-full max-w-md bg-white/10 border border-white/15 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-300 to-blue-200 text-blue-900 font-bold flex items-center justify-center border border-white/40">
                  {initialsFromName(classInfo.instructor)}
                </div>
                <div className="min-w-0">
                  <p className="text-blue-100">Instructor</p>
                  <p className="text-white text-2xl font-semibold truncate">{classInfo.instructor}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center"><Users size={20} /></div>
                <div>
                  <p className="text-slate-600 text-sm">Students</p>
                  <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{classInfo.students}</p>
                  <p className="text-xs text-slate-400 mt-2">Total enrolled students</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center"><Clock3 size={20} /></div>
                <div>
                  <p className="text-slate-600 text-sm">Schedule</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{classInfo.schedule}</p>
                  <p className="text-xs text-slate-400 mt-2">Class meeting time</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center"><MapPin size={20} /></div>
                <div>
                  <p className="text-slate-600 text-sm">Room</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{classInfo.room}</p>
                  <p className="text-xs text-slate-400 mt-2">Assigned classroom</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center"><GraduationCap size={20} /></div>
                <div>
                  <p className="text-slate-600 text-sm">Section</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{classInfo.section}</p>
                  <p className="text-xs text-slate-400 mt-2">Class section code</p>
                </div>
              </div>
            </div>

            <div className="mt-5 bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Users size={18} className="text-slate-700" />
                <h2 className="text-3xl font-semibold text-slate-900">Classmates</h2>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-md bg-[#020824] text-white font-semibold">{classInfo.students}</span>
              </div>
              <p className="text-slate-500">Students enrolled in this class</p>

              <div className="relative mt-4 bg-white border border-slate-200 rounded-2xl p-4">
                <Search size={18} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, student ID, or email..."
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="border border-slate-200 rounded-2xl p-5 flex items-start gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-300">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-semibold text-sm flex items-center justify-center shrink-0">
                      {initialsFromName(student.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xl font-semibold text-slate-900 truncate">{student.name}</p>
                      <p className="text-sm text-slate-600">{student.studentNumber}</p>
                      <p className="text-sm text-slate-600 truncate mt-1">{student.email}</p>
                    </div>
                  </div>
                ))}
              </div>

              {!loadingClassroom && filteredStudents.length === 0 && (
                <div className="mt-4 text-slate-500">No classmates found for this classroom.</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ClassroomStudentsPage;
