import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { BookOpen, Star, BarChart3, Calendar, ListFilter, X, User } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const getResponseList = (item) => {
  if (Array.isArray(item?.responses_out)) return item.responses_out;
  if (Array.isArray(item?.responses)) return item.responses;
  return [];
};

const getResponseCode = (resp) => String(resp?.question_code || resp?.question || '').trim().toLowerCase();

const getResponseQuestion = (resp, idx) => {
  return String(resp?.question_text || resp?.question || `Question ${idx + 1}`).trim();
};

const getResponseGroup = (resp) => {
  const code = getResponseCode(resp);

  // Keep overall questions aligned with their paired explanation prompts.
  if (
    code === 'overall_instructor' ||
    code === 'overall_modules' ||
    code.startsWith('explain_') ||
    code.includes('comment')
  ) {
    return 'Overall Rating & Comments';
  }

  if (code.startsWith('learn_') || code.includes('instructor')) return 'Instructor Effectiveness';
  if (code.includes('module')) return 'Course Content & Materials';
  return 'General Feedback';
};

const ratingLabel = (rating, max) => {
  if (!rating) return '';
  if (max === 10) return `${rating}/10`;
  if (max === 4) {
    if (rating === 4) return 'Rating: Almost Always';
    if (rating === 3) return 'Rating: Often';
    if (rating === 2) return 'Rating: Sometimes';
    return 'Rating: Rarely';
  }
  if (rating >= 5) return 'Strongly Agree';
  if (rating === 4) return 'Agree';
  if (rating === 3) return 'Neutral';
  if (rating === 2) return 'Disagree';
  return 'Strongly Disagree';
};

const getRatingMax = (resp) => {
  const code = getResponseCode(resp);
  if (code === 'overall_instructor' || code === 'overall_modules') return 10;
  if (code.startsWith('learn_')) return 4;
  const value = Number(resp?._rating || resp?.rating || 0);
  return value > 5 ? 10 : 5;
};

