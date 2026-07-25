import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { ArrowLeft, ArrowRight, Send, Star, CheckCircle } from 'lucide-react';

const toReadable = (value) => String(value || '').replaceAll('_', ' ').trim();

const buildStudentFriendlySecurityMessage = (violations = []) => {
  if (!Array.isArray(violations) || violations.length === 0) {
    return 'Some comments could not be checked. Please review your wording and try again.';
  }

  const first = violations[0] || {};
  const theme = String(first.theme || '').toLowerCase();
  const reason = String(first.reason || '').toLowerCase();

  if (theme === 'prompt injection' || reason.includes('prompt_injection')) {
    return 'Please rewrite your comment as feedback only. Instructions like "ignore previous" or command-like prompts are not allowed.';
  }

  if (theme === 'sexual content') {
    return 'Your comment includes sexual language. Please remove it and keep your feedback respectful.';
  }

  if (theme === 'insult' || theme === 'harsh language') {
    return 'Your comment includes insulting or harsh words. Please use respectful language.';
  }

  if (theme === 'poisoning' || reason.includes('identical_texts') || reason.includes('single_user_flood')) {
    return 'Your comments look too repetitive. Please provide clear, original feedback for each text field.';
  }

  return 'Some comment text is not allowed. Please edit your comments and try again.';
};

const mapViolationsToFieldErrors = (violations = []) => {
  const fieldErrors = {};
  if (!Array.isArray(violations)) return fieldErrors;

  violations.forEach((violation) => {
    const questionId = String(violation?.question || '').trim();
    if (!questionId || !TEXT_QUESTION_IDS.includes(questionId)) return;
    fieldErrors[questionId] = buildStudentFriendlySecurityMessage([violation]);
  });

  return fieldErrors;
};

// Group questions into sections for the stepper UI
const buildSections = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const scaleQuestions = questions.filter(q => q.type === 'scale');
  const ratingQuestions = questions.filter(q => q.type === 'rating');
  const textQuestions = questions.filter(q => q.type === 'text');

  const sections = [];

  if (scaleQuestions.length > 0) {
    sections.push({
      title: 'Learning Experience',
      description: 'Rate your learning experience in this class',
      questions: scaleQuestions.map(q => ({
        id: q.code,
        category: 'Learning',
        question: q.question_text,
        type: 'scale',
      })),
    });
  }

  const overallQuestions = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.type === 'rating') {
      overallQuestions.push({
        id: q.code,
        category: 'Overall',
        question: q.question_text,
        type: 'rating',
      });
      if (i + 1 < questions.length && questions[i + 1].type === 'text') {
        overallQuestions.push({
          id: questions[i + 1].code,
          category: 'Feedback',
          question: questions[i + 1].question_text,
          type: 'text',
        });
        i++;
      }
    }
  }

  const pairedTextCodes = new Set(overallQuestions.filter(q => q.type === 'text').map(q => q.id));
  const unpairedText = textQuestions
    .filter(q => !pairedTextCodes.has(q.code))
    .map(q => ({
      id: q.code,
      category: 'Feedback',
      question: q.question_text,
      type: 'text',
    }));

  if (overallQuestions.length > 0 || unpairedText.length > 0) {
    sections.push({
      title: 'Overall Rating & Comments',
      description: 'Final assessment and open-ended feedback',
      questions: [...overallQuestions, ...unpairedText],
    });
  }

  return sections;
};

const EVALUATION_SECTIONS = [
  {
    title: 'Learning Experience',
    description: 'Rate your learning experience in this class',
    questions: [
      { id: 'learn_1', category: 'Learning', question: 'I understand the lessons with the help of activities provided by my teacher.', type: 'scale' },
      { id: 'learn_2', category: 'Learning', question: 'I receive guidance from my teacher on how to complete the activities/tasks/modules.', type: 'scale' },
      { id: 'learn_3', category: 'Learning', question: 'I feel comfortable asking questions and sharing ideas in our class.', type: 'scale' },
      { id: 'learn_4', category: 'Learning', question: 'I participate in class because my teacher asks interesting and challenging questions.', type: 'scale' },
      { id: 'learn_5', category: 'Learning', question: 'I receive feedback from my teacher on how to improve my work, both in class and during consultation hours.', type: 'scale' },
      { id: 'learn_6', category: 'Learning', question: 'I have been able to apply the lessons from this class to real-life situations.', type: 'scale' },
    ],
  },
  {
    title: 'Overall Rating & Comments',
    description: 'Final assessment and open-ended feedback',
    questions: [
      { id: 'overall_instructor', category: 'Overall', question: 'On a scale from 0 to 10, how likely are you to recommend your teacher to a friend?', type: 'rating' },
      { id: 'explain_1', category: 'Feedback', question: 'Please explain your rating.', type: 'text' },
      { id: 'overall_modules', category: 'Overall', question: 'On a scale from 0 to 10, how likely are you to recommend the modules used in this class to a friend?', type: 'rating' },
      { id: 'explain_2', category: 'Feedback', question: 'Please explain your rating.', type: 'text' },
    ],
  },
];

