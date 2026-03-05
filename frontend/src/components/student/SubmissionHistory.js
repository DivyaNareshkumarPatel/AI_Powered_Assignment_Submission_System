'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchStudentHistory, fetchStudentSubmissionDetails } from '@/utils/api';
import { CheckCircle, Search, Archive, ChevronRight, X, Video, ShieldAlert, Bot, MessageSquare } from 'lucide-react';
import PDFViewer from '@/components/common/PDFViewer';

const SubmissionHistory = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [details, setDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [viewPdf, setViewPdf] = useState(null);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await fetchStudentHistory();
                setSubmissions(data || []);
            } catch (err) { 
                console.error(err); 
            } finally { 
                setLoading(false); 
            }
        };
        loadHistory();
    }, []);

    // 🔴 STRICT FILTER: Only keep submissions from the current active academic year
    const currentSemSubmissions = useMemo(() => {
        return submissions.filter(s => s.is_active_year === true);
    }, [submissions]);
    
    // Extract subjects only from the current semester
    const availableSubjects = useMemo(() => {
        return [...new Set(currentSemSubmissions.map(s => s.subject_name))].filter(Boolean).sort();
    }, [currentSemSubmissions]);

    // Apply Search and Subject filters
    const displayedSubmissions = useMemo(() => {
        return currentSemSubmissions.filter(s => {
            const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  s.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSubj = !selectedSubject || s.subject_name === selectedSubject;
            return matchesSearch && matchesSubj;
        });
    }, [currentSemSubmissions, searchQuery, selectedSubject]);

    const openDetails = async (sub) => {
        setSelectedSubmission(sub);
        setDetailsLoading(true);
        try {
            const data = await fetchStudentSubmissionDetails(sub.submission_id);
            setDetails(data);
        } catch (err) { console.error(err); }
        finally { setDetailsLoading(false); }
    };

    if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header (No Tabs) */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Archive size={28} className="text-blue-600" /> Submission History
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Review your current semester submissions.</p>
            </div>

            {/* Filter Bar (No Semester Dropdown) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Search by title or subject..." 
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all text-slate-800" 
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <select className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none" 
                    value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                    <option value="">All Subjects</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Submissions Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {displayedSubmissions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="p-4 pl-6">Assignment Details</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Score</th>
                                <th className="p-4 text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedSubmissions.map((s) => (
                            <tr key={s.submission_id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 pl-6">
                                    <div className="font-bold text-slate-900 mb-1">{s.title}</div>
                                    <div className="text-xs font-medium text-slate-500">{s.subject_name} • Submitted: {new Date(s.submitted_at).toLocaleDateString()}</div>
                                </td>
                                <td className="p-4 text-center"><StatusBadge status={s.status} /></td>
                                <td className="p-4 text-center">
                                    {/* Updated to display % */}
                                    <span className={`text-lg font-bold ${s.final_score ? 'text-emerald-600' : 'text-slate-300'}`}>{s.final_score ? `${s.final_score}%` : '-'}</span>
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <button onClick={() => openDetails(s)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors shadow-sm">
                                        View Details <ChevronRight size={14} />
                                    </button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                ) : (
                    <div className="py-20 text-center flex flex-col items-center">
                        <Archive size={40} className="text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">No submissions found for the current semester.</p>
                    </div>
                )}
            </div>

            {/* View Details Modal Overlay */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{selectedSubmission.title}</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">{selectedSubmission.subject_name}</p>
                            </div>
                            <button onClick={() => setSelectedSubmission(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
                            
                            {/* Teacher Feedback & Score */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl flex flex-col justify-center items-center shadow-sm">
                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Final Score</span>
                                    {/* Added % sign here */}
                                    <span className="text-5xl font-black text-emerald-700">{selectedSubmission.final_score ? `${selectedSubmission.final_score}%` : '-'}</span>
                                </div>
                                <div className="md:col-span-2 bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Teacher Remarks</span>
                                    <p className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        {selectedSubmission.teacher_remarks ? `"${selectedSubmission.teacher_remarks}"` : "Your teacher has not provided remarks yet."}
                                    </p>
                                </div>
                            </div>

                            <button onClick={() => setViewPdf({ url: selectedSubmission.file_url, title: selectedSubmission.title })} className="w-full py-3 bg-white border border-slate-200 text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-all shadow-sm">
                                <Search size={18} /> View My Submitted PDF
                            </button>

                            {/* Viva & AI Details */}
                            {detailsLoading ? <div className="py-10 flex justify-center"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div> : 
                            details?.vivaSession ? (
                                <div className="space-y-6 pt-4 border-t border-slate-200">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><Bot size={20} className="text-indigo-600"/> AI Viva & Security Report</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${details.vivaSession.integrity_score > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                <ShieldAlert size={20}/>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 uppercase">Integrity Score</p>
                                                <p className="text-xl font-bold text-slate-900">{details.vivaSession.integrity_score}%</p>
                                            </div>
                                        </div>
                                        {details.vivaSession.video_url && (
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Video size={20}/></div>
                                                    <p className="text-sm font-bold text-slate-700">Session Video</p>
                                                </div>
                                                <a href={details.vivaSession.video_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-bold hover:underline">Watch &rarr;</a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Logs */}
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                            <MessageSquare size={16} className="text-slate-500" />
                                            <h4 className="font-bold text-slate-700 text-sm">Question Log & Scores</h4>
                                        </div>
                                        <div className="p-5 space-y-6 max-h-60 overflow-y-auto">
                                            {details.vivaLogs && details.vivaLogs.length > 0 ? details.vivaLogs.map((log, i) => {
                                                let aiEval = log.ai_evaluation;
                                                if (typeof aiEval === 'string') {
                                                    try { aiEval = JSON.parse(aiEval); } catch(e) {}
                                                }
                                                
                                                // Calculate individual question percentage safely
                                                const score = aiEval?.score || 0;
                                                const maxMarks = aiEval?.max_marks || 10;
                                                const questionPercentage = Math.round((score / maxMarks) * 100);

                                                return (
                                                    <div key={i} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                                                        {/* Header with Question and individual Percentage */}
                                                        <div className="flex justify-between items-start gap-4 mb-2">
                                                            <p className="font-bold text-slate-900 text-sm"><span className="text-blue-500 mr-2">Q{i+1}.</span>{log.question_text}</p>
                                                            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-xs whitespace-nowrap shadow-sm">
                                                                {questionPercentage}%
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-medium text-slate-600 pl-6 border-l-2 border-slate-200 italic py-1 bg-slate-50 rounded-r-lg">"{log.student_answer_transcript || "No answer detected"}"</p>
                                                    </div>
                                                );
                                            }) : <p className="text-slate-400 font-medium text-sm text-center">No logs found.</p>}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
            <PDFViewer isOpen={!!viewPdf} onClose={() => setViewPdf(null)} fileUrl={viewPdf?.url} title={viewPdf?.title} />
        </div>
    );
};

function StatusBadge({ status }) {
    const styles = { 'PENDING': 'bg-amber-50 text-amber-700 border-amber-200', 'AI_GRADED': 'bg-indigo-50 text-indigo-700 border-indigo-200', 'TEACHER_VERIFIED': 'bg-emerald-50 text-emerald-700 border-emerald-200', 'FLAGGED': 'bg-red-50 text-red-700 border-red-200' };
    return <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{status?.replace('_', ' ')}</span>;
}

export default SubmissionHistory;