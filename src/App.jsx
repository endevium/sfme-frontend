import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import IdleManager from './components/IdleManager.jsx';
import SplashScreen from './components/SplashScreen.jsx';

// Main Pages
import LandingPage from './pages/LandingPage.jsx';
import About from './pages/About.jsx';
import ContactPage from './pages/ContactPage.jsx';

// Dept Head Pages
import DeptHeadDashboard from './pages/depthead/DeptHeadDashboard.jsx';
import AuditLogPage from './pages/depthead/AuditLogPage.jsx';
import FacultyPages from './pages/depthead/FacultyPages.jsx';
import Forms from './pages/depthead/Forms.jsx';
import ReportsPage from './pages/depthead/ReportsPage.jsx';
import StudentsPage from './pages/depthead/StudentsPage.jsx';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard.jsx';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import HistoryPage from './pages/student/HistoryPage.jsx';
import InstructorsPage from './pages/student/InstructorsPage.jsx';
import ModulePage from './pages/student/ModulePage.jsx';
import EvaluationForm from './pages/student/EvaluationForm.jsx';

function App() {
  const [route, setRoute] = useState(window.location.pathname || '/');
  const [showSplash, setShowSplash] = useState(false);
  // On startup: if a persistent token exists in localStorage (from older flows),
  // migrate it into sessionStorage and remove the localStorage copy so the
  // session becomes tab-lifetime only. This preserves the current session
  // but prevents the token from surviving a closed tab.
  useEffect(() => {
    try {
      const persistentToken = localStorage.getItem('authToken');
      const persistentUser = localStorage.getItem('authUser');
      const sessionToken = sessionStorage.getItem('authToken');
      if (!sessionToken && persistentToken) {
        // Move into sessionStorage and remove persistent copy
        sessionStorage.setItem('authToken', persistentToken);
        if (persistentUser) sessionStorage.setItem('authUser', persistentUser);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        console.info('Migrated auth from localStorage to sessionStorage');
      }
    } catch (e) {
      // ignore failures, but don't block app
      console.error('auth migration error', e);
    }
  }, []);

  // Show a brief splash screen on full page reloads
  useEffect(() => {
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      const navType = (navEntries && navEntries[0] && navEntries[0].type) || (performance.navigation && performance.navigation.type);
      // navigation.type === 1 indicates reload in legacy API
      const isReload = navType === 'reload' || navType === 1;
      if (isReload) {
        setShowSplash(true);
        const t = setTimeout(() => setShowSplash(false), 900);
        return () => clearTimeout(t);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Accept token from sessionStorage (preferred) or localStorage (fallback for older flows)
  const isLoggedIn = Boolean(sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // If user is logged in, prevent landing page access via URL editing
  useEffect(() => {
    if (!isLoggedIn) return;
    if (route === '/' || route === '' || route === '/home') {
      let storedUser = null;
      try {
        const raw = sessionStorage.getItem('authUser') || localStorage.getItem('authUser') || 'null'
        storedUser = JSON.parse(raw);
      } catch {
        storedUser = null;
      }

      const roleMap = {
        student: 'Student',
        faculty: 'Faculty',
        department_head: 'Department Head',
      };
      const resolvedRole = roleMap[storedUser?.user_type] || 'Student';
      const homePathMap = {
        Student: '/dashboard',
        Faculty: '/faculty-dashboard',
        'Department Head': '/depthead-dashboard',
      };

      const target = homePathMap[resolvedRole] || '/dashboard';
      if (route !== target) {
        window.history.replaceState({}, '', target);
      }
    }
  }, [isLoggedIn]);

  // Routing Logic
  const renderContent = () => {
    // If user is authenticated and requests the root landing path,
    // render their dashboard instead of the public LandingPage.
    if (isLoggedIn && (route === '/' || route === '' || route === '/home')) {
      let storedUser = null;
      try {
        const raw = sessionStorage.getItem('authUser') || localStorage.getItem('authUser') || 'null'
        storedUser = JSON.parse(raw);
      } catch {
        storedUser = null;
      }

      const roleMap = {
        student: 'Student',
        faculty: 'Faculty',
        department_head: 'Department Head',
      };
      const resolvedRole = roleMap[storedUser?.user_type] || 'Student';

      if (resolvedRole === 'Student') return <StudentDashboard />;
      if (resolvedRole === 'Faculty') return <FacultyDashboard />;
      return <DeptHeadDashboard />;
    }
    // Basic Pages
    if (route === '/about') return <About />;
    if (route === '/contact') return <ContactPage />;

    // Dept Head Nested Routes
    if (route.startsWith('/depthead-dashboard')) {
      if (route === '/depthead-dashboard/audit-log') return <AuditLogPage />;
      if (route === '/depthead-dashboard/faculty') return <FacultyPages />;
      if (route === '/depthead-dashboard/forms') return <Forms />;
      if (route === '/depthead-dashboard/reports') return <ReportsPage />;
      if (route === '/depthead-dashboard/students') return <StudentsPage />;
      return <DeptHeadDashboard />;
    }

    // Faculty Routes
    if (route === '/faculty-dashboard') return <FacultyDashboard />;

    // Student Nested Routes
    if (route.startsWith('/dashboard')) {
      if (route === '/dashboard/history') return <HistoryPage />;
      if (route === '/dashboard/instructors') return <InstructorsPage />;
      if (route === '/dashboard/modules') return <ModulePage />;
      if (route.startsWith('/dashboard/evaluate-instructor/')) {
        const instructorFormId = route.split('/')[3];
        return <EvaluationForm instructorFormId={instructorFormId} />;
      }
        
      if (route.startsWith('/dashboard/evaluate/')) {
        const moduleId = route.split('/')[3];
        return <EvaluationForm moduleId={moduleId} />;
      }
      
      return <StudentDashboard />;
    }

    // Fallback to LandingPage
    return <LandingPage />;
  };

  return (
    <div className="App">
      <SplashScreen visible={showSplash} />
      {isLoggedIn && <Header />}
      {isLoggedIn && <IdleManager timeoutMs={10 * 60 * 1000} />}
      {/* If LandingPage fails, this div will show us the app is at least alive */}
      {renderContent() || <div className="p-10 text-black">Route not found or component failed to load.</div>}
    </div>
  );
}

export default App;