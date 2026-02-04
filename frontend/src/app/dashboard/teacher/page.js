'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/teacher/Sidebar';
import ClassView from '@/components/teacher/ClassView';
import UploadAssignment from '@/components/teacher/UploadAssignment';
import SubmissionReview from '@/components/teacher/SubmissionReview';
import { fetchTeacherAllocations } from '@/utils/api';
import { Loader2, AlertCircle } from 'lucide-react';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('students');
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTeacherAllocations()
      .then((data) => {
        setAllocations(data || []); // Safety check: ensure it's always an array
      })
      .catch((err) => {
        console.error("Dashboard Error:", err);
        setError("Could not connect to server. Is the Backend running?");
      })
      .finally(() => {
        setLoading(false); // Stop loading no matter what
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-slate-900 w-12 h-12 mb-4" />
        <p className="text-slate-600 font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-700">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-bold">Connection Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      {/* 1. PASS setActiveTab TO SIDEBAR */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="ml-72 p-10 min-h-screen">
        {/* 2. PASS setActiveTab TO COMPONENTS IF THEY NEED IT */}
        {activeTab === 'students' && (
            <ClassView 
                allocations={allocations} 
                setActiveTab={setActiveTab} 
            />
        )}
        
        {activeTab === 'upload' && (
            <UploadAssignment 
                allocations={allocations} 
            />
        )}
        
        {activeTab === 'submissions' && (
            <SubmissionReview />
        )}
      </main>
    </div>
  );
}