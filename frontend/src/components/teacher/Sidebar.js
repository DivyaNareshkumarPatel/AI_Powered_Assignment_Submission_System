'use client';

import { Users, Upload, CheckCircle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Sidebar({ activeTab, setActiveTab }) {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
        localStorage.clear();
    }
    router.push('/login');
  };

  const menuItems = [
    { id: 'students', label: 'Assignment Archive', icon: Users },
    { id: 'upload', label: 'Deploy Assignment', icon: Upload },
    { id: 'submissions', label: 'Review Work', icon: CheckCircle },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col justify-between h-screen fixed left-0 top-0 z-50">
      <div>
        {/* Professional Header / Logo Area */}
        <div className="mb-10 flex items-center gap-3 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
             <span className="text-white font-bold text-xl">V</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">VeriViva</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Teacher Portal</p>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab && setActiveTab(item.id)}
                className={`flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <Icon 
                  size={18} 
                  className={isActive ? 'text-blue-700' : 'text-slate-400'} 
                  strokeWidth={isActive ? 2.5 : 2} 
                /> 
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
      
      {/* Logout Area */}
      <div className="pt-6 border-t border-slate-100">
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </aside>
  );
}