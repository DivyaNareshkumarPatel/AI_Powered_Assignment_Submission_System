import { useState, useEffect } from 'react';
import { getStudentSubmissions } from '@/utils/api'; // Ensure this fetches your past submissions
import { fetchStudentSubmissionDetails } from '@/utils/api';
import { Loader2, CheckCircle, ShieldAlert, Video, MessageSquare, Bot, Eye, X, Award } from 'lucide-react';
import PDFViewer from '@/components/common/PDFViewer';

export default function StudentResults() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewPdf, setViewPdf] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      // You might need to ensure this API function exists in your api.js
      // It should fetch "SELECT * FROM submissions WHERE student_id = ..."
      const data = await getStudentSubmissions(); 
      setSubmissions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openReportModal = async (submission) => {
      setSelectedSubmission(submission);
      setDetails(null);
      setLoadingDetails(true);
      try {
          const data = await fetchStudentSubmissionDetails(submission.submission_id);
          setDetails(data);
      } catch (err) {
          console.error(err);
      } finally {
          setLoadingDetails(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">My Results & Feedback</h2>
            <p className="text-gray-500">View your grades, teacher remarks, and AI analysis reports.</p>
        </div>

        {/* RESULTS TABLE */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? <div className="p-10 text-center"><Loader2 className="animate-spin inline" /></div> : 
             submissions.length > 0 ? (
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
                        <tr>
                            <th className="p-4">Assignment</th>
                            <th className="p-4">Submitted On</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Grade</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {submissions.map(s => (
                            <tr key={s.submission_id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-slate-900">{s.title || "Assignment"}</td>
                                <td className="p-4 text-sm text-gray-500">{new Date(s.submitted_at).toLocaleDateString()}</td>
                                <td className="p-4"><StatusBadge status={s.status} /></td>
                                <td className="p-4">
                                    {s.final_score ? (
                                        <span className="font-bold text-slate-900 bg-green-100 text-green-700 px-2 py-1 rounded">{s.final_score}/100</span>
                                    ) : <span className="text-gray-400">-</span>}
                                </td>
                                <td className="p-4">
                                    <button 
                                        onClick={() => openReportModal(s)}
                                        className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                                    >
                                        View Report
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-10 text-center text-gray-400">No graded submissions found.</div>
            )}
        </div>

        {/* --- REPORT CARD MODAL --- */}
        {selectedSubmission && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{selectedSubmission.title || "Assignment Report"}</h3>
                            <p className="text-sm text-gray-500">Submitted on {new Date(selectedSubmission.submitted_at).toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                    </div>

                    <div className="p-6 space-y-8">
                        
                        {/* 1. GRADE & REMARKS SECTION */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Final Grade</p>
                                    <h2 className="text-5xl font-bold">{selectedSubmission.final_score || "N/A"}</h2>
                                    <p className="text-slate-400 text-sm mt-2">out of 100</p>
                                </div>
                                <Award className="absolute -bottom-4 -right-4 text-slate-800 w-32 h-32 opacity-50" />
                            </div>
                            
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                    <MessageSquare size={18} /> Teacher Remarks
                                </h4>
                                <p className="text-sm text-gray-600 italic leading-relaxed">
                                    "{selectedSubmission.teacher_remarks || "No remarks provided."}"
                                </p>
                                <button 
                                    onClick={() => setViewPdf({ url: selectedSubmission.file_url, title: "My Submission" })}
                                    className="mt-4 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <Eye size={14} /> View My Submitted File
                                </button>
                            </div>
                        </div>

                        {/* 2. AI & SECURITY REPORT */}
                        {loadingDetails ? <div className="py-10 text-center"><Loader2 className="animate-spin inline" /></div> : details ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldAlert className="text-slate-900" size={20} />
                                    <h3 className="font-bold text-lg text-slate-900">AI & Security Analysis</h3>
                                </div>

                                {/* Security Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {details.vivaSession ? (
                                        <>
                                            <ScoreCard label="Integrity Score" value={details.vivaSession.integrity_score} color={details.vivaSession.integrity_score > 70 ? "green" : "red"} />
                                            <ScoreCard label="Face Match" value={details.vivaSession.face_match_score} color={details.vivaSession.face_match_score > 80 ? "green" : "orange"} />
                                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Viva Recording</p>
                                                {details.vivaSession.video_url ? (
                                                     <a href={details.vivaSession.video_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                                                        <Video size={16} /> Watch
                                                     </a>
                                                ) : <span className="text-xs text-gray-400">Not Available</span>}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="col-span-3 text-center py-4 text-gray-400 bg-gray-50 rounded-xl text-sm">No Viva Session Data Found</div>
                                    )}
                                </div>

                                {/* Viva Transcript */}
                                {details.vivaLogs && details.vivaLogs.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                            <h4 className="font-bold text-sm text-slate-700">Viva Q&A Transcript</h4>
                                        </div>
                                        <div className="p-4 space-y-4 max-h-48 overflow-y-auto">
                                            {details.vivaLogs.map((log, i) => (
                                                <div key={i} className="text-sm">
                                                    <p className="font-bold text-slate-800"><span className="text-slate-400 mr-2">Q{i+1}:</span>{log.question_text}</p>
                                                    <p className="text-gray-600 pl-6 border-l-2 border-gray-200 mt-1 ml-1">"{log.student_answer_transcript}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Feedback */}
                                {details.aiReport && (
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        <h4 className="font-bold text-purple-900 text-sm mb-2 flex items-center gap-2"><Bot size={16} /> AI Feedback</h4>
                                        <p className="text-sm text-purple-800 leading-relaxed">
                                            {JSON.stringify(details.aiReport.feedback_json) || "No summary available."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        )}

        <PDFViewer isOpen={!!viewPdf} onClose={() => setViewPdf(null)} fileUrl={viewPdf?.url} title={viewPdf?.title} />
    </div>
  );
}

function StatusBadge({ status }) {
    const styles = { 'PENDING': 'bg-gray-100 text-gray-600', 'AI_GRADED': 'bg-blue-50 text-blue-700', 'TEACHER_VERIFIED': 'bg-green-50 text-green-700', 'FLAGGED': 'bg-red-50 text-red-700' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles['PENDING']}`}>{status?.replace('_', ' ')}</span>;
}

function ScoreCard({ label, value, color }) {
    const colors = { green: 'text-green-600 bg-green-50', orange: 'text-orange-600 bg-orange-50', red: 'text-red-600 bg-red-50' };
    return (
        <div className={`p-4 rounded-xl border border-gray-100 shadow-sm text-center ${colors[color] || 'bg-white'}`}>
            <p className="text-xs font-bold opacity-70 uppercase mb-1">{label}</p>
            <p className="text-3xl font-bold">{value}%</p>
        </div>
    );
}