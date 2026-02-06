import { useState, useEffect } from 'react';
import { fetchTeacherAssignments, fetchSubmissions, fetchTeacherAllocations, updateSubmissionGrade, fetchSubmissionDetails } from '@/utils/api';
import { ChevronRight, Loader2, Eye, X, Save, Bot, ShieldAlert, Video, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
import PDFViewer from '@/components/common/PDFViewer';

export default function SubmissionReview() {
  const [allocations, setAllocations] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  // Filter States
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [viewPdf, setViewPdf] = useState(null);
  
  // Modal States
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [vivaDetails, setVivaDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('grading'); // 'grading' or 'report'

  // Edit States
  const [editScore, setEditScore] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allocData, asgData] = await Promise.all([
          fetchTeacherAllocations(),
          fetchTeacherAssignments()
        ]);
        setAllocations(allocData || []);
        setAllAssignments(asgData || []);
      } catch (err) { console.error(err); }
    };
    loadData();
  }, []);

  // Filter Logic
  const uniqueClasses = [...new Map(allocations.map(item => [item.class_id, item])).values()];
  const availableSubjects = allocations.filter(a => a.class_id === selectedClassId);
  const availableAssignments = allAssignments.filter(a => a.class_id === selectedClassId && a.subject_id === selectedSubjectId);

  const handleAssignmentChange = async (e) => {
    const asgId = e.target.value;
    setSelectedAssignmentId(asgId);
    if (asgId) {
      setLoading(true);
      try {
        const data = await fetchSubmissions(asgId);
        setSubmissions(data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    } else { setSubmissions([]); }
  };

  const openReviewModal = async (submission) => {
      setSelectedSubmission(submission);
      setEditScore(submission.final_score || '');
      setEditRemarks(submission.teacher_remarks || '');
      setVivaDetails(null);
      setActiveTab('grading'); // Reset to first tab
      
      setLoadingDetails(true);
      try {
          const details = await fetchSubmissionDetails(submission.submission_id);
          setVivaDetails(details);
      } catch (err) { console.error("Failed to load details", err); } 
      finally { setLoadingDetails(false); }
  };

  const handleSaveGrade = async () => {
      if (!selectedSubmission) return;
      setSaving(true);
      try {
          await updateSubmissionGrade(selectedSubmission.submission_id, editScore, editRemarks);
          setSubmissions(prev => prev.map(s => 
              s.submission_id === selectedSubmission.submission_id 
                  ? { ...s, final_score: editScore, teacher_remarks: editRemarks, status: 'TEACHER_VERIFIED' }
                  : s
          ));
          setSelectedSubmission(null);
          alert("Grade updated successfully!");
      } catch (err) { alert("Failed to save grade."); } 
      finally { setSaving(false); }
  };

  return (
    <>
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Grading & Review</h2>
                <p className="text-gray-500">Review assignments, AI integrity scores, and Viva logs.</p>
            </div>

            {/* FILTERS & TABLE */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <select className="p-2 border rounded" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                        <option value="">Select Class</option>
                        {uniqueClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
                    </select>
                    <select className="p-2 border rounded" value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} disabled={!selectedClassId}>
                        <option value="">Select Subject</option>
                        {availableSubjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>)}
                    </select>
                    <select className="p-2 border rounded" value={selectedAssignmentId} onChange={handleAssignmentChange} disabled={!selectedSubjectId}>
                        <option value="">Select Assignment</option>
                        {availableAssignments.map(a => <option key={a.assignment_id} value={a.assignment_id}>{a.title}</option>)}
                    </select>
                </div>

                {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin inline w-8 h-8" /></div> : 
                submissions.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                            <tr><th className="p-4">Student</th><th className="p-4">Status</th><th className="p-4">Score</th><th className="p-4">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {submissions.map((s) => (
                            <tr key={s.submission_id} className="hover:bg-gray-50 transition">
                                <td className="p-4">
                                    <div className="font-medium text-slate-900">{s.student_name}</div>
                                    <div className="text-xs text-gray-500">{s.enrollment_number}</div>
                                </td>
                                <td className="p-4"><StatusBadge status={s.status} /></td>
                                <td className="p-4 font-bold text-slate-800">{s.final_score || '-'}</td>
                                <td className="p-4">
                                    <button onClick={() => openReviewModal(s)} className="text-slate-900 hover:text-blue-600 text-sm font-semibold flex items-center gap-1">
                                        Review <ChevronRight size={14} />
                                    </button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                ) : <div className="text-center py-20 text-gray-400">No submissions found.</div>}
            </div>
        </div>

        {/* --- DETAILED MODAL --- */}
        {selectedSubmission && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white z-10">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{selectedSubmission.student_name}</h3>
                            <p className="text-sm text-gray-500">{selectedSubmission.enrollment_number}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('grading')} className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'grading' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Grading</button>
                            <button onClick={() => setActiveTab('report')} className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'report' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>AI & Security Report</button>
                            <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition ml-2"><X size={24} /></button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                        
                        {/* TAB 1: GRADING */}
                        {activeTab === 'grading' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Final Grade</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" value={editScore} onChange={(e) => setEditScore(e.target.value)}
                                                className="w-full text-4xl font-bold text-slate-900 bg-transparent border-b-2 border-slate-200 focus:border-slate-900 outline-none pb-2 transition"
                                            />
                                            <span className="text-gray-400 font-medium">/ 100</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setViewPdf({ url: selectedSubmission.file_url, title: `Submission: ${selectedSubmission.student_name}` })} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-200">
                                        <Eye size={18} /> View Student PDF
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Teacher Remarks</label>
                                    <textarea 
                                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none h-40 resize-none text-sm shadow-sm"
                                        placeholder="Enter feedback for the student..." value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: AI & SECURITY REPORT */}
                        {activeTab === 'report' && (
                            loadingDetails ? <div className="py-20 text-center"><Loader2 className="animate-spin inline" /></div> :
                            vivaDetails?.vivaSession ? (
                                <div className="space-y-6">
                                    
                                    {/* 1. Security Scores */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <ScoreCard label="Integrity Score" value={vivaDetails.vivaSession.integrity_score} color={vivaDetails.vivaSession.integrity_score > 70 ? "green" : "red"} icon={<ShieldAlert size={18} />} />
                                        <ScoreCard label="Face Match Score" value={vivaDetails.vivaSession.face_match_score} color={vivaDetails.vivaSession.face_match_score > 80 ? "green" : "orange"} icon={<CheckCircle size={18} />} />
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1"><Video size={16} /><span className="text-xs font-bold uppercase">Session Video</span></div>
                                            {vivaDetails.vivaSession.video_url ? (
                                                <a href={vivaDetails.vivaSession.video_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-medium break-all">Watch Recording</a>
                                            ) : <span className="text-gray-400 text-sm">Not Available</span>}
                                        </div>
                                    </div>

                                    {/* 2. Viva Transcript */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                                            <MessageSquare size={16} className="text-slate-600" />
                                            <h4 className="font-bold text-slate-700 text-sm">Viva Question Log</h4>
                                        </div>
                                        <div className="p-4 space-y-4 max-h-60 overflow-y-auto">
                                            {vivaDetails.vivaLogs && vivaDetails.vivaLogs.length > 0 ? vivaDetails.vivaLogs.map((log, i) => (
                                                <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                                    <p className="font-bold text-slate-800 text-sm mb-1"><span className="text-slate-400 mr-2">Q{i+1}:</span>{log.question_text}</p>
                                                    <p className="text-sm text-gray-600 pl-6 italic">" {log.student_answer_transcript || "No answer detected"} "</p>
                                                    {log.ai_evaluation && (
                                                        <div className="mt-2 ml-6 text-xs bg-purple-50 text-purple-700 p-2 rounded inline-block">
                                                            <Bot size={12} className="inline mr-1" /> <b>AI:</b> {log.ai_evaluation.feedback || "Verified"}
                                                        </div>
                                                    )}
                                                </div>
                                            )) : <p className="text-gray-400 text-sm text-center">No logs found.</p>}
                                        </div>
                                    </div>

                                    {/* 3. AI Grading Summary */}
                                    {vivaDetails.aiReport && (
                                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                            <h4 className="font-bold text-purple-900 text-sm mb-2 flex items-center gap-2"><Bot size={16} /> AI Feedback Summary</h4>
                                            <p className="text-sm text-purple-800 leading-relaxed">{JSON.stringify(vivaDetails.aiReport.feedback_json) || "No summary available."}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                                    <ShieldAlert className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                                    <p className="text-gray-400">No Viva or AI Report data found for this submission.</p>
                                </div>
                            )
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 z-10">
                        <button onClick={() => setSelectedSubmission(null)} className="px-6 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg transition">Cancel</button>
                        <button onClick={handleSaveGrade} disabled={saving} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-black transition flex items-center gap-2 disabled:opacity-70">
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}

        <PDFViewer isOpen={!!viewPdf} onClose={() => setViewPdf(null)} fileUrl={viewPdf?.url} title={viewPdf?.title} />
    </>
  );
}

// Helper Component for Score Cards
function ScoreCard({ label, value, color, icon }) {
    const colors = {
        green: 'text-green-600 bg-green-50 border-green-100',
        orange: 'text-orange-600 bg-orange-50 border-orange-100',
        red: 'text-red-600 bg-red-50 border-red-100',
    };
    return (
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${colors[color] || 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 opacity-80 mb-1">
                {icon}
                <span className="text-xs font-bold uppercase">{label}</span>
            </div>
            <p className="text-3xl font-bold">{value}%</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = { 'PENDING': 'bg-gray-100 text-gray-600', 'AI_GRADED': 'bg-blue-50 text-blue-700', 'TEACHER_VERIFIED': 'bg-green-50 text-green-700' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles['PENDING']}`}>{status?.replace('_', ' ')}</span>;
}