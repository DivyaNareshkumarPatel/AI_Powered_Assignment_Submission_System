import { useState, useEffect } from 'react';
import { fetchPendingAssignments, submitAssignment } from '@/utils/api';
import { UploadCloud, FileText, Loader2, Clock, Eye } from 'lucide-react';
import PDFViewer from '@/components/common/PDFViewer';

export default function PendingAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  
  // Simple State (No Fetching logic needed)
  const [viewPdf, setViewPdf] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingAssignments();
      setAssignments(data || []);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleFileUpload = async (e, assignmentId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(assignmentId);
    const formData = new FormData();
    formData.append('assignment_id', assignmentId);
    formData.append('submission_file', file);

    try {
      await submitAssignment(formData);
      alert('Submitted successfully!');
      loadData();
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setUploading(null);
    }
  };

  return (
    <>
        <div className="max-w-5xl mx-auto">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Pending Assignments</h2>
            <p className="text-gray-500">Upload your work before the deadline.</p>
        </div>

        {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin inline text-slate-900 w-8 h-8" /></div>
        ) : assignments.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">All Caught Up!</h3>
                <p className="text-gray-500">You have no pending assignments.</p>
            </div>
        ) : (
            <div className="grid gap-6">
            {assignments.map(a => (
                <div key={a.assignment_id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                    <div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{a.subject_code}</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{a.title}</h3>
                    <p className="text-sm text-gray-500">Subject: {a.subject_name} • Prof. {a.teacher_name}</p>
                    </div>
                    <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-orange-600 font-medium bg-orange-50 px-3 py-1 rounded-full">
                        <Clock size={14} /> Due: {new Date(a.deadline).toLocaleDateString()}
                    </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <p className="text-slate-600 text-sm mb-3">{a.description}</p>
                    
                    {/* BUTTON JUST OPENS THE VIEWER - NO FETCH */}
                    {a.question_file_url && (
                        <button 
                            onClick={() => setViewPdf({ url: a.question_file_url, title: a.title })}
                            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
                        >
                            <Eye size={16} /> View Question File
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <label className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition cursor-pointer shadow-lg
                        ${uploading === a.assignment_id ? 'bg-gray-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black'}`}>
                        {uploading === a.assignment_id ? (
                            <><Loader2 className="animate-spin" size={20} /> Uploading...</>
                        ) : (
                            <><UploadCloud size={20} /> Upload Submission (PDF)</>
                        )}
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.doc,.docx"
                            disabled={uploading === a.assignment_id}
                            onChange={(e) => handleFileUpload(e, a.assignment_id)}
                        />
                    </label>
                </div>
                </div>
            ))}
            </div>
        )}
        </div>

        <PDFViewer 
            isOpen={!!viewPdf} 
            onClose={() => setViewPdf(null)} 
            fileUrl={viewPdf?.url} 
            title={viewPdf?.title}
        />
    </>
  );
}