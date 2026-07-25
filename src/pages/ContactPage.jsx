import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  ArrowRight 
} from "lucide-react";

const ContactPage = () => {
  const tokenBg = {
    background: 'linear-gradient(180deg, color-mix(in srgb, var(--up-dark-blue) 88%, black 12%) 0%, #0f2132 100%)',
  };

  const tokenPanel = {
    backgroundColor: 'color-mix(in srgb, var(--up-dark-blue) 82%, black 18%)',
  };

  const iconBadge = {
    backgroundColor: 'color-mix(in srgb, var(--up-teal) 38%, transparent 62%)',
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-white" style={tokenBg}>
      <Navbar />

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero Section */}
        <header className="mb-12 text-center">
          
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--up-gold)] mb-4">
            We're Here to <span className="text-white">Help</span>
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Have questions or need assistance with the evaluation system? Our team is ready to support you.
          </p>
        </header>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-xl border border-white/5 hover:border-[var(--up-gold)]/30 transition-all" style={tokenPanel}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={iconBadge}>
              <MapPin className="h-6 w-6 text-[var(--up-gold)]" />
            </div>
            <h3 className="font-bold text-white mb-2">Visit Us</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              University of Pangasinan<br />
              Poblacion, Mexico<br />
              Pampanga, Philippines 2021
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/5 hover:border-[var(--up-gold)]/30 transition-all" style={tokenPanel}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={iconBadge}>
              <Mail className="h-6 w-6 text-[var(--up-gold)]" />
            </div>
            <h3 className="font-bold text-white mb-2">Email Us</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              General: evaluation@upang.edu.ph<br />
              Support: support@upang.edu.ph<br />
              Technical: tech@upang.edu.ph
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/5 hover:border-[var(--up-gold)]/30 transition-all" style={tokenPanel}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={iconBadge}>
              <Phone className="h-6 w-6 text-[var(--up-gold)]" />
            </div>
            <h3 className="font-bold text-white mb-2">Call Us</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Main Office: +63 (45) 123-4567<br />
              Help Desk: +63 (45) 123-4568<br />
              Emergency: +63 (45) 123-4569
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Office Hours */}
            <div className="rounded-xl p-6 border border-white/5" style={tokenPanel}>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-[var(--up-gold)]" />
                <h3 className="font-bold text-white">Office Hours</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/60">Monday - Friday</span>
                  <span className="font-semibold">8:00 AM - 5:00 PM</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-white/60">Saturday</span>
                  <span className="font-semibold">9:00 AM - 12:00 PM</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-white/60">Sunday</span>
                  <span className="font-semibold text-red-400">Closed</span>
                </div>
              </div>
            </div>

            {/* Campus Location */}
            <div className="rounded-xl p-6 border border-white/5" style={tokenPanel}>
              <h3 className="font-bold text-white mb-4">Campus Location</h3>
              <div className="space-y-3 text-sm text-white/70">
                <p><strong className="text-[var(--up-gold)]">Building:</strong> Administrative Building</p>
                <p><strong className="text-[var(--up-gold)]">Floor:</strong> 2nd Floor, Room 205</p>
                <p className="text-xs leading-relaxed italic">
                  Note: If you're coming from the main gate, walk straight past the fountain, turn left at the library, and you'll find the Administrative Building.
                </p>
              </div>
            </div>

            {/* FAQ Brief */}
            <div className="rounded-xl p-6 border border-white/5" style={tokenPanel}>
              <h3 className="font-bold text-white mb-3">Quick FAQ</h3>
              <p className="text-xs text-white/60 mb-3">
                <strong>Response Time:</strong> Typically 24-48 hours.
              </p>
              <button 
                onClick={() => window.location.href = '/about'}
                className="text-sm text-[var(--up-gold)] flex items-center gap-1 hover:underline"
              >
                Learn more about us <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
        {/* Map Section */}
        <section className="mt-12">
          <div className="rounded-xl p-4 border border-white/5 shadow-2xl" style={tokenPanel}>
            <div className="text-center mb-6 pt-4">
              <h2 className="text-2xl font-bold text-white mb-2">Find Us on Campus</h2>
              <p className="text-white/60 text-sm">Administrative Building, University of Pangasinan</p>
            </div>
            
            <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-white/10 group">
              {/* Note: Grayscale filter added via 'filter invert' to match dark theme, removes on hover */}
              <iframe
                title="University of Pangasinan Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3834.463630256877!2d120.33475877583681!3d16.041444240156943!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x339167f08369324d%3A0x6b3b64f346995641!2sPHINMA%20University%20of%20Pangasinan!5e0!3m2!1sen!2sph!4v1709560000000!5m2!1sen!2sph"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale contrast-125 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
              ></iframe>
              
              {/* Dark Overlay for better blending */}
              <div className="absolute inset-0 pointer-events-none border-[12px] rounded-lg border-[var(--up-dark-blue)]"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 px-4 pb-4">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <MapPin className="h-4 w-4 text-[var(--up-gold)]" />
                <span>Arellano Street, Dagupan City, Pangasinan</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70 md:justify-end">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Campus is currently open for visitors</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;