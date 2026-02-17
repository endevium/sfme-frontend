import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  ArrowRight 
} from "lucide-react";

const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSubmitted(true);
    // Simulate submission
    setTimeout(() => setForm({ name: '', email: '', subject: '', message: '' }), 300);
  };

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-white bg-gradient-to-b from-[#08121b] to-[#102033]">
      <Navbar />

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero Section */}
        <header className="mb-12 text-center">
          <div className="inline-block mb-4 px-4 py-1 bg-white/10 text-[#ffcc00] rounded-full text-sm font-medium border border-[#ffcc00]/20">
            Get In Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#ffcc00] mb-4">
            We're Here to <span className="text-white">Help</span>
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-lg">
            Have questions or need assistance with the evaluation system? Our team is ready to support you.
          </p>
        </header>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#0f2434] p-6 rounded-xl border border-white/5 hover:border-[#ffcc00]/30 transition-all">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Visit Us</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              University of Pangasinan<br />
              Poblacion, Mexico<br />
              Pampanga, Philippines 2021
            </p>
          </div>

          <div className="bg-[#0f2434] p-6 rounded-xl border border-white/5 hover:border-[#ffcc00]/30 transition-all">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Email Us</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              General: evaluation@upang.edu.ph<br />
              Support: support@upang.edu.ph<br />
              Technical: tech@upang.edu.ph
            </p>
          </div>

          <div className="bg-[#0f2434] p-6 rounded-xl border border-white/5 hover:border-[#ffcc00]/30 transition-all">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Phone className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Call Us</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Main Office: +63 (45) 123-4567<br />
              Help Desk: +63 (45) 123-4568<br />
              Emergency: +63 (45) 123-4569
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <section className="bg-[#0f2434] rounded-xl p-8 border border-white/5">
            <h2 className="text-2xl font-bold mb-2">Send Us a Message</h2>
            <p className="text-white/60 mb-6 text-sm">Fill out the form below and we'll get back to you as soon as possible.</p>
            
            {submitted ? (
              <div className="text-center py-12 bg-white/5 rounded-lg border border-dashed border-white/10">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Message Sent!</h3>
                <p className="text-white/60">We'll respond to your inquiry within 24-48 hours.</p>
                <button onClick={() => setSubmitted(false)} className="mt-6 text-[#ffcc00] underline text-sm">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2 text-sm text-white/70">Full Name *</label>
                        <input
                            name="name"
                            placeholder="Juan Dela Cruz"
                            value={form.name}
                            onChange={handleChange}
                            className="w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-[#ffcc00]/50 outline-none transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm text-white/70">Email Address *</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="juan@upang.edu.ph"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-[#ffcc00]/50 outline-none transition-all"
                            required
                        />
                    </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm text-white/70">Subject *</label>
                  <input
                    name="subject"
                    placeholder="How can we help you?"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-[#ffcc00]/50 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm text-white/70">Message *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Please describe your inquiry in detail..."
                    className="w-full rounded-md bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-[#ffcc00]/50 outline-none resize-none transition-all"
                    required
                  />
                </div>

                <button type="submit" className="w-full bg-[#ffcc00] hover:bg-[#e6b800] text-[#041c32] font-bold py-3 rounded-md transition-colors flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Message
                </button>
              </form>
            )}
          </section>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Office Hours */}
            <div className="bg-[#0f2434] rounded-xl p-6 border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-[#ffcc00]" />
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
            <div className="bg-[#0f2434] rounded-xl p-6 border border-white/5">
              <h3 className="font-bold text-white mb-4">Campus Location</h3>
              <div className="space-y-3 text-sm text-white/70">
                <p><strong className="text-[#ffcc00]">Building:</strong> Administrative Building</p>
                <p><strong className="text-[#ffcc00]">Floor:</strong> 2nd Floor, Room 205</p>
                <p className="text-xs leading-relaxed italic">
                  Note: If you're coming from the main gate, walk straight past the fountain, turn left at the library, and you'll find the Administrative Building.
                </p>
              </div>
            </div>

            {/* FAQ Brief */}
            <div className="bg-[#0f2434] rounded-xl p-6 border border-white/5">
              <h3 className="font-bold text-white mb-3">Quick FAQ</h3>
              <p className="text-xs text-white/60 mb-3">
                <strong>Response Time:</strong> Typically 24-48 hours.
              </p>
              <button 
                onClick={() => window.location.href = '/about'}
                className="text-sm text-[#ffcc00] flex items-center gap-1 hover:underline"
              >
                Learn more about us <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
        {/* Map Section */}
        <section className="mt-12">
          <div className="bg-[#0f2434] rounded-xl p-4 border border-white/5 shadow-2xl">
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
              <div className="absolute inset-0 pointer-events-none border-[12px] border-[#0f2434] rounded-lg"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 px-4 pb-4">
              <div className="flex items-center gap-3 text-sm text-white/70">
                <MapPin className="h-4 w-4 text-[#ffcc00]" />
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