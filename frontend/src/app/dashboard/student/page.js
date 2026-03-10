'use client';

import { useState } from 'react';
import Sidebar from '@/components/student/Sidebar';
import PendingAssignments from '@/components/student/PendingAssignments';
import SubmissionHistory from '@/components/student/SubmissionHistory';
import VivaInterface from '@/components/student/VivaInterface'; // 🔴 IMPORT NEW COMPONENT
import ProtectedRoute from '@/components/ProtectedRoute';
import { X, Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { submitAssignment } from '@/utils/api'; 

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('pending');
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // State to hold the active Viva submission ID
  const [activeVivaId, setActiveVivaId] = useState(null);

  const handleUploadClick = (assignment) => {
    setSelectedAssignment(assignment);
    setUploadModalOpen(true);
    setFile(null);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setUploadModalOpen(false);
    setSelectedAssignment(null);
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a PDF file to submit.');
    
    setIsSubmitting(true);
    setError('');
    
    try {
        const formData = new FormData();
        formData.append('assignment_id', selectedAssignment.assignment_id);
        formData.append('submission_file', file);

        // 🔴 If the PDF count is wrong, this will throw the error from the backend!
        const response = await submitAssignment(formData);
        
        setSuccess('PDF Format Verified! Preparing AI Viva environment...');
        
        setTimeout(() => {
            handleCloseModal();
            setActiveVivaId(response.submission_id); // Save the ID
            setActiveTab('viva'); // Change tab to start the Viva
        }, 2000);

    } catch (err) {
        // Display the specific PDF Format Mismatch error sent from backend
        setError(err.response?.data?.error || 'Failed to submit assignment.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex">
        {/* Hide Sidebar during Viva to prevent distraction/cheating */}
        {activeTab !== 'viva' && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
        
        <main className={`flex-1 min-h-screen transition-all ${activeTab !== 'viva' ? 'ml-72 p-10' : 'p-0'}`}>
          {activeTab === 'pending' && <PendingAssignments onUploadClick={handleUploadClick} />}
          {activeTab === 'history' && <SubmissionHistory />}
          
          {/* Render the Viva Interface */}
          {activeTab === 'viva' && (
              <VivaInterface 
                  submissionId={activeVivaId} 
                  onComplete={() => { setActiveVivaId(null); setActiveTab('history'); }} 
              />
          )}
        </main>

        {uploadModalOpen && selectedAssignment && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Submit Assignment</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1">{selectedAssignment.title}</p>
                        </div>
                        <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                    </div>
                    
                    <form onSubmit={handleSubmitWork} className="p-6 space-y-6">
                        {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium leading-relaxed flex gap-3 items-start"><AlertTriangle className="shrink-0 mt-0.5" size={18} /> <p>{error}</p></div>}
                        {success && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium flex gap-3 items-center"><CheckCircle size={18} /> {success}</div>}
                        
                        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 relative">
                            <label className="cursor-pointer block w-full h-full absolute inset-0 opacity-0 z-10"><input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} required /></label>
                            <Upload size={36} className="mx-auto mb-3 text-blue-500" />
                            <span className="block text-sm font-bold text-slate-700 mb-1">Select PDF File</span>
                            <span className="text-xs font-medium text-slate-400">{file ? <span className="text-blue-600 font-bold">{file.name}</span> : 'Click to upload your work'}</span>
                        </div>

                        <button type="submit" disabled={isSubmitting || !file} className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 transition disabled:opacity-70 relative z-20">
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                            {isSubmitting ? 'Scanning File Format...' : 'Submit & Start Viva'}
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </ProtectedRoute>
  );
}