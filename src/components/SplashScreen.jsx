import React from 'react'
import logo from '../assets/navbar-logo.png'

const SplashScreen = ({ visible }) => {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#1a1a1a] text-white">
      
      {/* 1. Define custom animation for the progress bar directly here */}
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
          .animate-loading-bar {
            animation: shimmer 2s infinite linear;
          }
        `}
      </style>

      {/* Centered Content */}
      <div className="flex-grow flex flex-col items-center justify-center">
        
        {/* Logo Container */}
        <div className="relative">
          {/* Glow Effect - Scaled up to w-72 */}
          <div className="absolute inset-0 bg-[#ffcc00] opacity-20 blur-2xl rounded-full animate-pulse"></div>
          
          {/* Logo - Increased from w-40 to w-72 */}
          <img 
            src={logo} 
            alt="Logo" 
            className="relative w-100 h-auto animate-pulse" 
            style={{ animationDuration: '2s' }} 
          />
        </div>

        {/* PROGRESS BAR */}
        {/* Container: Matches logo width (w-72) */}
        <div className="w-72 h-1 bg-gray-800 rounded-full mt-10 overflow-hidden relative">
          {/* Moving Inner Bar */}
          <div className="absolute top-0 left-0 h-full w-full bg-[#ffcc00] animate-loading-bar origin-left"></div>
        </div>

      </div>

      {/* Footer Area */}
      <div className="mb-10 text-center opacity-80">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">From</p>
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ffcc00]"></span>
          <span className="font-bold tracking-wide text-lg text-gray-200">PHINMA EDUCATION</span>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen