import React from 'react';
import logo from '../assets/navbar-logo.png';

const Footer = () => {
  const handleNavigation = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  return (
    <footer className="pt-16 pb-10 border-t border-white/10 bg-gradient-to-t from-[#061525] via-[#0b2a3f] to-[#0d1b2a]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),transparent)]"></div>
      </div>
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="UPang Logo" className="h-12 w-auto" />
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Empowering students to shape the future of education at PHINMA University of Pangasinan.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-[#ffcc00] font-bold mb-6">Quick Links</h5>
            <ul className="space-y-4 text-sm text-white/70">
              <li><a href="/" onClick={(e) => { e.preventDefault(); handleNavigation('/'); }} className="hover:text-white transition-colors cursor-pointer">Home</a></li>
              <li><a href="/about" onClick={(e) => { e.preventDefault(); handleNavigation('/about'); }} className="hover:text-white transition-colors cursor-pointer">About</a></li>
              <li><a href="/contact" onClick={(e) => { e.preventDefault(); handleNavigation('/contact'); }} className="hover:text-white transition-colors cursor-pointer">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors cursor-pointer">Login</a></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h5 className="text-[#ffcc00] font-bold mb-6">Contact</h5>
            <ul className="space-y-4 text-sm text-white/70">
              <li>PHINMA University of Pangasinan</li>
              <li>evaluation@upang.edu.ph</li>
              <li>+63 (45) 123-4567</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center text-xs md:text-sm text-white/40">
          © 2026 PHINMA University of Pangasinan. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;