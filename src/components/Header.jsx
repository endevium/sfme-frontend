import React, { useEffect, useState } from 'react';
// 1. Import your logo here
import logo from '../assets/header-logo.png'; 
import SafeImg from './SafeImg';

const Header = ({ userName, userRole }) => {
  let storedUser = null;
  try {
    // Prefer sessionStorage (we store session tokens there). Fall back to localStorage for compatibility.
    const raw = sessionStorage.getItem('authUser') || localStorage.getItem('authUser') || 'null';
    storedUser = JSON.parse(raw);
  } catch {
    storedUser = null;
  }

  const resolvedName =
    userName ||
    `${storedUser?.firstname || ''} ${storedUser?.lastname || ''}`.trim() ||
    'User';

  const roleMap = {
    student: 'Student',
    faculty: 'Faculty',
    department_head: 'Department Head',
  };

  let resolvedRole = userRole || roleMap[storedUser?.user_type] || 'Student';

  const [fetchedDepartment, setFetchedDepartment] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  // Fetch department from backend when logged-in user is a department head
  useEffect(() => {
    if (storedUser?.user_type === 'department_head' && storedUser?.id) {
      // If localStorage already has department, prefer that to avoid extra call
      if (storedUser.department) {
        setFetchedDepartment(storedUser.department);
        return;
      }

      const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/department-heads/${storedUser.id}/`;

      fetch(url, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch department');
          return res.json();
        })
        .then((data) => {
          // DepartmentHeadDetailView returns the serialized object
          if (data && data.department) setFetchedDepartment(data.department);
        })
        .catch(() => {
          // ignore failures - header will fall back to default role
        });
    }
  }, [storedUser?.user_type, storedUser?.id]);

  // Show department for department head (use fetched value when available)
  if (storedUser?.user_type === 'department_head' && (fetchedDepartment || storedUser?.department)) {
    const dept = (fetchedDepartment || storedUser.department).toUpperCase();
    resolvedRole = `${dept} Department Head`;
  }

  const homePathMap = {
    Student: '/dashboard',
    Faculty: '/faculty-dashboard',
    'Department Head': '/depthead-dashboard',
  };

  // If `resolvedRole` contains the department name (e.g. "COMPUTER_SCIENCE Department Head")
  // the map lookup above will fail. Detect the Department Head suffix and route
  // to the department head dashboard in that case.
  let homePath = '/';
  if (typeof resolvedRole === 'string' && resolvedRole.includes('Department Head')) {
    homePath = homePathMap['Department Head'];
  } else {
    homePath = homePathMap[resolvedRole] || '/';
  }

  return (
    <header className="w-full bg-[#1f474d] shadow-lg sticky top-0 z-50 h-[80px] flex items-center border-b border-white/10">
      <div className="w-full px-8"> 
        <div className="flex justify-between items-center">
          
          {/* Left: Brand Logo Area */}
         <div className="flex items-center gap-3">
           <SafeImg
            src={logo}
            alt="UPang SFME Logo"
            className="h-12 w-auto object-contain cursor-pointer"
            onClick={() => window.location.href = homePath}
           />
         </div>

          {/* Right: User Profile */}
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-white font-semibold text-sm">{resolvedName}</p>
               <p className="text-cyan-300 text-[10px] uppercase tracking-wider">{resolvedRole}</p>
             </div>
             
             <div className="relative">
               <SafeImg
                 src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                 className="w-10 h-10 rounded-full border-2 border-[#ffcc00]/50 object-cover"
                 alt="avatar"
               />
             </div>

             
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;