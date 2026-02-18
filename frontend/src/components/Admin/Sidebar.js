import React from 'react';
import { 
  LayoutDashboard, Calendar, BookOpen, Users, 
  GraduationCap, Layers, Upload, Building, Library,
  UserCheck // <--- Imported for Teachers
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const SidebarItem = ({ id, label, icon: Icon }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 border-2 border-transparent transition-all mb-1 font-bold uppercase text-sm
        ${activeTab === id 
          ? 'bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]' 
          : 'text-gray-600 hover:border-black hover:text-black hover:bg-gray-50'}`}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="w-64 bg-white border-r-2 border-black flex-shrink-0 fixed h-full z-10 overflow-y-auto">
      <div className="p-6 border-b-2 border-black mb-2">
        <h1 className="text-2xl font-black text-black flex items-center tracking-tighter">
          <LayoutDashboard className="mr-2" strokeWidth={2.5} /> ADMIN
        </h1>
      </div>
      <nav className="p-4 space-y-1">
        
        {/* ORGANIZATION */}
        <SidebarItem id="institutes" label="Institutes" icon={Building} />
        <SidebarItem id="departments" label="Departments" icon={Library} />
        
        <div className="my-2 border-t-2 border-gray-200"></div>

        {/* ACADEMICS */}
        <SidebarItem id="years" label="Academic Years" icon={Calendar} />
        <SidebarItem id="semesters" label="Semesters" icon={Layers} />
        <SidebarItem id="subjects" label="Subjects" icon={BookOpen} />
        <SidebarItem id="classes" label="Classes" icon={GraduationCap} />
        
        <div className="my-2 border-t-2 border-gray-200"></div>

        {/* PEOPLE & DATA */}
        <SidebarItem id="teachers" label="Teacher Data" icon={UserCheck} /> {/* NEW */}
        <SidebarItem id="students" label="Student Data" icon={Users} />     {/* NEW */}
        <SidebarItem id="allocations" label="Allocations" icon={Users} />
        <SidebarItem id="users" label="Bulk Upload" icon={Upload} />
      </nav>
    </aside>
  );
};

export default Sidebar;