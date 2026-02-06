'use client';

import { useState } from 'react';
import Sidebar from '@/components/student/Sidebar';
import PendingAssignments from '@/components/student/PendingAssignments';
import SubmissionHistory from '@/components/student/SubmissionHistory';
import StudentResults from '@/components/student/StudentResults'; // <--- 1. Import it

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="ml-72 p-10 min-h-screen">
        {activeTab === 'pending' && <PendingAssignments />}
        {activeTab === 'history' && <SubmissionHistory />}
        
        {/* 2. Add this condition */}
        {activeTab === 'results' && <StudentResults />}
      </main>
    </div>
  );
}