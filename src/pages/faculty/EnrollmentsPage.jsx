import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Search, Clock3, CheckCircle2, X, CalendarDays, Check } from 'lucide-react';
import { getAccessToken } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const EnrollmentsPage = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [pendingRows, setPendingRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState(null);

  const toDisplayDate = useCallback((value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString();
  }, []);

  const parseError = async (response, fallback) => {
    const data = await response.json().catch(() => null);
    if (!data) return fallback;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    return fallback;
  };

  const mapEnrollmentRow = useCallback((item) => {
    return {
      id: item?.id,
      name: item?.student_name || 'Unknown Student',
      studentId: item?.student_number || String(item?.student || ''),
      email: item?.student_email || 'No email',
      subjectCode: item?.subject_code || 'N/A',
      subjectName: item?.subject_name || 'N/A',
      date: toDisplayDate(item?.requested_at),
      approvalDate: toDisplayDate(item?.approved_at || item?.updated_at || item?.decided_at),
      status: item?.approved ? 'Approved' : 'Pending',
      classroomCode: item?.classroom_code || '',
    };
  }, [toDisplayDate]);

  const loadEnrollments = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const [pendingRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/classrooms/enrollments/pending/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/classrooms/enrollments/history/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!pendingRes.ok) {
        setError(await parseError(pendingRes, 'Unable to load enrollments'));
        setPendingRows([]);
      } else {
        const pendingData = await pendingRes.json().catch(() => []);
        const pendingList = Array.isArray(pendingData) ? pendingData : pendingData?.results || [];
        setPendingRows(pendingList.map(mapEnrollmentRow));
      }

      if (!historyRes.ok) {
        setError((prev) => prev || 'Unable to load enrollment history');
        setHistoryRows([]);
      } else {
        const historyData = await historyRes.json().catch(() => []);
        const historyList = Array.isArray(historyData) ? historyData : historyData?.results || [];
        setHistoryRows(historyList.map((item) => ({ ...mapEnrollmentRow(item), status: 'Approved' })));
      }
    } catch {
      setError('Unable to reach server');
      setPendingRows([]);
      setHistoryRows([]);
    } finally {
      setLoading(false);
    }
  }, [mapEnrollmentRow]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  const handleDecision = async (enrollmentId, approve) => {
    const token = getAccessToken();
    if (!token || !enrollmentId) return;

    setSubmittingId(enrollmentId);
    try {
      const res = await fetch(`${API_BASE_URL}/classrooms/enrollments/decision/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enrollment_id: enrollmentId, approve }),
      });

      if (!res.ok) {
        setError(await parseError(res, 'Unable to update enrollment'));
        return;
      }

      const acted = pendingRows.find((row) => row.id === enrollmentId);
      if (acted) {
        const nextStatus = approve ? 'Approved' : 'Rejected';
        setHistoryRows((prev) => [{ ...acted, status: nextStatus }, ...prev]);
      }

      setPendingRows((prev) => prev.filter((row) => row.id !== enrollmentId));
    } catch {
      setError('Unable to update enrollment right now');
    } finally {
      setSubmittingId(null);
    }
  };

  const pendingCount = pendingRows.length;
  const approvedCount = historyRows.filter((item) => item.status === 'Approved').length;
  const rejectedCount = historyRows.filter((item) => item.status === 'Rejected').length;

  const filteredPending = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pendingRows;
    return pendingRows.filter((item) =>
      [item.name, item.studentId, item.email, item.subjectCode, item.subjectName]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [search, pendingRows]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return historyRows;
    return historyRows.filter((item) =>
      [item.name, item.studentId, item.email, item.subjectCode, item.subjectName, item.status]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [search, historyRows]);

  const rows = activeTab === 'pending' ? filteredPending : filteredHistory;

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="faculty" activeItem="enrollments" />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[#0f2f57] tracking-tight">Enrollments</h1>
              <p className="text-slate-600 mt-2 text-lg">Manage student enrollment requests for your classrooms</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center">
                  <Clock3 size={20} />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Pending Requests</p>
                  <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{pendingCount}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Approved</p>
                  <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{approvedCount}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center">
                  <X size={20} />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Rejected</p>
                  <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{rejectedCount}</p>
                </div>
              </div>
            </div>

            <div className="relative mb-6 bg-white border border-slate-200 rounded-2xl p-4">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, ID, or subject..."
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
              />
            </div>

            <div className="mb-6 overflow-x-auto">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 rounded-full border border-slate-200 shadow-inner min-w-max">
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending Approvals ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  History ({historyRows.length})
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                {error}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-slate-900">
                {activeTab === 'pending' ? 'Pending Approvals' : 'Enrollment History'}
              </h2>
              <p className="text-slate-500 text-sm mt-1 mb-6">
                {activeTab === 'pending'
                  ? 'Review and approve student enrollment requests'
                  : 'View previous enrollment decisions'}
              </p>

              {activeTab === 'pending' ? (
                <div className="grid grid-cols-[2.1fr_1.9fr_1.2fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-slate-700 border-b border-slate-200">
                  <div>Name</div>
                  <div>Subject</div>
                  <div>Req Date</div>
                  <div className="text-right">Actions</div>
                </div>
              ) : (
                <div className="grid grid-cols-[2fr_1.8fr_1.1fr_1.1fr_1fr] gap-4 px-4 py-3 text-sm font-semibold text-slate-700 border-b border-slate-200">
                  <div>Name</div>
                  <div>Subject</div>
                  <div>Req Date</div>
                  <div>Approval Date</div>
                  <div>Status</div>
                </div>
              )}

              {loading ? (
                <div className="p-10 text-center text-slate-500 text-base">Loading enrollments...</div>
              ) : rows.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-base">No records found.</div>
              ) : (
                rows.map((row) => (
                  activeTab === 'pending' ? (
                    <div key={row.id} className="grid grid-cols-[2.1fr_1.9fr_1.2fr_1fr] gap-4 px-4 py-5 border-b border-slate-200 last:border-b-0">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{row.name}</p>
                        <p className="text-sm text-slate-600">{row.studentId}</p>
                        <p className="text-sm text-slate-600 truncate">{row.email}</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{row.subjectCode}</p>
                        <p className="text-sm text-slate-600">{row.subjectName}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays size={18} className="text-slate-500" />
                        {row.date}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={submittingId === row.id}
                          onClick={() => handleDecision(row.id, true)}
                          className="w-12 h-12 rounded-xl border border-emerald-300 text-emerald-600 flex items-center justify-center hover:bg-emerald-50 disabled:opacity-60"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          type="button"
                          disabled={submittingId === row.id}
                          onClick={() => handleDecision(row.id, false)}
                          className="w-12 h-12 rounded-xl border border-rose-300 text-rose-600 flex items-center justify-center hover:bg-rose-50 disabled:opacity-60"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={row.id} className="grid grid-cols-[2fr_1.8fr_1.1fr_1.1fr_1fr] gap-4 px-4 py-5 border-b border-slate-200 last:border-b-0">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{row.name}</p>
                        <p className="text-sm text-slate-600">{row.studentId}</p>
                        <p className="text-sm text-slate-600 truncate">{row.email}</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{row.subjectCode}</p>
                        <p className="text-sm text-slate-600">{row.subjectName}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays size={16} className="text-slate-500" />
                        {row.date}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays size={16} className="text-slate-500" />
                        {row.approvalDate}
                      </div>
                      <div className="flex items-center">
                        <span className={`text-sm font-semibold ${row.status === 'Approved' ? 'text-emerald-600' : row.status === 'Rejected' ? 'text-rose-600' : 'text-slate-500'}`}>
                          {row.status}
                        </span>
                      </div>
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EnrollmentsPage;
