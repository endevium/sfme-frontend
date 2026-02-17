import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeImg from '../components/SafeImg';
import studentCutout from '../assets/students-cutout.png';
import heroTextPng from '../assets/hero-text.png';
import studentGroupImg from '../assets/group-students.png';
import starDoodleImg from '../assets/star-doodle.png';
import sectionText from '../assets/text2.png';
import sectionText2 from '../assets/text3.png';
import sectionText3 from '../assets/text4.png';
import campusBg from '../assets/campus-bg.jpg';
import featureIcon1 from '../assets/featurecardlogo1.png';
import featureIcon2 from '../assets/featurecardlogo2.png';
import featureIcon3 from '../assets/featurecardlogo3.png';
import featureIcon4 from '../assets/featurecardlogo4.png';

const LandingPage = () => {
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    let storedUser = null;
    try {
      storedUser = JSON.parse(localStorage.getItem('authUser') || 'null');
    } catch {
      storedUser = null;
    }

    const returnedRole = storedUser?.user_type;
    if (returnedRole === 'student') {
      window.history.replaceState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (returnedRole === 'faculty') {
      window.history.replaceState({}, '', '/faculty-dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (returnedRole === 'department_head' || returnedRole === 'depthead') {
      window.history.replaceState({}, '', '/depthead-dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);
  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-white selection:bg-yellow-400 selection:text-slate-900 overflow-x-hidden">
      
      {/* WRAPPER WITH BACKGROUND */}
      <div 
        className="bg-cover bg-center bg-fixed min-h-screen relative"
        style={{ backgroundImage: `url(${campusBg})` }}
      >
        {/* Overlay to ensure text readability across all browsers */}
        <div className="absolute inset-0 bg-slate-900/40 z-0"></div>
        
        <div className="relative z-10">
          <Navbar />

          {/* HERO SECTION */}
          <header className="pt-16 pb-12 md:pt-32 md:pb-24">
            <div className="container mx-auto px-6 max-w-6xl grid grid-cols-1 md:grid-cols-2 items-center gap-12">
              
              <div className="hero-content flex flex-col items-center md:items-start text-center md:text-left">
                <SafeImg
                  src={heroTextPng}
                  alt="YOUR VOICE SHAPES OUR FUTURE"
                  className="w-full max-w-[500px] lg:max-w-[700px] mb-8 md:-translate-x-10 lg:-translate-x-20 transition-transform duration-500"
                />
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <button className="bg-[#ffcc00] text-[#041c32] px-8 py-4 rounded-lg font-bold hover:scale-105 transition-all shadow-lg text-center">
                    Get Started →
                  </button>
                  <a href="/about" className="inline-block bg-white/10 backdrop-blur-md border border-white/40 px-8 py-4 rounded-lg hover:bg-white/20 transition-all text-center">
                    Learn More
                  </a>
                </div>
              </div>

              <div className="relative flex justify-center items-end mt-12 md:mt-0">
                <SafeImg
                  src={studentCutout}
                  alt="Students"
                  className="w-full max-w-[450px] lg:max-w-[600px] drop-shadow-2xl z-10"
                />
              </div>
            </div>
          </header>

          {/* WHY SECTION */}
          <section className="py-16 md:py-24 bg-slate-900/60 backdrop-blur-sm">
            <div className="container mx-auto px-6 max-w-6xl">
              <SafeImg src={sectionText2} alt="Title" className="max-w-full h-auto mb-6 mx-auto md:mx-0" />
              <p className="text-lg md:text-xl opacity-90 tracking-wide leading-relaxed max-w-2xl mb-12 text-center md:text-left">
                A modern, streamlined approach to course evaluation designed with students in mind.
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { img: featureIcon1, text: "Multi-dimensional assessment covering instructor effectiveness, course content, and learning environment." },
                  { img: featureIcon2, text: "Track your evaluation progress and view detailed submission history with instant feedback." },
                  { img: featureIcon3, text: "Your responses are confidential and secure, ensuring honest and constructive feedback." },
                  { img: featureIcon4, text: "Stay on top of evaluation deadlines with automatic reminders and progress tracking." }
                ].map((feature, i) => (
                  <div 
                    key={i} 
                    className="bg-gradient-to-b from-[#23334a] to-[#254148] p-8 rounded-[24px] border border-white/10 hover:-translate-y-3 hover:shadow-2xl transition-all duration-300 flex flex-col items-start"
                  >
                      <div className="w-full flex justify-center mb-6">
                      <SafeImg src={feature.img} alt="Icon" className="w-20 h-20 object-contain" />
                    </div>
                    <p className="text-[0.95rem] leading-relaxed opacity-80 text-left">
                      {feature.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Student Group Decoration */}
              <div className="relative mt-20 flex flex-col items-center md:items-start">
                <SafeImg src={studentGroupImg} alt="Students" className="w-full max-w-[600px] z-10 rounded-2xl" />
                <SafeImg
                  src={starDoodleImg}
                  alt="Decoration"
                  className="hidden lg:block absolute -right-20 -bottom-20 w-[300px] z-0 opacity-50"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* MAKE YOUR VOICE HEARD */}
      <section className="py-20 bg-[#0d1b2a]">
        <div className="container mx-auto px-6 max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <SafeImg src={sectionText} alt="Voice" className="max-w-full h-auto mb-8" />
            <p className="text-base opacity-85 mb-8 leading-relaxed">
              Your feedback is crucial in helping Upang maintain high educational standards.
            </p>
            <ul className="space-y-5">
              {[
                "Easy-to-use interface with step-by-step evaluation process",
                "Mobile-responsive design for evaluations on any device",
                "Instant submission confirmation and history tracking",
                "Help shape the future of education at UPANG"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-sm md:text-base">
                  <span className="bg-[#ffcc00] text-[#041c32] w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 font-bold">✔</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 lg:order-2 bg-[#144272] rounded-[32px] p-8 md:p-12 shadow-2xl border border-white/5">
            <h3 className="text-[#ffcc00] text-2xl font-bold mb-4 tracking-tight">READY TO GET STARTED?</h3>
            <p className="text-white/80 mb-8">Sign in using your Student Number and Start your evaluation</p>
            <button className="w-full bg-[#ffcc00] text-[#041c32] py-4 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg">
              Get Started →
            </button>
            <p className="text-[0.75rem] opacity-50 mt-6 text-center italic">
              Note: All evaluations are anonymous and confidential.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative bg-[#1b263b] py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[#0d1b2a] [clip-path:polygon(0_15%,100%_0,100%_100%,0%_100%)] z-0"></div>
        
        <div className="container mx-auto px-6 max-w-6xl relative z-0">
          <div className="text-center mb-16">
            <SafeImg src={sectionText3} alt="How it works" className="mx-auto mb-6 max-w-full" />
            <p className="text-lg opacity-80">Simple, straightforward evaluation process.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: "👤", title: "Log In", desc: "Access your account using your student credentials" },
              { icon: "📝", title: "Select Module", desc: "Choose from your enrolled courses ready for evaluation" },
              { icon: "📨", title: "Submit Feedback", desc: "Complete the evaluation form and submit your responses" }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center group">
                <div className="w-24 h-24 bg-[#ffcc00] text-[#0d1b2a] rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl group-hover:rotate-12 transition-transform">
                  {step.icon}
                </div>
                <h4 className="text-2xl font-bold mb-3">{step.title}</h4>
                <p className="text-center opacity-70 px-4 leading-snug">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;