const TEXT_QUESTION_IDS = EVALUATION_SECTIONS
  .flatMap(s => s.questions)
  .filter(q => q.type === 'text')
  .map(q => q.id);

const EvaluationForm = ({
  moduleId: propModuleId,
  instructorFormId: propInstructorFormId,
  evalFormId: propEvalFormId,
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [hoverStar, setHoverStar] = useState({});
  const [moduleData, setModuleData] = useState(null);
  const [instructorData, setInstructorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [inputError, setInputError] = useState('');
  const [themeCheck, setThemeCheck] = useState({ checking: false, blocked: false, message: '' });
  const [commentFieldErrors, setCommentFieldErrors] = useState({});

  // Use the hardcoded sections directly
  const sections = EVALUATION_SECTIONS;

  const moduleId = propModuleId;
  const instructorFormId = propInstructorFormId || null;

  const [evalFormId, setEvalFormId] = useState(
    propEvalFormId || instructorFormId || null
  );

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const formType = instructorFormId ? 'Instructor' : 'Module';

  // Only fetch the form metadata (module name, instructor, etc.) — NOT the questions
  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    const fetchFormData = async () => {
      setLoading(true);
      setError('');

      try {
        if (formType === 'Module') {
          const lookupId = evalFormId || moduleId;
          const res = await fetch(`${API_BASE_URL}/module-evaluation-forms/${lookupId}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Module form not found');
          const data = await res.json();
          setModuleData({
                      code: data.subject_code || data.classroom_code,
                      title: data.subject_description || data.subject_code,
                      description: data.description || '',
                      instructor: data.instructor_name || '',
                    });
          if (data.id) setEvalFormId(data.id);
        } else {
          const res = await fetch(`${API_BASE_URL}/instructor-evaluation-forms/${instructorFormId}/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Instructor form not found');
          const data = await res.json();
          setInstructorData({
            name: data.instructor_name || data.title || 'Instructor',
            description: data.description || '',
          });
          if (data.id) setEvalFormId(data.id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [API_BASE_URL, formType, moduleId, instructorFormId]);

  const textQuestionIds = sections
    .flatMap(s => s.questions)
    .filter(q => q.type === 'text')
    .map(q => q.id);

    const handleResponse = (id, val) => setResponses(prev => ({ ...prev, [id]: val }));

    const isSectionComplete = (idx) => {
      if (!sections[idx]) return false;
      return sections[idx].questions.every(q => responses[q.id]);
    };
  
    const handleNext = () => currentSection < sections.length - 1 && setCurrentSection(prev => prev + 1);
  
    const hasAngleBrackets = (s) => /[<>]/.test(s);
  
    const hasEmoji = (s) => {
      try {
        return /[\p{Extended_Pictographic}]/u.test(s);
      } catch {
        return /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(s);
      }
    };
  
    const validateFreeText = (s) => {
      if (hasAngleBrackets(s)) return 'Comments must not contain "<" or ">"';
      if (hasEmoji(s)) return 'Emojis are not allowed.';
      return '';
    };
  
    const handleTextResponse = (id, value) => {
      const msg = validateFreeText(value);
      setInputError(msg);
      if (msg) {
        setCommentFieldErrors((prev) => ({ ...prev, [id]: msg }));
      } else {
        setCommentFieldErrors((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
      setResponses((prev) => ({ ...prev, [id]: value }));
    };
  
    // Theme check effect
    useEffect(() => {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const comments = TEXT_QUESTION_IDS
        .map((id) => ({ question: id, text: (responses[id] || '').trim() }))
        .filter((item) => item.text);
  
      if (comments.length === 0) {
        setThemeCheck({ checking: false, blocked: false, message: '' });
        return;
      }
  
      let cancelled = false;
      setThemeCheck((prev) => ({ ...prev, checking: true, message: '' }));
  
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/feedback/theme-check/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ comments }),
          });
  
          if (cancelled) return;
  
          if (!res.ok) {
            setThemeCheck({ checking: false, blocked: false, message: '' });
            return;
          }
  
          const data = await res.json();
          if (cancelled) return;
  
          if (data.blocked) {
            const fieldErrors = mapViolationsToFieldErrors(data.violations || []);
            setCommentFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
            setThemeCheck({
              checking: false,
              blocked: true,
              message: buildStudentFriendlySecurityMessage(data.violations),
            });
          } else {
            setThemeCheck({ checking: false, blocked: false, message: '' });
          }
        } catch {
          if (!cancelled) {
            setThemeCheck({ checking: false, blocked: false, message: '' });
          }
        }
      }, 450);
  
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [API_BASE_URL, responses, TEXT_QUESTION_IDS.join(',')]);
  
    const handleSubmit = async () => {
      const allQuestions = sections.flatMap(s => s.questions);
      const missing = allQuestions.filter(q => {
        const val = responses[q.id];
        if (q.type === 'text') return !val || !val.trim();
        return !val;
      });
  
      if (missing.length > 0) {
        setSubmitError(`Please answer all questions. Missing: ${missing.map(q => q.question).join(', ')}`);
        return;
      }
  
      if (inputError) {
        setSubmitError('Please fix the input errors before submitting.');
        return;
      }
  
      if (themeCheck.checking) {
        setSubmitError('Please wait while comments are being checked.');
        return;
      }
  
      if (themeCheck.blocked) {
        setSubmitError(themeCheck.message || 'Some comments are not allowed. Please edit and try again.');
        return;
      }
  
      setSubmitting(true);
      setSubmitError('');
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const formIdentifier =
        formType === 'Instructor'
          ? instructorFormId
          : (evalFormId || moduleData?.code || moduleId);
  
      const payload = {
        form_type: formType === 'Module' ? 'module' : 'instructor',
        form_id: formIdentifier,
        is_anonymous: false,
        pseudonym: localStorage.getItem('anonPseudonym') || null,
        responses: allQuestions.map(q => ({
          question: q.id,
          ...(q.type === 'text'
            ? { comment: responses[q.id] || '' }
            : { rating: parseInt(responses[q.id], 10) }),
        })),
      };
  
      try {
        const res = await fetch(`${API_BASE_URL}/feedback/submit/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
  
        const data = await res.json().catch(() => ({}));
  
        if (!res.ok) {
          setSubmitError(data?.detail || data?.non_field_errors?.[0] || JSON.stringify(data) || 'Submission failed');
          return;
        }
  
        setSubmitted(true);
      } catch (err) {
        setSubmitError(err.message || 'Network error');
      } finally {
        setSubmitting(false);
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
        <div className="flex flex-1">
          <Sidebar role="student" activeItem="evaluation" />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
              <p className="text-slate-500">Loading evaluation form...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
        <div className="flex flex-1">
          <Sidebar role="student" activeItem="evaluation" onLogout={() => {}} />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <h1 className="text-2xl font-black text-slate-900 mb-2">Thank you</h1>
              <p className="text-slate-500 mb-4">Your feedback has been submitted.</p>
              <button onClick={() => window.history.back()} className="bg-[#1f474d] text-white px-4 py-2 rounded">Back to Evaluations</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || sections.length === 0 || (formType === 'Module' && !moduleData) || (formType === 'Instructor' && !instructorData)) {
    return (
      <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
        <div className="flex flex-1">
          <Sidebar role="student" activeItem="evaluation" />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Error</h1>
              <p className="text-slate-500 mb-4">{error || 'No questions found for this evaluation form.'}</p>
              <button onClick={() => window.history.back()} className="bg-[#1f474d] text-white px-4 py-2 rounded">Back to Evaluations</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
      <div className="flex flex-1">
        <Sidebar role="student" activeItem="evaluation" onLogout={() => {}} />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-3xl mx-auto space-y-8">

            {/* Top Navigation */}
            <div className="flex flex-col gap-4">
              <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-teal-700 w-fit">
                <ArrowLeft size={16} /> Back to Evaluations
              </button>
              <div>
                {formType === 'Module' && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono font-bold">{moduleData.code}</span>}
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Unified Module and Instructor Evaluation</p>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {formType === 'Module' ? moduleData.title : (instructorData?.name || 'Instructor')}
                </h1>

                {/* show description below the name, not in place of it */}
                {formType === 'Module' && moduleData.description && (
                  <p className="text-slate-500">{moduleData.description}</p>
                )}

                {formType === 'Module' ? (
                  <p className="text-slate-500">{moduleData.instructor}</p>
                ) : (
                  instructorData?.description ? <p className="text-slate-500">{instructorData.description}</p> : null
                )}
              </div>
            </div>

            {/* Section Progress Bar Indicators */}
            <div className="grid grid-cols-3 gap-3 pb-2">
              {sections.map((section, idx) => {
                const isComplete = isSectionComplete(idx);
                const isCurrent = idx === currentSection;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentSection(idx)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all text-center ${
                      isCurrent
                        ? 'bg-[#1f474d] text-white shadow'
                        : isComplete
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isComplete && !isCurrent && <CheckCircle size={12} className="inline mr-1" />}
                    {section.title}
                  </button>
                );
              })}
            </div>

            {/* Questions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-2xl font-black text-slate-800">{sections[currentSection].title}</h2>
                <p className="text-slate-500 text-sm">{sections[currentSection].description}</p>
              </div>

              <div className="p-6 space-y-10">
                {sections[currentSection].questions.map((q, idx) => (
                  <div key={q.id} className="space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400">{idx + 1}</span>
                      <label className="text-lg font-bold text-slate-800 leading-tight pt-1">{q.question}</label>
                    </div>

                    <div className="pl-12">
                      {q.type === 'scale' && (
                        <div className="flex items-center gap-4 max-w-3xl">
                          <div className="flex items-center gap-3 flex-1 justify-center">
                            {[
                              { v: 1, label: 'Rarely', selected: 'bg-red-500 border-red-600 text-white', normal: 'bg-white border-slate-200 text-slate-700' },
                              { v: 2, label: 'Sometimes', selected: 'bg-orange-400 border-orange-500 text-white', normal: 'bg-white border-slate-200 text-slate-700' },
                              { v: 3, label: 'Often', selected: 'bg-amber-400 border-amber-500 text-white', normal: 'bg-white border-slate-200 text-slate-700' },
                              { v: 4, label: 'Almost Always', selected: 'bg-emerald-400 border-emerald-500 text-white', normal: 'bg-white border-slate-200 text-slate-700' },
                            ].map(opt => (
                              <button
                                key={opt.v}
                                onClick={() => handleResponse(q.id, opt.v.toString())}
                                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all text-xs font-bold ${
                                  responses[q.id] === opt.v.toString() ? opt.selected : opt.normal
                                }`}
                              >
                                <span className="text-lg">{opt.v}</span>
                                <span className="hidden sm:block">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {q.type === 'rating' && (
                        <div className="flex items-center gap-3">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                            <button
                              key={star}
                              onMouseEnter={() => setHoverStar(prev => ({ ...prev, [q.id]: star }))}
                              onMouseLeave={() => setHoverStar(prev => ({ ...prev, [q.id]: null }))}
                              onClick={() => handleResponse(q.id, star.toString())}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                size={32}
                                className={`${Number(hoverStar[q.id] ?? responses[q.id] ?? 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                              />
                            </button>
                          ))}
                          {responses[q.id] && <span className="ml-4 text-xl font-black text-slate-800">{responses[q.id]} / 10</span>}
                        </div>
                      )}

                      {q.type === 'text' && (
                        <>
                          <textarea
                            className={`w-full rounded-2xl p-5 focus:outline-none focus:ring-2 min-h-[120px] ${
                              commentFieldErrors[q.id]
                                ? 'bg-red-50 border border-red-400 focus:ring-red-500/20'
                                : 'bg-slate-50 border border-slate-200 focus:ring-teal-500/20'
                            }`}
                            placeholder="Type your feedback here..."
                            value={responses[q.id] || ''}
                            onChange={(e) => handleTextResponse(q.id, e.target.value)}
                          />
                          {commentFieldErrors[q.id] && (
                            <p className="mt-2 text-sm text-red-600">{commentFieldErrors[q.id]}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation / Submit */}
            {themeCheck.message && <div className="text-sm text-red-500 mb-2">{themeCheck.message}</div>}
            {themeCheck.checking && <div className="text-sm text-slate-500 mb-2">Checking comment content...</div>}
            {inputError && <div className="text-sm text-red-500 mb-2">{inputError}</div>}
            {submitError && <div className="text-sm text-red-500 mb-2">{submitError}</div>}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
              {currentSection > 0 && (
                <button
                  onClick={() => setCurrentSection(prev => prev - 1)}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200"
                >
                  <ArrowLeft size={18} /> Previous
                </button>
              )}
              <div className="flex-1" />
              {currentSection === sections.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || themeCheck.blocked || themeCheck.checking}
                  className="flex items-center gap-2 px-8 py-3 bg-[#1f474d] text-white rounded-xl font-black hover:bg-[#2a5d65] disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit'} <Send size={18} />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!isSectionComplete(currentSection)}
                  className="flex items-center gap-2 px-8 py-3 bg-[#1f474d] text-white rounded-xl font-black hover:bg-[#2a5d65] disabled:opacity-50"
                >
                  Next Section <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EvaluationForm;