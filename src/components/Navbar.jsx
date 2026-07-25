import React, { useEffect, useState } from 'react';
import logo from '../assets/navbar-logo.png';
import LoginModal from './LoginModal';

const Navbar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem('authToken'));

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20); // Changed to 20px so it doesn't trigger too early
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 z-[1000] flex items-center w-full h-20 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#041c32]/90 backdrop-blur-md border-b border-white/10 shadow-lg' // Darker frosted glass for readability
            : 'bg-transparent border-b border-transparent shadow-none'
        }`}
      >
        {/* Background glow effects */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute -top-10 -left-8 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-10 right-10 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" />
        </div>

        {/* Content Container (Matches LandingPage width) */}
        <div className="relative flex items-center justify-between w-full px-6 max-w-6xl mx-auto h-full">
          
          {/* Logo */}
          <div className="flex items-center">
            <img src={logo} alt="UPang Logo" className="h-[45px] md:h-[60px] w-auto transition-all" />
          </div>

          {/* Links & Button */}
          <div className="flex items-center gap-6 md:gap-10">
            {/* Hidden on very small screens, visible on md and up */}
            <ul className="hidden md:flex list-none gap-[30px] m-0 p-0">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-white no-underline font-medium text-base transition-colors duration-300 hover:text-[#ffcc00]"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/about');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-white no-underline font-medium text-base transition-colors duration-300 hover:text-[#ffcc00]"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/contact');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-white no-underline font-medium text-base transition-colors duration-300 hover:text-[#ffcc00]"
                >
                  Contact
                </a>
              </li>
            </ul>

            {/* Login Button */}
            {!isLoggedIn && (
              <button 
                className="bg-white text-[#041c32] border-none py-2 px-6 rounded-lg font-bold cursor-pointer transition-all duration-300 hover:bg-[#ffcc00] hover:-translate-y-0.5 shadow-md" 
                onClick={() => setIsModalOpen(true)}
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </nav>

      <LoginModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default Navbar;