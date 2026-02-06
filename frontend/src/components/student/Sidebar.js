'use client';

import { LayoutDashboard, History, LogOut, Award } from 'lucide-react'; // 1. Import Award Icon
import { useRouter } from 'next/navigation';

export default function Sidebar({ activeTab, setActiveTab }) {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.clear();
    router.push('/login');
  };

  return (
    <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col justify-between h-screen fixed left-0 top-0 z-50 shadow-lg">
      <div>
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
             <span className="text-white font-bold text-xl">V</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">VeriViva</h1>
            <p className="text-xs text-gray-500 font-medium">STUDENT PORTAL</p>
          </div>
        </div>
        
        <nav className="space-y-2">
            <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium transition cursor-pointer
                ${activeTab === 'pending' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <LayoutDashboard size={18} /> My Assignments
            </button>

            <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium transition cursor-pointer
                ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <History size={18} /> Submission History
            </button>

            {/* === 2. ADD THIS NEW BUTTON === */}
            <button 
                onClick={() => setActiveTab('results')}
                className={`flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium transition cursor-pointer
                ${activeTab === 'results' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <Award size={18} /> My Results
            </button>
        </nav>
      </div>
      
      <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition cursor-pointer">
        <LogOut size={18} /> Sign Out
      </button>
    </aside>
  );
}