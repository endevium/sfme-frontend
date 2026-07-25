import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ClipboardList,
  Download,
  Search,
  Shield,
  UserCog,
 
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const formatLogDate = (value) => {
  if (!value) return 'Unknown time';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown time';

  const dateStr = parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  });

  const timeStr = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr} ${timeStr}`;
};

const detectGroup = (log) => {
  const category = String(log?.category || '').toUpperCase();
  const action = String(log?.action || '').toUpperCase();
  const message = String(log?.message || '').toUpperCase();
  const text = `${category} ${action} ${message}`;

  if (text.includes('USER') || text.includes('ACCOUNT') || text.includes('ROLE')) return 'User Management';
  if (text.includes('FORM') || text.includes('EVALUATION') || text.includes('MODULE') || text.includes('INSTRUCTOR')) return 'Form Changes';
  if (text.includes('SYSTEM') || text.includes('CONFIG') || text.includes('SETTING') || text.includes('MAINTENANCE')) return 'Other';
  return 'Other';
};

const groupBadgeColor = (group) => {
  if (group === 'User Management') return 'bg-blue-100 text-blue-700';
  if (group === 'Form Changes') return 'bg-fuchsia-100 text-fuchsia-700';
  return 'bg-emerald-100 text-emerald-700';
};

const statusBadgeColor = (status) => {
  const value = String(status || '').toLowerCase();
  if (value.includes('fail') || value.includes('error') || value.includes('denied')) return 'bg-rose-100 text-rose-700';
  if (value.includes('warn') || value.includes('pending')) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
};

const AuditLogPage = () => {
  // Helper: find and normalize stored token from several possible keys
  const getTokenFromStorage = () => {
    const candidates = ['authToken','token','access','accessToken','jwt'];
    let raw = null;
    for (const k of candidates) {
      // Prefer sessionStorage (App migrates persistent tokens into sessionStorage)
      const v = sessionStorage.getItem(k) || localStorage.getItem(k);
      if (v) { raw = v; break; }
    }
    if (!raw) return null;
    // If it's a JSON string like '{"token":"..."}' parse it
    try {
      const maybeObj = JSON.parse(raw);
      if (maybeObj) {
        if (typeof maybeObj === 'string') {
          raw = maybeObj;
        } else if (typeof maybeObj === 'object') {
          raw = maybeObj.token || maybeObj.access || maybeObj.authToken || maybeObj.accessToken || maybeObj.jwt || Object.values(maybeObj)[0] || '';
        }
      }
    } catch {
      // not JSON, continue with raw
    }
    if (!raw) return null;
    // strip surrounding quotes that may have been double-serialized
    raw = String(raw).trim().replace(/^"|"$/g, '');
    // if it already contains the Bearer prefix, remove it (we'll add canonical prefix later)
    if (raw.toLowerCase().startsWith('bearer ')) raw = raw.split(' ').slice(1).join(' ');
    return raw || null;
  };

  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        // ensure a token exists (check sessionStorage first, then localStorage)
        const token = getTokenFromStorage();
        if (!token) {
          setLoadError('Unauthorized: no authentication token found. Please sign in.');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const res = await fetch(`${API_BASE_URL}/audit-logs/`, {
          headers,
        });

        // handle 401 explicitly to give clearer feedback
        if (res.status === 401) {
          setLoadError('Unauthorized: your session may have expired. Please sign in again.');
          return;
        }

        const data = await res.json().catch(() => []);
        if (!res.ok) {
          setLoadError(data?.detail || `Unable to load audit logs (status ${res.status}).`);
          return;
        }
        const logsList = Array.isArray(data) ? data : [];
        setLogs(logsList);

      } catch {
        setLoadError('Unable to reach the server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  const normalizedLogs = useMemo(() => {
    return logs.map((log) => ({
      ...log,
      group: detectGroup(log),
    }));
  }, [logs]);

  const stats = useMemo(() => {
    const userManagementCount = normalizedLogs.filter((log) => log.group === 'User Management').length;
    const formChangesCount = normalizedLogs.filter((log) => log.group === 'Form Changes').length;

    return {
      userManagementCount,
      formChangesCount,
      totalCount: normalizedLogs.length,
    };
  }, [normalizedLogs]);

  const filteredLogs = useMemo(() => {
    const search = query.trim().toLowerCase();

    return normalizedLogs.filter((log) => {
      const matchesTab = activeTab === 'All' || log.group === activeTab;
      const matchesSearch = !search || [
        log?.user,
        log?.role,
        log?.action,
        log?.message,
        log?.category,
        log?.status,
        log?.ip,
      ].join(' ').toLowerCase().includes(search);

      return matchesTab && matchesSearch;
    });
  }, [normalizedLogs, query, activeTab]);

  const tabs = useMemo(() => ([
    { key: 'All', label: 'All', count: stats.totalCount, icon: ClipboardList },
    { key: 'User Management', label: 'User Management', count: stats.userManagementCount, icon: UserCog },
    { key: 'Form Changes', label: 'Form Changes', count: stats.formChangesCount, icon: Shield },
  ]), [stats]);

  // Utility: convert array of objects to CSV and trigger download
  const exportToCSV = (rows, filename = 'audit-logs.csv') => {
    if (!rows || rows.length === 0) {
      window.alert('No logs to export.');
      return;
    }

    const headers = ['Timestamp','User','Role','Action','Category','Status','IP','Message'];

    const escape = (value) => {
      if (value === null || value === undefined) return '';
      const s = String(value).replace(/\r?\n/g, ' ');
      if (s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
      if (s.includes(',') || s.includes('\n')) return '"' + s + '"';
      return s;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      const ts = r.timestamp || r.time || '';
      const row = [
        ts,
        r.user || '',
        r.role || '',
        r.action || '',
        r.category || '',
        r.status || '',
        r.ip || '',
        r.message || '',
      ].map(escape).join(',');
      lines.push(row);
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Export the currently filtered logs
  const exportLogs = () => {
    try {
      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, '-');
      const filename = `depthead-audit-logs_${stamp}.csv`;
      exportToCSV(filteredLogs, filename);
    } catch (e) {
      console.error('Export failed', e);
      window.alert('Export failed. See console for details.');
    }
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="depthead" activeItem="audit-log" />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[#0f2f57] tracking-tight">Audit Log</h1>
                <p className="text-slate-600 mt-2 text-lg">Welcome back, Department Head</p>
              </div>
              <button
                type="button"
                onClick={() => exportLogs()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Download size={16} />
                Export Logs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center">
                  <UserCog size={20} />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">User Management</p>
                  <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{stats.userManagementCount}</p>
                  <p className="text-xs text-slate-400 mt-2">User-related events</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Form Changes</p>
                  <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{stats.formChangesCount}</p>
                  <p className="text-xs text-slate-400 mt-2">Evaluation form updates</p>
                </div>
              </div>

              {/* System Tasks card removed per request */}

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-slate-600 text-sm">Total Activities</p>
                  <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{stats.totalCount}</p>
                  <p className="text-xs text-slate-400 mt-2">All captured audit entries</p>
                </div>
              </div>
            </div>

            <div className="relative mb-6 bg-white border border-slate-200 rounded-2xl p-4">
              <Search size={18} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, actions, categories, IP..."
                className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
              />
            </div>

            <div className="mb-6 overflow-x-auto">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 rounded-full border border-slate-200 shadow-inner min-w-max">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                        active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={15} />
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={18} className="text-slate-700" />
                <h2 className="text-3xl font-semibold text-slate-900">Activity Timeline</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#020824] text-white font-semibold">{filteredLogs.length} entries</span>
              </div>
              <p className="text-slate-500 mb-5">Chronological list of department head system activities</p>

              {isLoading ? (
                <div className="text-center py-10 text-slate-500">Loading audit logs...</div>
              ) : loadError ? (
                <div className="text-center py-10 text-rose-600">{loadError}</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No audit logs found.</div>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log, idx) => (
                    <div key={log.id || idx} className="border border-slate-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2">
                          <ClipboardList size={16} className="text-slate-500" />
                          <p className="font-semibold text-slate-900">{log.action || 'Activity'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadgeColor(log.status)}`}>
                            {log.status || 'Success'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${groupBadgeColor(log.group)}`}>
                            {log.group}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-slate-700">{log.message || 'No details provided.'}</p>

                      <div className="mt-2 text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                        <span>User: {log.user || 'Unknown'}</span>
                        <span>Role: {log.role || 'Unknown'}</span>
                        <span>{formatLogDate(log.timestamp || log.time)}</span>
                        <span>IP: {log.ip || 'Unknown'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuditLogPage;
