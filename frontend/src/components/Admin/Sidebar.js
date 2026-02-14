import React from 'react';
import { 
  LayoutDashboard, Calendar, BookOpen, Users, 
  GraduationCap, Layers, Upload 
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  
  // --- SidebarItem IS DEFINED HERE ---
  const SidebarItem = ({ id, label, icon: Icon }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1
        ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
  // -----------------------------------

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-10 overflow-y-auto">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-blue-700 flex items-center">
          <LayoutDashboard className="mr-2" /> Admin
        </h1>
      </div>
      <nav className="p-4">
        {/* Usages of SidebarItem */}
        <SidebarItem id="years" label="Academic Years" icon={Calendar} />
        <SidebarItem id="semesters" label="Semesters" icon={Layers} />
        <SidebarItem id="subjects" label="Subjects" icon={BookOpen} />
        <SidebarItem id="classes" label="Classes" icon={GraduationCap} />
        <SidebarItem id="allocations" label="Allocations" icon={Users} />
        <SidebarItem id="users" label="Bulk Upload" icon={Upload} />
      </nav>
    </aside>
  );
};

export default Sidebar;