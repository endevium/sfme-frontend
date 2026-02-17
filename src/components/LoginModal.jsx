import React, { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/navbar-logo.png';
import studentGroupImg from '../assets/group-student2.png';
import SafeImg from './SafeImg';
import OTPModal from './OTPModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const LoginModal = ({ isOpen, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpPendingToken, setOtpPendingToken] = useState(null);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  const recaptchaRef = useRef(null);

  const handleIdChange = (e) => {
    const value = e.target.value;
    if (loginRole === 'student') {
      const filteredValue = value.replace(/[^0-9-]/g, '');
      setStudentId(filteredValue);
      return;
    }
    setStudentId(value);
  };

  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handleContextMenu = (e) => e.preventDefault();

  const handleKeyDown = (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'K')) ||
      (e.ctrlKey && e.key === 's')
    ) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const t = setTimeout(() => setAnimateIn(true), 10);
      return () => clearTimeout(t);
    } 

    document.body.style.overflow = 'unset';
    setAnimateIn(false);
    
    return () => {
      document.body.style.overflow = 'unset';
      setStudentId('');
      setPassword('');
      setShowPassword(false);
      setErrorMessage('');
      setMustChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setChangeError('');
      setAnimateIn(false);
    };
  }, [isOpen]);

  const handleCloseAnimated = () => {
        setAnimateIn(false);
        setTimeout(() => {
          onClose();
        }, 180);
      };

  // If the modal is opened but the user is already authenticated,
  // immediately redirect them to their dashboard and close the modal.
  useEffect(() => {
    if (!isOpen) return;
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

    onClose();
  }, [isOpen]);

  useEffect(() => {
    setErrorMessage('');
    setMustChangePassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setChangeError('');
  }, [loginRole]);

  const getLoginEndpoint = () => {
    if (loginRole === 'faculty') return '/faculty/login/';
    if (loginRole === 'depthead') return '/department-head/login/';
    return '/students/login/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedId = studentId.trim();
    const trimmedPassword = password.trim();

    if (!trimmedId || !trimmedPassword) {
      setErrorMessage('Please enter your ID and password.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const payload =
      loginRole === 'student'
        ? { student_number: trimmedId, password: trimmedPassword, role: loginRole }
        : { email: trimmedId, password: trimmedPassword, role: loginRole };

    try {
      setIsSubmitting(true);
      if (!RECAPTCHA_SITE_KEY) {
        setErrorMessage('reCAPTCHA site key is not configured.');
        return;
      }

      const recaptchaToken = await recaptchaRef.current?.executeAsync();
      recaptchaRef.current?.reset();

      if (!recaptchaToken) {
        setErrorMessage('reCAPTCHA failed. Please try again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}${getLoginEndpoint()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          recaptcha_token: recaptchaToken,
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        // Show a specific message for throttling so it's visible in the UI
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');

          // DRF often returns: { "detail": "Request was throttled. Expected available in 59 seconds." }
          const serverDetail =
            typeof data?.detail === 'string' ? data.detail : null;

          const fallback = retryAfter
            ? `Too many login attempts. Please wait ${retryAfter} seconds and try again.`
            : 'Too many login attempts. Please wait a moment and try again.';

          setErrorMessage(serverDetail || fallback);
          return;
        }

        // Replace technical/ambiguous backend messages with a generic auth error
        setErrorMessage('Authentication failed. Please check your ID/email and password.');
        return;
      }

      // OTP required (students INCLUDED)
      if (data?.otp_required) {
        setOtpPendingToken(data.pending_token || null);
        // Student login uses student number, so email may not be known on frontend; backend should return it if possible.
        // Fall back to previously entered identifier.
        setOtpEmail(data.email || (payload.email || ''));
        setOtpExpiresAt(data.expires_at || null);
        setOtpOpen(true);
        return; // IMPORTANT: don't close modal
      }

      // Token-based login (if any role returns token directly)
      if (data?.token) {
        if (!data.user_type) {
          data.user_type = loginRole === 'depthead' ? 'department_head' : loginRole;
        }

        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data));

        const returnedRole = data.user_type;
        if (returnedRole === 'student') {
          if (data?.must_change_password) {
            setMustChangePassword(true);
            setChangeError('');
            return;
          }
          window.history.pushState({}, '', '/dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (returnedRole === 'faculty') {
          if (data?.must_change_password) {
            setMustChangePassword(true);
            setChangeError('');
            return;
          }
          window.history.pushState({}, '', '/faculty-dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (returnedRole === 'department_head' || returnedRole === 'depthead') {
          window.history.pushState({}, '', '/depthead-dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        onClose(); // close only after successful redirect/login
        return;
      }

      // If neither otp_required nor token was returned, show a generic error
      setErrorMessage(data?.detail || 'Login response was incomplete. Please try again.');
      return;
    } catch {
      setErrorMessage('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPVerified = (data) => {
    if (!data?.token) return;

    if (!data.user_type) {
      data.user_type = loginRole === 'depthead' ? 'department_head' : loginRole;
    }

    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data));

    const returnedRole = data.user_type;
    if (returnedRole === 'student') {
      if (data?.must_change_password) {
        setMustChangePassword(true);
        setChangeError('');
        setOtpOpen(false);
        return;
      }
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (returnedRole === 'faculty') {
      if (data?.must_change_password) {
        setMustChangePassword(true);
        setChangeError('');
        setOtpOpen(false);
        return;
      }
      window.history.pushState({}, '', '/faculty-dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (returnedRole === 'department_head' || returnedRole === 'depthead') {
      window.history.pushState({}, '', '/depthead-dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    setOtpOpen(false);
    onClose();
  };

  // A small list of very common passwords to check against (lowercase)
  const commonPasswords = [
    '123456','password','123456789','12345678','12345','111111','1234567','sunshine','qwerty','iloveyou',
    'princess','admin','welcome','666666','abc123','football','123123','monkey','letmein','dragon',
    'baseball','master','shadow','killer','trustno1'
  ];

  const validatePassword = (pwd, username) => {
    if (!pwd || typeof pwd !== 'string') return { valid: false, message: 'Invalid password.' };
    if (pwd.length < 12) return { valid: false, message: 'Password must be at least 12 characters long.' };
    if (!/[A-Z]/.test(pwd)) return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    if (!/[a-z]/.test(pwd)) return { valid: false, message: 'Password must contain at least one lowercase letter.' };
    if (!/[0-9]/.test(pwd)) return { valid: false, message: 'Password must contain at least one number.' };
    if (!/[^A-Za-z0-9]/.test(pwd)) return { valid: false, message: 'Password must contain at least one special character.' };

    if (username) {
      try {
        const uname = String(username).toLowerCase().replace(/\s+/g, '');
        if (uname && pwd.toLowerCase().includes(uname)) {
          return { valid: false, message: 'Password must not contain your username.' };
        }
        // If email, also check local-part (before @)
        if (String(username).includes('@')) {
          const local = String(username).split('@')[0].toLowerCase();
          if (local && pwd.toLowerCase().includes(local)) {
            return { valid: false, message: 'Password must not contain your username.' };
          }
        }
      } catch {
        // ignore username parsing errors and continue
      }
    }

    const lowered = pwd.toLowerCase();
    if (commonPasswords.includes(lowered)) return { valid: false, message: 'This password is too common. Choose a less common password.' };

    return { valid: true };
  };

  // Return individual criteria results for live checklist
  const passwordCriteria = (pwd, username) => {
    const results = {
      length: false,
      upper: false,
      lower: false,
      number: false,
      special: false,
      notUsername: false,
      notCommon: false,
      confirmMatches: false,
    };
    if (!pwd || typeof pwd !== 'string') return results;
    results.length = pwd.length >= 12;
    results.upper = /[A-Z]/.test(pwd);
    results.lower = /[a-z]/.test(pwd);
    results.number = /[0-9]/.test(pwd);
    results.special = /[^A-Za-z0-9]/.test(pwd);
    try {
      if (username) {
        const uname = String(username).toLowerCase().replace(/\s+/g, '');
        results.notUsername = uname ? !pwd.toLowerCase().includes(uname) : true;
        if (String(username).includes('@')) {
          const local = String(username).split('@')[0].toLowerCase();
          if (local) results.notUsername = results.notUsername && !pwd.toLowerCase().includes(local);
        }
      } else {
        results.notUsername = true;
      }
    } catch {
      results.notUsername = true;
    }

    try {
      results.notCommon = !commonPasswords.includes(pwd.toLowerCase());
    } catch {
      results.notCommon = true;
    }

    results.confirmMatches = (pwd && confirmPassword) ? pwd === confirmPassword : false;
    return results;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangeError('');

    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedNewPassword || !trimmedConfirmPassword) {
      setChangeError('Please enter and confirm your new password.');
      return;
    }

    // Run full password policy validation
    const validation = validatePassword(trimmedNewPassword, studentId);
    if (!validation.valid) {
      setChangeError(validation.message);
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint = loginRole === 'student' ? '/students/change-password/' : '/faculty/change-password/';
      const payload = loginRole === 'student'
        ? {
            student_number: studentId.trim(),
            old_password: password,
            new_password: trimmedNewPassword,
          }
        : {
            email: studentId.trim(),
            old_password: password,
            new_password: trimmedNewPassword,
          };


      const token = localStorage.getItem('authToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const serverMsg = data?.detail || data?.error || data?.message || (Object.keys(data || {}).length ? JSON.stringify(data) : null);
        console.error('change-password failed', response.status, data, serverMsg);
        setChangeError(serverMsg || 'Unable to update password. Please verify your information and try again.');
        return;
      }

      // If backend returned a token, save it and redirect
      if (data?.token) {
        if (!data.user_type) data.user_type = loginRole === 'depthead' ? 'department_head' : loginRole;
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data));

        const returnedRole = data.user_type;
        if (returnedRole === 'student') {
          window.history.pushState({}, '', '/dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (returnedRole === 'faculty') {
          window.history.pushState({}, '', '/faculty-dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (returnedRole === 'department_head' || returnedRole === 'depthead') {
          window.history.pushState({}, '', '/depthead-dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        onClose();
        return;
      }

      // If there is already an auth token (from OTP verification), update stored user and redirect
      const existingToken = localStorage.getItem('authToken');
      if (existingToken) {
        try {
          const stored = JSON.parse(localStorage.getItem('authUser') || '{}');
          if (stored) {
            stored.must_change_password = false;
            localStorage.setItem('authUser', JSON.stringify(stored));
          }
        } catch {}

        const storedUser = (() => {
          try { return JSON.parse(localStorage.getItem('authUser') || 'null'); } catch { return null; }
        })();

        const returnedRole = storedUser?.user_type || (loginRole === 'depthead' ? 'department_head' : loginRole);
        if (returnedRole === 'student') {
          window.history.pushState({}, '', '/dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (returnedRole === 'faculty') {
          window.history.pushState({}, '', '/faculty-dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } else if (returnedRole === 'department_head' || returnedRole === 'depthead') {
          window.history.pushState({}, '', '/depthead-dashboard');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        onClose();
        return;
      }

      // If no token returned, attempt automatic login with new password
      try {
        const loginPayload = loginRole === 'student'
          ? { student_number: studentId.trim(), password: trimmedNewPassword, role: loginRole }
          : { email: studentId.trim(), password: trimmedNewPassword, role: loginRole };

        const loginResp = await fetch(`${API_BASE_URL}${getLoginEndpoint()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginPayload),
        });

        let loginData = {};
        try { loginData = await loginResp.json(); } catch { loginData = {}; }

        if (loginResp.ok && loginData?.token) {
          if (!loginData.user_type) loginData.user_type = loginRole === 'depthead' ? 'department_head' : loginRole;
          localStorage.setItem('authToken', loginData.token);
          localStorage.setItem('authUser', JSON.stringify(loginData));

          const returnedRole = loginData.user_type;
          if (returnedRole === 'student') {
            window.history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else if (returnedRole === 'faculty') {
            window.history.pushState({}, '', '/faculty-dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else if (returnedRole === 'department_head' || returnedRole === 'depthead') {
            window.history.pushState({}, '', '/depthead-dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }

          onClose();
          return;
        }

        const loginMsg = loginData?.detail || loginData?.error || loginData?.message || 'Password updated but automatic login failed. Please login manually.';
        setChangeError(loginMsg);
        return;
      } catch (e) {
        console.error('Auto-login after password change failed', e);
        setChangeError('Password updated but automatic login failed due to network error. Please login manually.');
        return;
      }
    } catch {
      setChangeError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Live criteria for change-password checklist
  const criteria = passwordCriteria(newPassword, studentId);

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-black/85 flex justify-center items-center z-[9999] backdrop-blur-[5px] p-4" 
      onClick={(e) => { if (e.target === e.currentTarget) handleCloseAnimated(); }}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    > 
      <div
        className={`w-full flex justify-center items-center transition-all duration-200 ease-out ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
        }`}
      >
      <div 
        className="font-upang bg-[#23344E] bg-gradient-to-b from-[#28625C] to-[#23344E] w-full max-w-[1100px] max-h-[95vh] rounded-[20px] relative overflow-y-auto lg:overflow-hidden text-white shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
      > 
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={RECAPTCHA_SITE_KEY}
          size="invisible"
        />

        {/* Close Button */}
        <button 
          className="absolute top-4 right-5 z-50 text-white text-[32px] hover:text-[#ffcc00] transition-colors" 
          onClick={handleCloseAnimated}
        >
          &times;
        </button>
        
        <div className="flex flex-col lg:flex-row min-h-[420px] select-none">
          
          {/* Left Side: Students Image (Hidden on mobile/tablet) */}
          <div className="hidden lg:flex lg:flex-1 relative bg-transparent items-end justify-center overflow-visible p-12">
            <SafeImg
              src={studentGroupImg}
              alt="Students"
              className="w-full h-auto z-0 object-contain translate-x-[10%] scale-[1.3]"
            />
          </div>

          {/* Right Side: Form */}
          <div className="flex-1 lg:flex-[1.2] p-6 sm:p-10 lg:p-12">
            {/* Logo Section */}
            <div className="flex justify-center lg:justify-start items-center mb-6">
              <SafeImg src={logo} alt="Logo" className="w-[220px] sm:w-[300px] lg:w-[400px] h-auto" />
            </div>

            {!mustChangePassword ? (
              <form className="form-content" onSubmit={handleSubmit}>
                <h1 className="text-2xl sm:text-3xl lg:text-[2rem] mb-2 font-black">
                  {loginRole === 'student' && 'Student Login'}
                  {loginRole === 'faculty' && 'Faculty Login'}
                  {loginRole === 'depthead' && 'Dept Head Login'}
                </h1>
                <p className="opacity-70 text-sm mb-6">
                  Enter your credentials to access your evaluation dashboard
                </p>

              {/* Login Role Selection (Responsive Toggle) */}
              <div className="mb-6 flex flex-wrap sm:flex-nowrap rounded-2xl sm:rounded-full bg-white/10 p-1 gap-1">
                {['student', 'faculty', 'depthead'].map((role) => {
                  const roleLabels = { student: 'Student', faculty: 'Faculty', depthead: 'Dept Head' };
                  const isActive = loginRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setLoginRole(role)}
                      className={`flex-1 min-w-[100px] px-3 py-2.5 text-xs font-bold transition-all duration-300 rounded-xl sm:rounded-full flex items-center justify-center gap-2 ${
                        isActive ? 'bg-white text-[#003d3d] shadow-lg' : 'text-white hover:bg-white/5'
                      }`}
                    >
                      {roleLabels[role]}
                    </button>
                  );
                })}
              </div>
              
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-80">
                    {loginRole === 'student' ? 'Student ID' : 'Email'}
                  </label>
                  <div className="flex items-center bg-white rounded-xl py-3 px-4">
                    <User className="text-slate-400 mr-3 shrink-0" size={20} />
                    <input 
                      type={loginRole === 'student' ? 'text' : 'email'}
                      placeholder={loginRole === 'student' ? '00-0000-000' : 'name@upang.edu.ph'}
                      className="flex-1 border-none outline-none font-medium text-slate-800 bg-transparent placeholder:text-slate-300"
                      value={studentId}
                      onChange={handleIdChange}
                      inputMode={loginRole === 'student' ? 'numeric' : 'email'}
                      autoComplete={loginRole === 'student' ? 'username' : 'email'}
                    />
                  </div>
                </div>
                <OTPModal
                  isOpen={otpOpen}
                  onClose={() => setOtpOpen(false)}
                  onVerified={handleOTPVerified}
                  initialPendingToken={otpPendingToken}
                  initialEmail={otpEmail}
                  initialExpiresAt={otpExpiresAt}
                  initialRole={loginRole === 'depthead' ? 'department_head' : loginRole}
                />

                <div>
                  <label className="
                  block mb-2 
                  text-xs font-bold 
                  uppercase tracking-wider 
                  opacity-80">Password</label>
                  <div className="flex items-center bg-white rounded-xl py-3 px-4">
                    <Lock className="text-slate-400 mr-3 shrink-0" size={20} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      className="
                      flex-1 
                      border-none 
                      outline-none 
                      font-medium 
                      text-slate-800
                      bg-transparent 
                      placeholder:text-slate-300"
                      value={password}
                      onChange={handlePasswordChange}
                      autoComplete="current-password"
                    />
                    <button 
                      type="button" 
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-4 text-sm text-[#ffcc00] font-semibold" role="alert">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#ffcc00] text-[#041c32] font-black rounded-xl cursor-pointer mt-6 shadow-lg hover:bg-[#e6b800] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'LOGGING IN...' : `LOGIN AS ${loginRole.toUpperCase()}`}
              </button>

              <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 text-sm">
                <label className="flex items-center cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 accent-[#ffcc00]" /> 
                  <span className="ml-2">Remember me</span>
                </label>
                <a href="#forgot" className="text-white/70 hover:text-[#ffcc00] no-underline">
                  Forgot Password?
                </a>
              </div>
              
                {/* Responsive Demo Credentials */}
                <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 text-[11px] leading-relaxed">
                  <p className="font-bold text-[#ffcc00] mb-1">Demo Access:</p>
                  <p className="opacity-80">ID: Any numeric value | Pass: Any (min 6 chars)</p>
                </div>
              </form>
            ) : (
              <form className="form-content" onSubmit={handleChangePassword}>
                <h1 className="text-2xl sm:text-3xl lg:text-[2rem] mb-2 font-black">Change Password</h1>
                <p className="opacity-70 text-sm mb-6">
                  For your security, please set a new password before continuing.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-80">New Password</label>
                    <div className="flex items-center bg-white rounded-xl py-3 px-4">
                      <Lock className="text-slate-400 mr-3 shrink-0" size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="flex-1 border-none outline-none font-medium text-slate-800 bg-transparent placeholder:text-slate-300"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-80">Confirm Password</label>
                      <div className="flex items-center bg-white rounded-xl py-3 px-4">
                        <Lock className="text-slate-400 mr-3 shrink-0" size={20} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="flex-1 border-none outline-none font-medium text-slate-800 bg-transparent placeholder:text-slate-300"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    {/* Live Checklist */}
                    <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-sm font-semibold mb-2">Password requirements</div>
                      <div className="grid gap-2 text-sm">
                        <div className={`flex items-center gap-2 ${criteria.length ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.length ? '✓' : '✕'}</span>
                          <span>At least 12 characters</span>
                        </div>
                        <div className={`flex items-center gap-2 ${criteria.upper ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.upper ? '✓' : '✕'}</span>
                          <span>Contains an uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-2 ${criteria.lower ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.lower ? '✓' : '✕'}</span>
                          <span>Contains a lowercase letter</span>
                        </div>
                        <div className={`flex items-center gap-2 ${criteria.number ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.number ? '✓' : '✕'}</span>
                          <span>Contains a number</span>
                        </div>
                        <div className={`flex items-center gap-2 ${criteria.special ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.special ? '✓' : '✕'}</span>
                          <span>Contains a special character</span>
                        </div>
                        <div className={`flex items-center gap-2 ${criteria.notUsername ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.notUsername ? '✓' : '✕'}</span>
                          <span>Does not contain your username</span>
                        </div>
                        <div className={`flex items-center gap-2 ${criteria.notCommon ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.notCommon ? '✓' : '✕'}</span>
                          <span>Not a commonly used password</span>
                        </div>
                        <div className={`flex items-center gap-2 ${criteria.confirmMatches ? 'text-green-400' : 'text-red-400'}`}>
                          <span className="w-5">{criteria.confirmMatches ? '✓' : '✕'}</span>
                          <span>Confirm password matches</span>
                        </div>
                      </div>
                    </div>
                </div>

                {changeError && (
                  <div className="mt-4 text-sm text-[#ffcc00] font-semibold" role="alert">
                    {changeError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#ffcc00] text-[#041c32] font-black rounded-xl cursor-pointer mt-6 shadow-lg hover:bg-[#e6b800] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default LoginModal;