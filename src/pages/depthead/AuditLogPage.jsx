import React, {useState, useEffect} from 'react';
import Sidebar from '../../components/Sidebar';

const Badge = ({children, className = ''}) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
);

const AuditLogPage = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
    } catch (e) {
      // not JSON, continue with raw
    }
    if (!raw) return null;
    // strip surrounding quotes that may have been double-serialized
    raw = String(raw).trim().replace(/^"|"$/g, '');
    // if it already contains the Bearer prefix, remove it (we'll add canonical prefix later)
    if (raw.toLowerCase().startsWith('bearer ')) raw = raw.split(' ').slice(1).join(' ');
    return raw || null;
  };

  const getAuthHeaders = () => {
    const token = getTokenFromStorage();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState(['All Categories']);
  const [uniqueStatuses, setUniqueStatuses] = useState(['All Statuses']);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [ipFilter, setIpFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState([
    { title: 'Total Activities', value: 0, subtitle: 'Last 24 hours' },
    { title: 'User Management', value: 0, subtitle: 'User changes' },
    { title: 'Form Changes', value: 0, subtitle: 'Form modifications' },
    { title: 'System Tasks', value: 0, subtitle: 'Config & maintenance' },
  ]);
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

        const res = await fetch(`${API_BASE_URL}/audit-logs/`, {
          headers: getAuthHeaders(),
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

        // Compute unique categories and statuses
        const categories = [...new Set(logsList.map(log => log.category).filter(Boolean))];
        setUniqueCategories(['All Categories', ...categories]);

        const statuses = [...new Set(logsList.map(log => log.status).filter(Boolean))];
        setUniqueStatuses(['All Statuses', ...statuses]);

        // Compute stats from logs
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentLogs = logsList.filter(log => new Date(log.timestamp || log.time) > last24h);

        const userManagement = logsList.filter(log => log.category === 'USER MANAGEMENT').length;
        const formChanges = logsList.filter(log => log.category === 'FORM MANAGEMENT').length;
        const systemTasks = logsList.filter(log => log.category === 'SYSTEM TASKS').length;

        setStats([
          { title: 'Total Activities', value: recentLogs.length, subtitle: 'Last 24 hours' },
          { title: 'User Management', value: userManagement, subtitle: 'User changes' },
          { title: 'Form Changes', value: formChanges, subtitle: 'Form modifications' },
          { title: 'System Tasks', value: systemTasks, subtitle: 'Config & maintenance' },
        ]);
      } catch {
        setLoadError('Unable to reach the server. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  // Filter logs based on all criteria
  const filteredLogs = logs.filter(log => {
    // Text search
    const matchesQuery = (log.user + log.action + log.message + log.category).toLowerCase().includes(query.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory === 'All Categories' || log.category === selectedCategory;

    // Status filter
    const matchesStatus = selectedStatus === 'All Statuses' || log.status === selectedStatus;

    // IP filter
    const matchesIP = !ipFilter || (log.ip && log.ip.includes(ipFilter));

    // Date filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const logDate = new Date(log.timestamp || log.time);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (logDate < fromDate) matchesDate = false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (logDate > toDate) matchesDate = false;
      }
    }

    return matchesQuery && matchesCategory && matchesStatus && matchesIP && matchesDate;
  });

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 overflow-x-hidden flex flex-col lg:flex-row">
      <Sidebar role="depthead" activeItem="audit-log" />
      <div className="flex-1 flex flex-col">
        <main className="container mx-auto px-6 py-8 max-w-6xl flex-1">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Audit Log</h1>
              <p className="text-slate-500 mt-2">Track all system activities and changes</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-white text-slate-800 px-3 py-2 rounded-lg shadow-sm hover:opacity-95 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 10l5 5 5-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Export Logs
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((s) => (
              <div key={s.title} className="bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-700 text-base font-medium">{s.title}</div>
                  {/* Icon visuals with color */}
                  {s.title === 'Total Activities' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor" fill="none" />
                      <path d="M12 8v4l3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {s.title === 'User Management' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="7" r="4" strokeWidth="1.5" stroke="currentColor" fill="none" />
                      <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {s.title === 'Form Changes' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="1.5" stroke="currentColor" fill="none" />
                      <path d="M16 3v4M8 3v4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {s.title === 'System Tasks' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor" fill="none" />
                      <path d="M12 6v6l4 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 2v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 20v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 12h2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 12h2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col mt-2">
                  <div className="text-3xl font-bold text-slate-900">{isLoading ? '...' : s.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{s.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Activity Logs Panel */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Activity Logs</h2>
                <p className="text-sm text-slate-500">Complete history of system events</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by user, action, or details..."
                  className="bg-white border border-slate-200 placeholder-slate-400 text-slate-700 px-4 py-2 rounded-lg w-80 shadow-sm"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                >
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                >
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <input
                  value={ipFilter}
                  onChange={(e) => setIpFilter(e.target.value)}
                  placeholder="Filter by IP address"
                  className="bg-white border border-slate-200 placeholder-slate-400 text-slate-700 px-4 py-2 rounded-lg w-40 shadow-sm"
                />
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">From:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                  />
                  <label className="text-sm text-slate-600">To:</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {loadError && (
              <div className="text-red-600 text-center py-4">{loadError}</div>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading audit logs...</div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 shadow-sm flex flex-col mb-2">
                    <div className="flex items-center gap-4">
                      {/* Icon for log category */}
                      <div className="flex-shrink-0">
                        {log.category === 'USER MANAGEMENT' && (
                          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <circle cx="12" cy="7" r="4" strokeWidth="1.5" stroke="currentColor" fill="none" />
                              <path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        {log.category === 'FORM MANAGEMENT' && (
                          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="1.5" stroke="currentColor" fill="none" />
                              <path d="M16 3v4M8 3v4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        {log.category === 'SYSTEM TASKS' && (
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke="currentColor" fill="none" />
                              <path d="M12 6v6l4 2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M12 2v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M12 20v2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2 12h2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M20 12h2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        {!['USER MANAGEMENT','FORM MANAGEMENT','SYSTEM TASKS'].includes(log.category) && (
                          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M12 5v14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M5 12h14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-slate-900 font-semibold text-lg">{log.user}</div>
                          <Badge className={'bg-amber-100 text-amber-700'}>{log.role}</Badge>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-700 font-medium">{log.action}</span>
                          {log.category === 'USER MANAGEMENT' && <Badge className={'bg-blue-100 text-blue-700 ml-2'}>{log.category}</Badge>}
                          {log.category === 'FORM MANAGEMENT' && <Badge className={'bg-purple-100 text-purple-700 ml-2'}>{log.category}</Badge>}
                          {log.category === 'SYSTEM TASKS' && <Badge className={'bg-slate-100 text-slate-700 ml-2'}>{log.category}</Badge>}
                          {!['USER MANAGEMENT','FORM MANAGEMENT','SYSTEM TASKS'].includes(log.category) && <Badge className={'bg-emerald-100 text-emerald-700 ml-2'}>{log.category}</Badge>}
                          {log.status && <Badge className={'bg-emerald-100 text-emerald-700 ml-2'}>{log.status}</Badge>}
                        </div>
                        <div className="text-slate-600 mb-2">{log.message}</div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M21 10a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {new Date(log.timestamp || log.time).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
                          </div>
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path d="M3 10.5a6 6 0 0012 0V6" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {log.ip}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredLogs.length === 0 && !isLoading && !loadError && (
                  <div className="text-center py-8 text-slate-500">No audit logs found matching the filters.</div>
                )}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default AuditLogPage;
