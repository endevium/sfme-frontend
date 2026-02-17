import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { ArrowLeft, ArrowRight, CheckCircle, Star, Send } from 'lucide-react';

const EvaluationForm = ({ moduleId, instructorFormId }) => {
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

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const formType = instructorFormId ? 'Instructor' : 'Module';

  useEffect(() => {
   const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
  
    const fetchModuleData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/students/me/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.detail || 'Failed to load module data');
          return;
        }
        const list = data?.enrolled_modules || [];
        const module = list.find(m => m.id === moduleId);
        if (module) {
          setModuleData({
            id: module.id,
            code: module.code,
            name: module.name,
            instructor: module.instructor,
          });
        } else {
          setError('Module not found');
        }
      } catch (err) {
        setError('Failed to load module data');
      } finally {
        setLoading(false);
      }
    };
  
    const fetchInstructorData = async () => {
      try {
        // Try to fetch the instructor form meta (if endpoint exists)
        const res = await fetch(`${API_BASE_URL}/instructor-evaluation-forms/${instructorFormId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setInstructorData({
            id: data?.id ?? instructorFormId,
            name: data?.title || data?.instructor_name || 'Instructor',
            status: data?.status,
            description: data?.description || '',
          });
        } else {
          // If detail endpoint doesn't exist, still allow rendering the form UI
          setInstructorData({
            id: instructorFormId,
            name: 'Instructor',
            status: null,
            description: '',
          });
        }
      } catch {
        // Allow rendering anyway (questions are static)
        setInstructorData({
          id: instructorFormId,
          name: 'Instructor',
          status: null,
          description: '',
        });
      } finally {
        setLoading(false);
      }
    };
  
    setLoading(true);
    setError('');
    setSubmitError('');
  
    if (formType === 'Module') {
      if (!moduleId) {
        setError('Module not found');
        setLoading(false);
        return;
      }
      fetchModuleData();
      return;
    }
  
    // Instructor form
    if (!instructorFormId) {
      setError('Instructor form not found');
      setLoading(false);
      return;
    }
    fetchInstructorData();
  }, [API_BASE_URL, formType, moduleId, instructorFormId]);

  const moduleSections = [
    {
      title: "Instructor Effectiveness",
      description: "Evaluation of teaching methods and effectiveness",
      questions: [
        { id: "inst_1", category: "Instructor", question: "The instructor demonstrates mastery of the subject matter", type: "scale" },
        { id: "inst_2", category: "Instructor", question: "The instructor explains concepts clearly and effectively", type: "scale" },
        { id: "inst_3", category: "Instructor", question: "The instructor is well-prepared for each class session", type: "scale" },
        { id: "inst_4", category: "Instructor", question: "The instructor encourages student participation and questions", type: "scale" },
        { id: "inst_5", category: "Instructor", question: "The instructor is available and responsive during consultation hours", type: "scale" },
      ],
    },
    {
      title: "Course Content & Materials",
      description: "Rating the quality and relevance of materials",
      questions: [
        { id: "content_1", category: "Content", question: "The course content is relevant to my program of study", type: "scale" },
        { id: "content_2", category: "Content", question: "Learning materials (slides, handouts, readings) are helpful and clear", type: "scale" },
        { id: "content_3", category: "Content", question: "Assignments and activities reinforce learning objectives", type: "scale" },
        { id: "content_4", category: "Content", question: "The workload is appropriate for the credit hours", type: "scale" },
        { id: "content_5", category: "Content", question: "The course syllabus was followed consistently", type: "scale" },
      ],
    },
    {
      title: "Assessment & Feedback",
      description: "Evaluation of grading and feedback mechanisms",
      questions: [
        { id: "assess_1", category: "Assessment", question: "Grading criteria are clear and fair", type: "scale" },
        { id: "assess_2", category: "Assessment", question: "Feedback on assignments is timely and constructive", type: "scale" },
        { id: "assess_3", category: "Assessment", question: "Examinations fairly assess understanding of course material", type: "scale" },
        { id: "assess_4", category: "Assessment", question: "I received adequate feedback to improve my performance", type: "scale" },
      ],
    },
    {
      title: "Learning Environment",
      description: "Rating the overall classroom experience",
      questions: [
        { id: "env_1", category: "Environment", question: "The classroom environment is conducive to learning", type: "scale" },
        { id: "env_2", category: "Environment", question: "Technology and resources used in class are effective", type: "scale" },
        { id: "env_3", category: "Environment", question: "The instructor creates an inclusive and respectful atmosphere", type: "scale" },
        { id: "env_4", category: "Environment", question: "Overall, this course met my learning expectations", type: "scale" },
      ],
    },
    {
      title: "Overall Rating & Comments",
      description: "Final assessment and open-ended feedback",
      questions: [
        { id: "overall_rating", category: "Overall", question: "Overall rating of this course", type: "rating" },
        { id: "overall_instructor", category: "Overall", question: "Overall rating of the instructor", type: "rating" },
        { id: "strengths", category: "Feedback", question: "What are the strengths of this course?", type: "text" },
        { id: "improvements", category: "Feedback", question: "What improvements would you suggest?", type: "text" },
        { id: "additional", category: "Feedback", question: "Additional comments or feedback", type: "text" },
      ],
    },
  ];

  const instructorSections = [
    {
      title: "Teaching Competence",
      description: "Focuses on the instructor's expertise and clarity",
      questions: [
        { id: "comp_1", category: "Competence", question: "Demonstrates comprehensive knowledge of the subject matter", type: "scale" },
        { id: "comp_2", category: "Competence", question: "Explains concepts in a clear and understandable manner", type: "scale" },
        { id: "comp_3", category: "Competence", question: "Uses relevant examples and real-world applications", type: "scale" },
        { id: "comp_4", category: "Competence", question: "Answers student questions effectively and accurately", type: "scale" },
        { id: "comp_5", category: "Competence", question: "Stays current with developments in the field", type: "scale" },
      ],
    },
    {
      title: "Teaching Methods & Delivery",
      description: "Focuses on how the material is presented",
      questions: [
        { id: "method_1", category: "Methods", question: "Uses diverse teaching methods appropriate to the subject", type: "scale" },
        { id: "method_2", category: "Methods", question: "Paces lessons appropriately for student comprehension", type: "scale" },
        { id: "method_3", category: "Methods", question: "Presents material in an organized and logical manner", type: "scale" },
        { id: "method_4", category: "Methods", question: "Integrates technology effectively in teaching", type: "scale" },
        { id: "method_5", category: "Methods", question: "Provides clear instructions for assignments and activities", type: "scale" },
      ],
    },
    {
      title: "Student Engagement & Interaction",
      description: "Focuses on classroom atmosphere and participation",
      questions: [
        { id: "engage_1", category: "Engagement", question: "Encourages active student participation in class", type: "scale" },
        { id: "engage_2", category: "Engagement", question: "Creates opportunities for class discussion and collaboration", type: "scale" },
        { id: "engage_3", category: "Engagement", question: "Shows enthusiasm and passion for the subject", type: "scale" },
        { id: "engage_4", category: "Engagement", question: "Respects diverse perspectives and student opinions", type: "scale" },
        { id: "engage_5", category: "Engagement", question: "Makes students feel comfortable asking questions", type: "scale" },
      ],
    },
    {
      title: "Assessment & Feedback",
      description: "Focuses on how the instructor evaluates student work",
      questions: [
        { id: "feedback_1", category: "Feedback", question: "Provides clear grading criteria and expectations", type: "scale" },
        { id: "feedback_2", category: "Feedback", question: "Returns graded work in a timely manner", type: "scale" },
        { id: "feedback_3", category: "Feedback", question: "Gives constructive feedback that helps improve learning", type: "scale" },
        { id: "feedback_4", category: "Feedback", question: "Assessments fairly measure course learning objectives", type: "scale" },
        { id: "feedback_5", category: "Feedback", question: "Is fair and consistent in grading student work", type: "scale" },
      ],
    },
    {
      title: "Professionalism & Availability",
      description: "Focuses on conduct, punctuality, and responsiveness",
      questions: [
        { id: "prof_1", category: "Professionalism", question: "Starts and ends classes on time", type: "scale" },
        { id: "prof_2", category: "Professionalism", question: "Is well-prepared for each class session", type: "scale" },
        { id: "prof_3", category: "Professionalism", question: "Maintains regular and announced office/consultation hours", type: "scale" },
        { id: "prof_4", category: "Professionalism", question: "Responds to emails and inquiries promptly", type: "scale" },
        { id: "prof_5", category: "Professionalism", question: "Demonstrates professionalism and respect toward students", type: "scale" },
      ],
    },
    {
      title: "Overall Rating & Comments",
      description: "Final summary and qualitative feedback",
      questions: [
        { id: "overall_rating", category: "Overall", question: "Overall rating of this instructor's teaching effectiveness", type: "rating" },
        { id: "overall_recommend", category: "Overall", question: "Would you recommend this instructor to other students?", type: "rating" },
        { id: "strengths", category: "Feedback", question: "What are the instructor's greatest strengths?", type: "text" },
        { id: "improvements", category: "Feedback", question: "What areas could the instructor improve?", type: "text" },
        { id: "additional", category: "Feedback", question: "Additional comments or feedback", type: "text" },
      ],
    },
  ];

  const sections = formType === 'Module' ? moduleSections : instructorSections;

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  const answeredCount = Object.keys(responses).length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;

  const handleResponse = (id, val) => setResponses(prev => ({ ...prev, [id]: val }));
  
  const isSectionComplete = (idx) => sections[idx].questions.every(q => responses[q.id]);

  const handleNext = () => currentSection < sections.length - 1 && setCurrentSection(prev => prev + 1);
  const handlePrevious = () => currentSection > 0 && setCurrentSection(prev => prev - 1);
  
  const handleSubmit = async () => {
    // ensure all questions are answered (text fields must be non-empty)
    const allQuestions = sections.flatMap(s => s.questions);
    const missing = allQuestions.filter(q => {
    const val = responses[q.id];
    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
    });
    if (missing.length > 0) {
      const first = missing[0];
      const sectionIdx = sections.findIndex(s => s.questions.some(qq => qq.id === first.id));
      setCurrentSection(sectionIdx >= 0 ? sectionIdx : 0);
      setSubmitError(`Please answer: "${first.question}"`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const formIdentifier =
      formType === 'Instructor'
        ? instructorFormId
        : (moduleData?.id ?? moduleData?.code ?? moduleId);

    const payload = {
      form_type: formType === 'Module' ? 'module' : 'instructor',
      form_id: formIdentifier,
      is_anonymous: false,
      pseudonym: localStorage.getItem('anonPseudonym') || null,
      responses: allQuestions.map(q => {
        const val = responses[q.id];
          if (q.type === 'text') return { question: q.id, comment: val || '' };
            return { question: q.id, rating: parseInt(val, 10) };
          }),
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
        const msg = data?.detail || data?.errors || JSON.stringify(data) || 'Failed to submit feedback';
        setSubmitError(Array.isArray(msg) ? msg.join('; ') : (typeof msg === 'object' ? JSON.stringify(msg) : msg));
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError('Network error: failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
        <div className="flex flex-1">
          <Sidebar role="student" activeItem="modules" />
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
          <Sidebar role="student" activeItem="modules" onLogout={() => {}} />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <h1 className="text-2xl font-black text-slate-900 mb-2">Thank you</h1>
              <p className="text-slate-500 mb-4">Your feedback has been submitted.</p>
              <button onClick={() => window.history.back()} className="bg-[#1f474d] text-white px-4 py-2 rounded">Back to Modules</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || (formType === 'Module' && !moduleData) || (formType === 'Instructor' && !instructorData)) {
    return (
      <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
        <div className="flex flex-1">
          <Sidebar role="student" activeItem="modules" />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Error</h1>
              <p className="text-slate-500 mb-4">{error || 'Form not found'}</p>
              <button onClick={() => window.history.back()} className="bg-[#1f474d] text-white px-4 py-2 rounded">Back to Modules</button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-800 bg-slate-50 flex flex-col">
      <div className="flex flex-1">
        <Sidebar role="student" activeItem="modules" onLogout={() => {}} />
        
        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Top Navigation */}
            <div className="flex flex-col gap-4">
              <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-teal-700 w-fit">
                <ArrowLeft size={16} /> Back to Modules
              </button>
              <div>
                {formType === 'Module' && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono font-bold">{moduleData.code}</span>}
                <h1 className="text-4xl font-black text-slate-900 mt-2">
                 {formType === 'Module' ? moduleData.name : (instructorData?.name || 'Instructor')}
               </h1>
               {formType === 'Module' ? (
                 <p className="text-slate-500">{moduleData.instructor}</p>
               ) : (
                 instructorData?.description ? <p className="text-slate-500">{instructorData.description}</p> : null
               )}
              </div>
            </div>

            {/* Section Progress Bar Indicators */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {sections.map((section, idx) => {
                const isComplete = isSectionComplete(idx);
                const isCurrent = idx === currentSection;
                return (
                  <button 
                    key={idx} 
                    onClick={() => setCurrentSection(idx)}
                    className={`flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all text-left min-w-[160px] ${
                      isCurrent ? "border-[#1f474d] bg-teal-50/30" : isComplete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isComplete ? <CheckCircle size={14} className="text-emerald-500" /> : <div className={`w-2 h-2 rounded-full ${isCurrent ? "bg-teal-500" : "bg-slate-300"}`} />}
                      <span className={`text-[11px] font-black uppercase tracking-widest ${isCurrent ? "text-teal-700" : "text-slate-400"}`}>Section {idx + 1}</span>
                    </div>
                    <p className={`text-sm font-bold truncate ${isCurrent ? "text-slate-900" : "text-slate-500"}`}>{section.title.split(' ')[0]}</p>
                  </button>
                );
              })}
            </div>

            {/* Main Question Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                <h2 className="text-2xl font-black text-slate-800">{sections[currentSection].title}</h2>
                <p className="text-slate-500 text-sm">{sections[currentSection].description}</p>
              </div>

              <div className="p-8 space-y-10">
                {sections[currentSection].questions.map((q, idx) => (
                  <div key={q.id} className="space-y-4">
                    <div className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400">{idx + 1}</span>
                        <label className="text-lg font-bold text-slate-800 leading-tight pt-1">{q.question}</label>
                    </div>

                    <div className="pl-12">
                        {q.type === 'scale' && (
                           // For sections 1-4 render a horizontal 5→1 pill selector with colored styles
                           (currentSection >= 0 && currentSection < 5) ? (
                            <div className="flex items-center gap-4 max-w-3xl">
              
                              <div className="flex items-center gap-3 flex-1 justify-center">
                                {[
                                  {v:1, label: 'Strongly Disagree', selected: 'bg-red-500 border-red-600 text-white', normal: 'bg-white border-slate-200 text-slate-700'},
                                  {v:2, label: 'Disagree', selected: 'bg-orange-400 border-orange-500 text-white', normal: 'bg-white border-slate-200 text-slate-700'},
                                  {v:3, label: 'Neutral', selected: 'bg-amber-400 border-amber-500 text-white', normal: 'bg-white border-slate-200 text-slate-700'},
                                  {v:4, label: 'Agree', selected: 'bg-emerald-400 border-emerald-500 text-white', normal: 'bg-white border-slate-200 text-slate-700'},
                                  {v:5, label: 'Strongly Agree', selected: 'bg-emerald-600 border-emerald-700 text-white', normal: 'bg-white border-slate-200 text-slate-700'},
                                ].map(opt => {
                                  const selected = responses[q.id] === opt.v.toString();
                                  return (
                                    <button
                                      key={opt.v}
                                      onClick={() => handleResponse(q.id, opt.v.toString())}
                                      className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-shadow ${selected ? opt.selected : opt.normal}`}
                                      aria-pressed={selected}
                                    >
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black ${selected ? 'bg-white/10' : 'bg-slate-100'}`}>
                                        {opt.v}
                                      </div>
                                      <span className="text-sm font-semibold">{opt.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              
                            </div>
                           ) : (
                            <div className="flex flex-col gap-2 max-w-md">
                                 {[
                                     {v: "5", l: "Strongly Agree", c: "bg-emerald-500"},
                                     {v: "4", l: "Agree", c: "bg-emerald-400"},
                                     {v: "3", l: "Neutral", c: "bg-amber-400"},
                                     {v: "2", l: "Disagree", c: "bg-orange-400"},
                                     {v: "1", l: "Strongly Disagree", c: "bg-red-500"}
                                 ].map(s => (
                                     <button 
                                         key={s.v}
                                         onClick={() => handleResponse(q.id, s.v)}
                                         className={`flex items-center p-3 rounded-xl border-2 transition-all ${
                                             responses[q.id] === s.v ? "border-teal-600 bg-teal-50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                         }`}>
                                         <div className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-black mr-4 ${s.c}`}>{s.v}</div>
                                         <span className="text-sm font-bold text-slate-700">{s.l}</span>
                                     </button>
                                 ))}
                            </div>
                           )
                        )}

                        {q.type === 'rating' && (
                            <div className="flex items-center gap-3">
                                {[1,2,3,4,5].map(star => (
                                  <button 
                                    key={star}
                                    onMouseEnter={() => setHoverStar(prev => ({ ...prev, [q.id]: star }))}
                                    onMouseLeave={() => setHoverStar(prev => ({ ...prev, [q.id]: null }))}
                                    onClick={() => handleResponse(q.id, star.toString())}
                                    className="transition-transform hover:scale-110"
                                  >
                                    <Star 
                                      size={40} 
                                      className={`${Number(hoverStar[q.id] ?? responses[q.id] ?? 0) >= star ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} 
                                    />
                                  </button>
                                ))}
                                {responses[q.id] && <span className="ml-4 text-xl font-black text-slate-800">{responses[q.id]} / 5</span>}
                            </div>
                        )}

                        {q.type === 'text' && (
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-h-[120px]"
                                placeholder="Type your feedback here..."
                                value={responses[q.id] || ""}
                                onChange={(e) => handleResponse(q.id, e.target.value)}
                            />
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Navigation */}
            {submitError && <div className="text-sm text-red-500 mb-2">{submitError}</div>}
             <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                {currentSection === sections.length - 1 ? (
                    <button 
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100"
                    >
                        {submitting ? 'Submitting...' : 'Submit'} <Send size={18} />
                    </button>
                ) : (
                     <button 
                         onClick={handleNext}
                         disabled={!isSectionComplete(currentSection)}
                         className="flex items-center gap-2 px-8 py-3 bg-[#1f474d] text-white rounded-xl font-black hover:bg-[#163539] disabled:opacity-50"
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