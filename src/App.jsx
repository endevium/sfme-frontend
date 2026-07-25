import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import IdleManager from './components/IdleManager.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import { getToken, getUser } from './utils/auth';

// Main Pages
import LandingPage from './pages/LandingPage.jsx';
import About from './pages/About.jsx';
import ContactPage from './pages/ContactPage.jsx';

// Dept Head Pages
import DeptHeadDashboard from './pages/depthead/DeptHeadDashboard.jsx';
import AuditLogPage from './pages/depthead/AuditLogPage.jsx';
import FacultyPages from './pages/depthead/FacultyPages.jsx';
import ReportsPage from './pages/depthead/ReportsPage.jsx';
import StudentsPage from './pages/depthead/StudentsPage.jsx';
import CoursesPage from './pages/depthead/CoursesPage.jsx';
import BlockSectionsPage from './pages/depthead/BlockSectionsPage.jsx';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard.jsx';
import FacultyClassroomPage from './pages/faculty/ClassroomPage.jsx';
import FacultyEnrollmentsPage from './pages/faculty/EnrollmentsPage.jsx';
import FacultyClassroomStudentsPage from './pages/faculty/ClassroomStudentsPage.jsx';
import FacultyFormsPage from './pages/faculty/Forms.jsx';
import FacultyAuditLogPage from './pages/faculty/AuditLogPage.jsx';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import HistoryPage from './pages/student/HistoryPage.jsx';
import ClassroomPage from './pages/student/ClassroomPage.jsx';
import StudentClassroomStudentsPage from './pages/student/ClassroomStudentsPage.jsx';
import ModulePage from './pages/student/ModulePage.jsx';
import EvaluationForm from './pages/student/EvaluationForm.jsx';
import EvaluationPage from './pages/student/EvaluationPage.jsx';
import StudentAuditLogPage from './pages/student/AuditLogPage.jsx';

function App() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
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

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/csrf/`, { credentials: 'include' }).catch(() => {});
  }, [API_BASE_URL]);

  // Show a brief splash screen on full page reloads
  useEffect(() => {
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      const navType = (navEntries && navEntries[0] && navEntries[0].type) || (performance.navigation && performance.navigation.type);
      // navigation.type === 1 indicates reload in legacy API
      const isReload = navType === 'reload' || navType === 1;
      if (isReload) {
        const showTimer = setTimeout(() => setShowSplash(true), 0);
        const hideTimer = setTimeout(() => setShowSplash(false), 900);
        return () => {
          clearTimeout(showTimer);
          clearTimeout(hideTimer);
        };
      }
    } catch {
      // ignore
    }
  }, []);

  // Accept token from sessionStorage (preferred) or localStorage (fallback for older flows)
  const isLoggedIn = Boolean(getToken());
  // Resolve user role from stored user info (used to restrict routes)
  const getResolvedRole = () => {
    let storedUser = null;
    try {
      const raw = sessionStorage.getItem('authUser') || localStorage.getItem('authUser') || null;
      storedUser = raw ? JSON.parse(raw) : getUser();
    } catch {
      storedUser = getUser();
    }

    const roleMap = {
      student: 'Student',
      faculty: 'Faculty',
      department_head: 'Department Head',
    };
    return roleMap[storedUser?.user_type] || null;
  };

  const resolvedRole = getResolvedRole();

  const isRouteAllowedForRole = (role, path) => {
    if (!role) return false;
    if (role === 'Student') return path === '/dashboard' || path.startsWith('/dashboard/');
    if (role === 'Faculty') return path === '/faculty-dashboard' || path.startsWith('/faculty-dashboard/');
    if (role === 'Department Head') return path === '/depthead-dashboard' || path.startsWith('/depthead-dashboard/');
    return false;
  };

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const isProtected =
      route.startsWith('/dashboard') ||
      route.startsWith('/depthead-dashboard') ||
      route.startsWith('/faculty-dashboard');

    if (!isLoggedIn && isProtected) {
      window.history.replaceState({}, '', '/');
      setTimeout(() => setRoute('/'), 0);
      return;
    }

    // If logged in but trying to access a route not allowed for the role,
    // redirect to the role's home.
    if (isLoggedIn && !isRouteAllowedForRole(resolvedRole, route)) {
      const homePathMap = {
        Student: '/dashboard',
        Faculty: '/faculty-dashboard',
        'Department Head': '/depthead-dashboard',
      };
      const target = homePathMap[resolvedRole] || '/dashboard';
      if (route !== target) {
        window.history.replaceState({}, '', target);
        setTimeout(() => setRoute(target), 0);
      }
    }
  }, [isLoggedIn, route, resolvedRole]);

  // If user is logged in, prevent landing page access via URL editing
  useEffect(() => {
    if (!isLoggedIn) return;
    if (route === '/' || route === '' || route === '/home') {
      const storedUser = getUser();

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
        setTimeout(() => setRoute(target), 0);
      }
    }
  }, [isLoggedIn, route]);

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

    // Dept Head Nested Routes (enforce role in render as a fallback)
    if (route.startsWith('/depthead-dashboard')) {
      if (resolvedRole !== 'Department Head') {
        // If a non-dept-head somehow reached this render path, show their dashboard
        if (resolvedRole === 'Faculty') return <FacultyDashboard />;
        return <StudentDashboard />;
      }

      if (route === '/depthead-dashboard/audit-log') return <AuditLogPage />;
      if (route === '/depthead-dashboard/faculty') return <FacultyPages />;
      if (route === '/depthead-dashboard/reports') return <ReportsPage />;
      if (route === '/depthead-dashboard/students') return <StudentsPage />;
      if (route === '/depthead-dashboard/courses') return <CoursesPage />;
      if (route === '/depthead-dashboard/block-sections') return <BlockSectionsPage />;
      return <DeptHeadDashboard />;
    }

    // Faculty Routes (enforce role)
    if (route.startsWith('/faculty-dashboard')) {
      if (resolvedRole !== 'Faculty') {
        if (resolvedRole === 'Department Head') return <DeptHeadDashboard />;
        return <StudentDashboard />;
      }

      if (route.startsWith('/faculty-dashboard/classroom/students')) return <FacultyClassroomStudentsPage />;
      if (route === '/faculty-dashboard/classroom') return <FacultyClassroomPage />;
      if (route === '/faculty-dashboard/enrollments') return <FacultyEnrollmentsPage />;
      if (route === '/faculty-dashboard/forms') return <FacultyFormsPage />;
      if (route === '/faculty-dashboard/audit-log') return <FacultyAuditLogPage />;
      return <FacultyDashboard />;
    }

    // Student Nested Routes
    if (route.startsWith('/dashboard')) {
      if (route.startsWith('/dashboard/classroom/students')) return <StudentClassroomStudentsPage />;
      if (route === '/dashboard/classroom') return <ClassroomPage />;
      if (route === '/dashboard/history') return <HistoryPage />;
      if (route === '/dashboard/audit-log') return <StudentAuditLogPage />;
      // New unified evaluation page with tabs
      if (route.startsWith('/dashboard/evaluation')) return <EvaluationPage />;
      // Backwards-compatible route: direct modules page still works.
      if (route === '/dashboard/modules') return <ModulePage />;
      // Legacy instructor-only URL now points to unified module-based evaluations.
      if (route.startsWith('/dashboard/evaluate-instructor/')) return <EvaluationPage />;
        
      if (route.startsWith('/dashboard/evaluate/')) {
        const moduleId = route.split('/')[3];               // ← <–– add this
        const { formId } = window.history.state || {};
        return <EvaluationForm moduleId={moduleId} evalFormId={formId} />;
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