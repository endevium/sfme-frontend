import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SafeImg from '../components/SafeImg';
import LoginModal from '../components/LoginModal';

// Assets
import studentCutout from '../assets/students-cutout.png';
import heroTextPng from '../assets/hero-text.png';
import studentGroupImg from '../assets/group-students.png';
import sectionText from '../assets/text2.png';
import sectionText2 from '../assets/text3.png';
import sectionText3 from '../assets/text4.png';
import campusBg from '../assets/campus-bg.jpg';
import yellowWave from '../assets/yellow.png';
import greenWave from '../assets/green.png';
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

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-white selection:bg-yellow-400 selection:text-slate-900 overflow-x-hidden">
      <Navbar />
      {/* 1. HERO SECTION (Full Screen) */}
      <div 
        className="bg-cover bg-center bg-fixed min-h-screen relative flex flex-col"
        style={{ backgroundImage: `url(${campusBg})` }}
      >
        <div className="absolute inset-0 bg-slate-900/40 z-0 pointer-events-none"></div>
        
        <div className="relative z-1 flex flex-col flex-1">
          

          {/* Changed to flex-1 to fill the remaining space after navbar */}
          <header className="flex-1 flex items-center justify-center pt-12 pb-24">
            <div className="container mx-auto px-6 max-w-6xl grid grid-cols-1 md:grid-cols-2 items-center gap-12">
              
              <div className="flex flex-col items-center md:items-start text-center md:text-left z-10">
                <SafeImg
                  src={heroTextPng}
                  alt="YOUR VOICE"
                  className="w-full max-w-[400px] sm:max-w-[450px] md:max-w-[500px] lg:max-w-[650px] mb-8"
                />
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="bg-[#ffcc00] text-[#041c32] px-8 py-4 rounded-lg font-bold hover:scale-105 transition-all shadow-lg text-center"
                  >
                    Get Started →
                  </button>
                  <a href="/about" className="inline-block bg-white/10 backdrop-blur-md border border-white/40 px-8 py-4 rounded-lg hover:bg-white/20 transition-all text-center">
                    Learn More
                  </a>
                </div>
              </div>

              <div className="flex justify-center items-end mt-8 md:mt-0 relative z-10">
                <SafeImg
                  src={studentCutout}
                  alt="Students"
                  className="w-full max-w-[350px] sm:max-w-[450px] lg:max-w-[550px] drop-shadow-2xl transform lg:scale-150 origin-bottom transition-all duration-300 lg:translate-y-20"
                />
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* YELLOW WAVE DIVIDER */}
      <div className="w-full relative z-10 bg-gradient-to-b from-[#041c32] to-[#1a3a4a]"> 
        <SafeImg
          src={yellowWave}
          alt="Yellow wave"
          className="w-full h-auto block -translate-y-[99%] absolute top-0 left-0 pointer-events-none"
        />

        {/* 2. WHY SECTION (Full Screen) */}
        {/* Added min-h-screen and flex alignment */}
        <section className="relative min-h-screen flex flex-col justify-center py-16 px-6 overflow-hidden">
          <div className="container mx-auto max-w-6xl relative z-10">
            
            <div className="flex flex-col items-center md:items-start mb-12">
              <SafeImg src={sectionText2} alt="Title" className="max-w-[300px] md:max-w-[400px] lg:max-w-full h-auto mb-6" />
              <p className="text-lg md:text-xl opacity-90 tracking-wide leading-relaxed max-w-2xl text-center md:text-left">
                A modern, streamlined approach to course evaluation designed with students in mind.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 flex justify-center lg:justify-start">
                <SafeImg 
                  src={studentGroupImg} 
                  alt="Students" 
                  className="w-full max-w-[400px] lg:max-w-full h-auto z-10 drop-shadow-2xl transform lg:scale-105 origin-left" 
                />
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:-translate-y-4">
                {[
                  { img: featureIcon1, text: "Multi-dimensional assessment covering effectiveness, content, and environment." },
                  { img: featureIcon2, text: "Track your evaluation progress and view detailed submission history." },
                  { img: featureIcon3, text: "Your responses are 100% confidential and securely encrypted." },
                  { img: featureIcon4, text: "Stay on top of deadlines with automatic reminders and tracking." }
                ].map((feature, i) => (
                  <div key={i} className="bg-[#162a3d] p-6 rounded-[24px] border border-white/5 shadow-xl hover:-translate-y-2 transition-transform duration-300">
                    <SafeImg src={feature.img} alt="Icon" className="w-12 h-12 mb-4 object-contain" />
                    <p className="text-sm leading-relaxed opacity-80">{feature.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
            <SafeImg src={greenWave} alt="Green Wave" className="w-full h-auto block translate-y-1" />
          </div>
        </section>
      </div>

      {/* 3. MAKE YOUR VOICE HEARD (Full Screen) */}
      {/* Added min-h-screen and flex alignment */}
      <section className="min-h-screen flex items-center py-20 bg-[#0d1b2a]">
        <div className="container mx-auto px-6 max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <SafeImg src={sectionText} alt="Voice" className="w-full max-w-[350px] md:max-w-[450px] lg:max-w-full h-auto mb-8" />
            <p className="text-base opacity-85 mb-8 leading-relaxed max-w-lg">
              Your feedback is crucial in helping Upang maintain high educational standards.
            </p>
            <ul className="space-y-5 w-full max-w-md">
              {[
                "Easy-to-use interface with step-by-step process",
                "Mobile-responsive design for evaluations on any device",
                "Instant submission confirmation and history tracking",
                "Help shape the future of education at UPANG"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-sm md:text-base text-left">
                  <span className="bg-[#ffcc00] text-[#041c32] w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 font-bold mt-1">✔</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 lg:order-2 bg-[#144272] rounded-[32px] p-8 md:p-12 shadow-2xl border border-white/5 w-full max-w-lg mx-auto">
            <h3 className="text-[#ffcc00] text-2xl font-bold mb-4 tracking-tight">READY TO GET STARTED?</h3>
            <p className="text-white/80 mb-8">Sign in using your Student Number and Start your evaluation</p>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="w-full bg-[#ffcc00] text-[#041c32] py-4 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg"
            >
              Get Started →
            </button>
            <p className="text-[0.75rem] opacity-50 mt-6 text-center italic">
              Note: All evaluations are anonymous and confidential.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (Full Screen) */}
      {/* Added min-h-screen and flex alignment */}
      <section className="min-h-screen flex items-center py-24 bg-gradient-to-t from-[#071826] via-[#0f2b41] to-[#19344a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.02),transparent_25%)] pointer-events-none" aria-hidden="true"></div>
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16 flex flex-col items-center">
            <SafeImg src={sectionText3} alt="How it works" className="w-full max-w-[300px] md:max-w-[450px] h-auto mb-6" />
            <p className="text-lg opacity-80">Simple, straightforward evaluation process.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: "👤", title: "Log In", desc: "Access your account using your student credentials" },
              { icon: "📝", title: "Select Module", desc: "Choose from your enrolled courses ready for evaluation" },
              { icon: "📨", title: "Submit Feedback", desc: "Complete the evaluation form and submit your responses" }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center group">
                <div className="w-24 h-24 bg-[#ffcc00] text-[#0d1b2a] rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
                <h4 className="text-2xl font-bold mb-3">{step.title}</h4>
                <p className="text-center opacity-70 px-4 leading-snug max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <Footer />
    </div>
  );
};

export default LandingPage;