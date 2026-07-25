import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import ModulePage from './ModulePage';

const EvaluationPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Keep a canonical path for the unified student evaluation page.
    const current = window.location.pathname || '';
    if (current !== '/dashboard/evaluation/modules') {
      window.history.replaceState({}, '', '/dashboard/evaluation/modules');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 flex flex-col">
      <div className="flex flex-1 flex-row relative">
        <Sidebar role="student" activeItem="evaluation" />

        <main className="flex-1 overflow-y-auto px-6 py-10">
          <div className="container mx-auto max-w-7xl">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-[#0f2f57] tracking-tight">Evaluations</h1>
              <p className="text-slate-600 mt-1 text-lg">Evaluate your modules and instructors</p>
            </header>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-7">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by module name, code, or instructor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-14 pl-11 pr-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none"
                  />
              </div>
            </div>

            <div>
              <ModulePage showSidebar={false} searchQuery={searchQuery} />
              </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EvaluationPage;
