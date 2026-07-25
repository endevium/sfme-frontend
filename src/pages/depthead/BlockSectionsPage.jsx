import React, { useEffect, useMemo, useState } from 'react';
import { Plus, LayoutGrid, X, ChevronDown, Table2, Pencil, Trash2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { getToken } from '../../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const YEAR_LEVEL_OPTIONS = ['1st', '2nd', '3rd', '4th', '5th'];

const parseApiError = async (response, fallback = 'Request failed.') => {
  const data = await response.json().catch(() => null);
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data) && data.length > 0) return String(data[0]);
  if (typeof data === 'object') {
    const firstEntry = Object.entries(data)[0];
    if (firstEntry) {
      const [, value] = firstEntry;
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      if (typeof value === 'string') return value;
    }
  }
  return fallback;
};

const BlockSectionsPage = () => {
  const [programs, setPrograms] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [formData, setFormData] = useState({
    program: '',
    year_level: '',
    block_name: '',
  });
  const [editFormData, setEditFormData] = useState({
    id: null,
    program: '',
    year_level: '',
    block_name: '',
  });

  const loadData = async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const [programRes, blockRes] = await Promise.all([
        fetch(`${API_BASE_URL}/programs/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/blocks/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const programData = await programRes.json().catch(() => []);
      const blockData = await blockRes.json().catch(() => []);

      if (!programRes.ok) {
        const msg = await parseApiError(programRes, 'Unable to load programs.');
        throw new Error(msg);
      }
      if (!blockRes.ok) {
        const msg = await parseApiError(blockRes, 'Unable to load block/sections.');
        throw new Error(msg);
      }

      setPrograms(Array.isArray(programData) ? programData : programData?.results || []);
      setBlocks(Array.isArray(blockData) ? blockData : blockData?.results || []);
    } catch (err) {
      setError(err.message || 'Unable to load block/sections.');
      setPrograms([]);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const programMap = useMemo(() => {
    const map = new Map();
    programs.forEach((program) => {
      map.set(program.id, {
        code: program.program_code,
        name: program.program_name,
      });
    });
    return map;
  }, [programs]);

  const displayBlocks = useMemo(() => {
    return blocks.map((block, index) => {
      const programInfo = programMap.get(block.program) || {};
      return {
        id: block.id || `${block.block_name}-${index}`,
        block_name: block.block_name || 'N/A',
        year_level: block.year_level || 'N/A',
        program_code: programInfo.code || 'N/A',
        program_name: programInfo.name || 'Unknown Program',
      };
    });
  }, [blocks, programMap]);

  const filteredBlocks = useMemo(() => {
    let list = displayBlocks;
    if (selectedYearLevel) {
      list = list.filter((block) => block.year_level === selectedYearLevel);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((block) =>
        String(block.block_name || '').toLowerCase().includes(q) ||
        String(block.program_code || '').toLowerCase().includes(q) ||
        String(block.program_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [displayBlocks, selectedYearLevel, searchQuery]);

  const isFormComplete = Boolean(
    String(formData.program).trim() &&
    String(formData.year_level).trim() &&
    String(formData.block_name).trim()
  );

  const handleCreate = async () => {
    setCreateError('');
    if (!isFormComplete) {
      setCreateError('Please complete all required fields.');
      return;
    }

    const token = getToken();
    if (!token) {
      setCreateError('Session expired. Please login again.');
      return;
    }

    const normalizedBlockName = formData.block_name.trim().toLowerCase();
    const duplicateBlock = blocks.find(
      (block) =>
        Number(block.program) === Number(formData.program) &&
        String(block.year_level || '').trim().toLowerCase() === String(formData.year_level).trim().toLowerCase() &&
        String(block.block_name || '').trim().toLowerCase() === normalizedBlockName
    );
    if (duplicateBlock) {
      setCreateError('This block/section already exists for the selected program and year level.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        program: Number(formData.program),
        year_level: formData.year_level,
        block_name: formData.block_name.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/blocks/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await parseApiError(res, 'Unable to create block/section.');
        setCreateError(msg);
        return;
      }

      setIsCreateOpen(false);
      setFormData({
        program: '',
        year_level: '',
        block_name: '',
      });
      await loadData();
    } catch {
      setCreateError('Unable to reach the server.');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (block) => {
    setEditError('');
    setEditFormData({
      id: block.id,
      program: String(block.program),
      year_level: block.year_level,
      block_name: block.block_name,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    setEditError('');
    if (
      !String(editFormData.program).trim() ||
      !String(editFormData.year_level).trim() ||
      !String(editFormData.block_name).trim()
    ) {
      setEditError('Please complete all required fields.');
      return;
    }

    const token = getToken();
    if (!token) {
      setEditError('Session expired. Please login again.');
      return;
    }

    const normalizedBlockName = editFormData.block_name.trim().toLowerCase();
    const duplicateBlock = blocks.find(
      (block) =>
        block.id !== editFormData.id &&
        Number(block.program) === Number(editFormData.program) &&
        String(block.year_level || '').trim().toLowerCase() === String(editFormData.year_level).trim().toLowerCase() &&
        String(block.block_name || '').trim().toLowerCase() === normalizedBlockName
    );
    if (duplicateBlock) {
      setEditError('This block/section already exists for the selected program and year level.');
      return;
    }

    setEditing(true);
    try {
      const payload = {
        program: Number(editFormData.program),
        year_level: editFormData.year_level,
        block_name: editFormData.block_name.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/blocks/${editFormData.id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await parseApiError(res, 'Unable to update block/section.');
        setEditError(msg);
        return;
      }

      setIsEditOpen(false);
      setEditFormData({
        id: null,
        program: '',
        year_level: '',
        block_name: '',
      });
      await loadData();
    } catch {
      setEditError('Unable to reach the server.');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (block) => {
    const token = getToken();
    if (!token) return;

    const confirmed = window.confirm(`Delete ${block.block_name} (${block.year_level})? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(block.id);
    try {
      const res = await fetch(`${API_BASE_URL}/blocks/${block.id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const msg = await parseApiError(res, 'Unable to delete block/section.');
        setError(msg);
        return;
      }

      await loadData();
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="depthead" activeItem="block-sections" />

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl font-bold text-[#1f2937]">Block/Sections</h1>
                <p className="text-slate-500 mt-1">Manage block and section assignments per program</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateError('');
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f474d] text-white rounded-lg text-sm font-semibold hover:bg-[#18393e] transition-all"
              >
                <Plus size={15} />
                Create Block/Section
              </button>
            </div>

            <section className="mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by block name, program code or name"
                    className="w-full h-11 px-4 rounded-xl border border-slate-300 bg-white text-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row lg:w-auto">
                  <div className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      aria-pressed={viewMode === 'cards'}
                      className={`inline-flex h-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${viewMode === 'cards' ? 'bg-[#1f474d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <LayoutGrid size={16} />
                      Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      aria-pressed={viewMode === 'table'}
                      className={`inline-flex h-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${viewMode === 'table' ? 'bg-[#1f474d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Table2 size={16} />
                      Table
                    </button>
                  </div>
                  <div className="relative w-full sm:w-60">
                    <select
                      value={selectedYearLevel}
                      onChange={(e) => setSelectedYearLevel(e.target.value)}
                      className="w-full h-11 px-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-slate-800 appearance-none text-sm"
                    >
                      <option value="">All Year Levels</option>
                      {YEAR_LEVEL_OPTIONS.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            <section>
              {loading ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-sm">Loading block/sections...</div>
              ) : error ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-rose-600 shadow-sm">{error}</div>
              ) : filteredBlocks.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-sm">
                  No block/sections found for the selected year level.
                </div>
              ) : (
                <>
                  {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {filteredBlocks.map((block) => (
                    <article key={block.id} className="h-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-2 font-mono text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 font-bold uppercase">
                          {block.program_code}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(block)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sky-600 transition hover:bg-slate-100 hover:text-sky-800"
                            title="Edit block/section"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(block)}
                            disabled={deletingId === block.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-slate-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Delete block/section"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h2 className="text-xl leading-tight font-bold text-slate-900 tracking-tight mt-3">{block.block_name}</h2>
                      <p className="text-sm text-slate-500 mt-1">{block.program_name}</p>
                      <p className="text-sm text-slate-700 mt-3">{block.year_level} Year</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Program Code</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Program Name</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Block/Section</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Year Level</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBlocks.map((block) => (
                        <tr key={block.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-3 text-sm text-slate-700">{block.program_code}</td>
                          <td className="px-6 py-3 text-sm text-slate-700">{block.program_name}</td>
                          <td className="px-6 py-3 text-sm font-semibold text-slate-900">{block.block_name}</td>
                          <td className="px-6 py-3 text-sm text-slate-700">{block.year_level} Year</td>
                          <td className="px-6 py-3 text-sm">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(block)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sky-600 transition hover:bg-slate-100 hover:text-sky-800"
                                title="Edit block/section"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(block)}
                                disabled={deletingId === block.id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-slate-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Delete block/section"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
                </>
              )}
            </section>
          </div>
        </main>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold text-slate-800">Create Block/Section</h3>
                <p className="text-sm text-slate-500 mt-1">Add a new block/section under a program.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Program</label>
                <div className="relative">
                  <select
                    value={formData.program}
                    onChange={(e) => setFormData((prev) => ({ ...prev, program: e.target.value }))}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-slate-800 appearance-none text-sm font-medium"
                  >
                    <option value="">Select program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.program_code} - {program.program_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Year Level</label>
                <div className="relative">
                  <select
                    value={formData.year_level}
                    onChange={(e) => setFormData((prev) => ({ ...prev, year_level: e.target.value }))}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-slate-800 appearance-none text-sm font-medium"
                  >
                    <option value="">Select year level</option>
                    {YEAR_LEVEL_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Block/Section Name</label>
                <input
                  type="text"
                  value={formData.block_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, block_name: e.target.value }))}
                  placeholder="e.g., BSIT3-01"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium"
                />
              </div>

              {createError && <p className="text-sm text-rose-600 font-medium">{createError}</p>}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={creating || !isFormComplete}
                  onClick={handleCreate}
                  className="flex-1 h-11 rounded-xl bg-[#1f474d] text-white text-sm font-semibold hover:bg-[#2a5d65] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Block/Section'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Edit Block/Section</h3>
                <p className="text-sm text-slate-500 mt-1">Update block/section information.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Program</label>
                <div className="relative">
                  <select
                    value={editFormData.program}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, program: e.target.value }))}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-slate-800 appearance-none text-sm font-medium"
                  >
                    <option value="">Select program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.program_code} - {program.program_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Year Level</label>
                <div className="relative">
                  <select
                    value={editFormData.year_level}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, year_level: e.target.value }))}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-slate-800 appearance-none text-sm font-medium"
                  >
                    <option value="">Select year level</option>
                    {YEAR_LEVEL_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Block/Section Name</label>
                <input
                  type="text"
                  value={editFormData.block_name}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, block_name: e.target.value }))}
                  placeholder="e.g., BSIT3-01"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium"
                />
              </div>

              {editError && <p className="text-sm text-rose-600 font-medium">{editError}</p>}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editing}
                  onClick={handleUpdate}
                  className="flex-1 h-11 rounded-xl bg-[#1f474d] text-white text-sm font-semibold hover:bg-[#2a5d65] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockSectionsPage;
