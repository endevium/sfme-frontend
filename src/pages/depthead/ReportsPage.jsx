import React from 'react';
import Sidebar from '../../components/Sidebar';

const ReportsPage = () => {
  return (
    <div className="min-h-screen w-full font-['Optima-Medium','Optima','Candara','sans-serif'] text-slate-900 bg-slate-50 overflow-x-hidden flex flex-col lg:flex-row">
      <Sidebar role="depthead" activeItem="reports" />
      <div className="flex-1 flex flex-col">
        
        <main className="container mx-auto px-6 py-12 max-w-6xl flex-1">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-slate-500 mt-4">Evaluation reports will appear here.</p>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
