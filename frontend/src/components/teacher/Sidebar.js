'use client';

import { Users, Upload, CheckCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Sidebar({ activeTab, setActiveTab }) {
  const router = useRouter();

  const handleLogout = () => {
    // Clear data and redirect
    if (typeof window !== 'undefined') {
        localStorage.clear();
    }
    router.push('/login');
  };

  const menuItems = [
    { id: 'students', label: 'My Classes', icon: Users },
    { id: 'upload', label: 'Create Assignment', icon: Upload },
    { id: 'submissions', label: 'Review Work', icon: CheckCircle },
  ];

  return (
    // ADDED z-50 TO FIX "UNCLICKABLE" ISSUE
    <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col justify-between h-screen fixed left-0 top-0 z-50 shadow-lg">
      <div>
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
             <span className="text-white font-bold text-xl">V</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">VeriViva</h1>
            <p className="text-xs text-gray-500 font-medium">TEACHER PORTAL</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                // Check if setActiveTab exists before calling it (Prevents Crash)
                onClick={() => setActiveTab && setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-slate-900'
                  }`}
              >
                <Icon size={18} /> {item.label}
              </button>
            )
          })}
        </nav>
      </div>
      
      <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition cursor-pointer">
        <LogOut size={18} /> Sign Out
      </button>
    </aside>
  );
}