const HistoryPage = () => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    fetch(`${API_BASE_URL}/feedback/history/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        setHistoryData(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setHistoryData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = historyData.length;
  const averageRating =
    total > 0
      ? (
          historyData
            .map((r) =>
              Array.isArray(r.responses_out)
                ? r.responses_out
                    .filter((q) => typeof q.rating === 'number')
                    .reduce((sum, q) => sum + q.rating, 0)
                : 0
            )
            .reduce((a, b) => a + b, 0) / total
        ).toFixed(2)
      : 'N/A';

  const stats = [
    { title: 'Total Evaluations', value: total, sub: 'All time submissions', icon: BookOpen },
    { title: 'Average Rating', value: averageRating, sub: 'Your average score', icon: Star },
    { title: 'Completion Rate', value: total > 0 ? '100%' : '0%', sub: 'On-time submissions', icon: BarChart3 },
    { title: 'This Semester', value: '-', sub: 'Evaluations complete', icon: Calendar },
  ];

  const filteredHistory = historyData;

  const openDetails = (item) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedItem(null);
    setIsDetailsOpen(false);
  };

  const detailResponses = getResponseList(selectedItem);
  const groupedResponses = detailResponses.reduce((acc, resp, idx) => {
    const group = getResponseGroup(resp);
    if (!acc[group]) acc[group] = [];
    acc[group].push({
      ...resp,
      _idx: idx,
      _question: getResponseQuestion(resp, idx),
      _rating: Number(resp?.rating) || 0,
      _comment: String(resp?.comment || '').trim(),
    });
    return acc;
  }, {});

  const instructorOverall = detailResponses.find((r) => getResponseCode(r).includes('overall_instructor'));
  const moduleOverall = detailResponses.find((r) => getResponseCode(r).includes('overall_modules'));

  const detailDate = selectedItem?.submitted_at
    ? new Date(selectedItem.submitted_at).toLocaleDateString()
    : 'N/A';

  const StarRating = ({ rating }) => {
    const safeRating = Number(rating) || 0;
    const display = Number.isInteger(safeRating) ? `${safeRating}` : safeRating.toFixed(1);

    return (
    <div className="flex gap-0.5 mt-1">
      {[...Array(5)].map((_, i) => (
        <Star 
          key={i} 
          size={16} 
          fill={i < Math.floor(safeRating) ? '#fbbf24' : 'none'} 
          className={i < Math.floor(safeRating) ? 'text-yellow-400' : 'text-gray-300'} 
        />
      ))}
      <span className="text-sm font-semibold text-slate-700 ml-2">{display}/5</span>
    </div>
    );
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="history" onLogout={() => {}} />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="container mx-auto max-w-7xl">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-[#0f2f57] tracking-tight">Evaluation History</h1>
              <p className="text-slate-600 mt-2 text-lg">View your submitted evaluations and feedback</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#0f2f57] flex items-center justify-center">
                      <stat.icon size={20} />
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">{stat.title}</p>
                    <p className="text-4xl leading-none font-bold text-slate-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-2">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* History Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {loading ? (
                <div>Loading…</div>
              ) : (
                filteredHistory
                  .map((item, idx) => {
                    const date = item.submitted_at
                      ? new Date(item.submitted_at).toLocaleDateString()
                      : '';
                      const respList =
                        Array.isArray(item.responses_out)
                          ? item.responses_out
                          : Array.isArray(item.responses)
                          ? item.responses
                          : [];

                      const ratingValues = respList
                        .filter((q) => typeof q?.rating === 'number')
                        .map((q) => {
                          const code = getResponseCode(q);
                          const value = Number(q.rating) || 0;
                          const max = code.startsWith('learn_') ? 4 : (code === 'overall_instructor' || code === 'overall_modules' ? 10 : 5);
                          return max > 0 ? (value / max) * 5 : 0;
                        })
                        .filter((v) => Number.isFinite(v) && v > 0);

                      const overall =
                        ratingValues.length > 0
                          ? Number((ratingValues.reduce((sum, v) => sum + v, 0) / ratingValues.length).toFixed(1))
                          : 0;

                      const semesterLabel =
                        item.semester ||
                        item.term ||
                        item.academic_term ||
                        item.semester_label ||
                        item.school_year ||
                        item.academic_year ||
                        'N/A';

                    return (
                      <div
                        key={idx}
                        className="h-full bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 flex flex-col"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span className="font-mono text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-500 font-bold uppercase">
                            {item.form_code}
                          </span>
                          <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-bold flex items-center gap-1 uppercase">
                            <CheckCircle size={10} /> Reviewed
                          </span>
                        </div>

                        <h3 className="text-xl leading-tight font-bold text-slate-900 tracking-tight">
                          {item.form_label || item.form_model || item.form_id || ''}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6">{item.form_instructor || 'Instructor TBA'}</p>

                        <div className="mb-6">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Rating</span>
                          <StarRating rating={overall} />
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-6 font-medium">
                          <span className="inline-flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            {date || 'N/A'}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <User size={14} className="text-slate-400" />
                            {semesterLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openDetails(item)}
                          className="w-full mt-auto h-11 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-[#1f474d] text-white text-sm font-semibold hover:bg-[#2a5d65] transition-colors"
                        >
                          <ListFilter size={16} />
                          View Details
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </main>
      </div>

      {isDetailsOpen && selectedItem && (
        <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-4" onClick={closeDetails}>
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-500 font-bold uppercase">
                    {selectedItem.form_code}
                  </span>
                  <span className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-bold uppercase">
                    Reviewed
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900">{selectedItem.form_label || 'Evaluation Details'}</h3>
                <p className="text-slate-500 mt-1">{selectedItem.form_instructor || 'N/A'} • Submitted on {detailDate}</p>
              </div>
              <button type="button" className="p-1 rounded text-slate-400 hover:text-slate-700" onClick={closeDetails}>
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <p className="text-sm text-slate-500">Overall Course Rating</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{moduleOverall?.rating ? `${moduleOverall.rating}/10` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Instructor Rating</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{instructorOverall?.rating ? `${instructorOverall.rating}/10` : 'N/A'}</p>
                </div>
              </div>

              <h4 className="text-xl font-semibold text-slate-900 mb-4">Detailed Responses</h4>
              <div className="space-y-6">
                {Object.entries(groupedResponses).map(([groupName, responses]) => (
                  <div key={groupName}>
                    <h5 className="text-lg font-semibold text-slate-800 mb-3">{groupName}</h5>
                    <div className="space-y-4">
                      {responses.map((resp) => {
                        const max = getRatingMax(resp);
                        const isLearningScale = max === 4;
                        return (
                          <div key={`${groupName}-${resp._idx}`} className="rounded-xl border border-slate-200 p-4">
                            <p className="text-slate-800 font-medium">{resp._question}</p>

                            {resp._rating > 0 && (
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isLearningScale && (
                                    <span className="text-xs font-semibold text-slate-500 mr-1">Rarely</span>
                                  )}
                                  {Array.from({ length: max }, (_, i) => {
                                    const value = i + 1;
                                    const selected = value === resp._rating;
                                    return (
                                      <span
                                        key={value}
                                        className={`w-8 h-8 rounded-md text-xs font-bold inline-flex items-center justify-center border ${
                                          selected
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-slate-100 border-slate-200 text-slate-400'
                                        }`}
                                      >
                                        {value}
                                      </span>
                                    );
                                  })}
                                  {isLearningScale && (
                                    <span className="text-xs font-semibold text-slate-500 ml-1">Almost Always</span>
                                  )}
                                </div>
                                <span className="text-sm text-slate-600 ml-auto text-right whitespace-nowrap">{ratingLabel(resp._rating, max)}</span>
                              </div>
                            )}

                            {resp._comment && (
                              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                                {resp._comment}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {Object.keys(groupedResponses).length === 0 && (
                  <p className="text-slate-500">No saved responses found for this submission.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Helper Component for Icon Consistency
const CheckCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

export default HistoryPage;