import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  GraduationCap, 
  CheckCircle, 
  Shield, 
  TrendingUp, 
  Users, 
  Building, 
  Target, 
  Eye, 
  Heart 
} from "lucide-react";

const About = () => {
  const tokenBg = {
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--up-dark-blue) 88%, black 12%) 0%, #0d1b2a 100%)',
  };

  const tokenPanel = {
    backgroundColor: 'color-mix(in srgb, var(--up-dark-blue) 84%, black 16%)',
  };

  const missionCard = {
    background: 'linear-gradient(145deg, color-mix(in srgb, var(--up-teal) 70%, var(--up-dark-blue) 30%) 0%, color-mix(in srgb, var(--up-dark-blue) 80%, black 20%) 100%)',
  };

  const visionCard = {
    background: 'linear-gradient(145deg, color-mix(in srgb, var(--up-dark-blue) 78%, black 22%) 0%, color-mix(in srgb, var(--up-teal) 62%, var(--up-dark-blue) 38%) 100%)',
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-white" style={tokenBg}>
      <Navbar />

      <main className="container mx-auto px-6 py-16 max-w-5xl">
        {/* Hero Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-[var(--up-gold)] mb-6">
            Empowering Education Through <span className="text-white">Student Feedback</span>
          </h1>
          <p className="text-white/80 text-xl max-w-3xl mx-auto leading-relaxed">
            The UPang Evaluation System is dedicated to improving the quality of education 
            at the University of Pangasinan through comprehensive student feedback and evaluation.
          </p>
        </header>

        {/* Mission & Vision */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="rounded-2xl p-10 border border-white/10 shadow-2xl" style={missionCard}>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-6">
              <Target className="h-8 w-8 text-[var(--up-gold)]" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-white/90 text-lg leading-relaxed">
              To provide a comprehensive, transparent, and user-friendly platform that empowers students 
              to voice their perspectives on courses and instructors, fostering a culture of continuous 
              improvement and academic excellence at the University of Pangasinan.
            </p>
          </div>

          <div className="rounded-2xl p-10 border border-white/10 shadow-2xl" style={visionCard}>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-6">
              <Eye className="h-8 w-8 text-[var(--up-gold)]" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
            <p className="text-white/90 text-lg leading-relaxed">
              To be the leading student feedback and evaluation system in the region, recognized for 
              driving educational excellence and creating a collaborative environment where student voices 
              shape the future of higher education.
            </p>
          </div>
        </section>

        {/* Why Feedback Matters */}
        <section className="rounded-2xl p-10 mb-12 border border-white/5" style={tokenPanel}>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[var(--up-gold)] mb-4">Why Student Feedback Matters</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              At the University of Pangasinan, we believe that student feedback is essential to maintaining 
              and improving the quality of education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <CheckCircle className="h-6 w-6 text-green-400 mb-3" />
              <h3 className="text-xl font-bold mb-2 text-white">Identify Areas for Improvement</h3>
              <p className="text-white/70">Your feedback helps us pinpoint specific areas in teaching methods, course content, and learning resources that need enhancement.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <TrendingUp className="h-6 w-6 text-yellow-400 mb-3" />
              <h3 className="text-xl font-bold mb-2 text-white">Recognize Outstanding Faculty</h3>
              <p className="text-white/70">Positive evaluations help us identify and reward exceptional teaching performance, motivating faculty to maintain high standards.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <Building className="h-6 w-6 text-blue-400 mb-3" />
              <h3 className="text-xl font-bold mb-2 text-white">Inform Curriculum Development</h3>
              <p className="text-white/70">Student input guides our decisions on curriculum updates, ensuring courses remain relevant and effective for learning.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <Heart className="h-6 w-6 text-red-400 mb-3" />
              <h3 className="text-xl font-bold mb-2 text-white">Enhance Learning Experience</h3>
              <p className="text-white/70">Your evaluations contribute to creating a better learning environment for all current and future students at UPang.</p>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-12">
          <h2 className="text-3xl font-bold text-center text-[var(--up-gold)] mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <Shield className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Confidentiality</h3>
              <p className="text-white/70 leading-relaxed">
                All evaluations are completely anonymous. Your identity is protected, and only aggregated data is shared with faculty and administrators.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <TrendingUp className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Continuous Improvement</h3>
              <p className="text-white/70 leading-relaxed">
                We use your feedback to drive meaningful changes in teaching. Your input directly influences decisions that improve education.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <Users className="h-10 w-10 text-[var(--up-gold)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Student-Centered</h3>
              <p className="text-white/70 leading-relaxed">
                Your voice matters – we prioritize student perspectives. The system is designed with your needs and convenience in mind.
              </p>
            </div>
          </div>
        </section>

        {/* Commitment Footer */}
        <section className="rounded-2xl p-10 text-center border border-white/10 mt-12" style={tokenPanel}>
          <h2 className="text-3xl font-bold text-white mb-6">Our Commitment to You</h2>
          <p className="text-lg text-white/80 mb-8 max-w-3xl mx-auto">
            We are committed to maintaining a secure, transparent, and effective evaluation system 
            that truly makes a difference. Your participation helps us fulfill our mission of providing 
            world-class education at the University of Pangasinan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <button
              onClick={() => {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-8 py-3 bg-[var(--up-gold)] text-[#0b1220] font-bold rounded-lg hover:brightness-110 transition-all"
            >
              Get Started
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/contact');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-8 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 border border-white/20 transition-colors"
            >
              Contact Us
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;