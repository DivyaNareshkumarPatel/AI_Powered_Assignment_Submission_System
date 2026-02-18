'use client';

import React, { useState, useEffect } from 'react';
import { 
  getYears, getSemesters, getSubjects, getClasses, getTeachers, 
  getInstitutes, getDepartments 
} from '@/utils/api';

import Sidebar from '@/components/Admin/Sidebar';
import StatusMessage from '@/components/Admin/StatusMessage';

// Forms
import AcademicYearForm from '@/components/Admin/forms/AcademicYearForm';
import SemesterForm from '@/components/Admin/forms/SemesterForm';
import SubjectForm from '@/components/Admin/forms/SubjectForm';
import ClassForm from '@/components/Admin/forms/ClassForm';
import AllocationForm from '@/components/Admin/forms/AllocationForm';
import BulkUploadForm from '@/components/Admin/forms/BulkUploadForm';
import InstituteForm from '@/components/Admin/forms/InstituteForm';
import DepartmentForm from '@/components/Admin/forms/DepartmentForm';

// New Data Views
import TeacherList from '@/components/Admin/views/TeacherList';
import StudentList from '@/components/Admin/views/StudentList';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('institutes'); 
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Global Data
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [departments, setDepartments] = useState([]);

  const refreshAllData = async () => {
    try {
      setLoading(true);
      const [y, s, sub, c, t, i, d] = await Promise.all([
        getYears(), getSemesters(), getSubjects(), getClasses(), getTeachers(),
        getInstitutes(), getDepartments()
      ]);
      setYears(y); setSemesters(s); setSubjects(sub); setClasses(c); setTeachers(t);
      setInstitutes(i); setDepartments(d);
    } catch (err) {
      console.error("Failed to load data", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshAllData(); }, []);

  const handleSuccess = (msg) => {
    setMessage(msg);
    setError(null);
    refreshAllData();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleError = (msg) => {
    setError(msg);
    setMessage(null);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-black">
      
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setMessage(null); setError(null); }} />

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8 border-b border-black pb-4">
          <h2 className="text-3xl font-bold uppercase tracking-wide">
            {activeTab.replace('-', ' ')}
          </h2>
          {loading && <span className="text-sm font-mono animate-pulse">SYNCING DATA...</span>}
        </header>

        <StatusMessage message={message} error={error} />

        <div className="bg-white border-2 border-black p-8 max-w-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          
          {/* FORMS */}
          {activeTab === 'institutes' && <InstituteForm onSuccess={handleSuccess} onError={handleError} institutes={institutes} />}
          {activeTab === 'departments' && <DepartmentForm onSuccess={handleSuccess} onError={handleError} institutes={institutes} departments={departments} />}
          
          {activeTab === 'years' && <AcademicYearForm onSuccess={handleSuccess} onError={handleError} years={years} />}
          {activeTab === 'semesters' && <SemesterForm onSuccess={handleSuccess} onError={handleError} years={years} />}
          {activeTab === 'subjects' && <SubjectForm onSuccess={handleSuccess} onError={handleError} />}
          {activeTab === 'classes' && <ClassForm onSuccess={handleSuccess} onError={handleError} semesters={semesters} />}
          {activeTab === 'allocations' && <AllocationForm onSuccess={handleSuccess} onError={handleError} teachers={teachers} subjects={subjects} classes={classes} />}
          {activeTab === 'users' && <BulkUploadForm onSuccess={handleSuccess} onError={handleError} />}

          {/* NEW DATA VIEWS (No forms, just lists) */}
          {activeTab === 'teachers' && <TeacherList />}
          {activeTab === 'students' && <StudentList />}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;