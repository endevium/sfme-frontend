import React, { useState } from 'react';
import logo from '../assets/navbar-logo.png';
import LoginModal from './LoginModal';

const Navbar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem('authToken'));

  return (
    <>
      <nav className="fixed top-0 left-0 z-[1000] flex items-center w-full h-20">
        <div className="flex items-center justify-between w-[90%] max-w-[1200px] mx-auto">
          <div className="py-1.25">
            <img src={logo} alt="UPang Logo" className="h-[60px] w-auto" />
          </div>

          <div className="flex items-center gap-10">
            <ul className="flex list-none gap-[30px] m-0 p-0">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-white no-underline font-medium text-base transition-colors duration-300 hover:text-[#fbbf24]"
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
                  className="text-white no-underline font-medium text-base transition-colors duration-300 hover:text-[#fbbf24]"
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
                  className="text-white no-underline font-medium text-base transition-colors duration-300 hover:text-[#fbbf24]"
                >
                  Contact
                </a>
              </li>
            </ul>
            <div className="nav-actions">
              {!isLoggedIn && (
                <button 
                  className="bg-white text-[#102a43] border-none py-2 px-6 rounded font-bold cursor-pointer transition-all duration-300 hover:bg-[#fbbf24] hover:-translate-y-0.5" 
                  onClick={() => setIsModalOpen(true)}
                >
                  Log In
                </button>
              )}
            </div>
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