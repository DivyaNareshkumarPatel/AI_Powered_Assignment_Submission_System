import React, { useState, useEffect, useMemo } from 'react';
import { fetchStudentHistory, fetchStudentSubmissionDetails } from '@/utils/api';
import { Loader2, CheckCircle, ShieldAlert, Video, MessageSquare, Bot, Eye, X, Award, Search, FileText } from 'lucide-react';
import PDFViewer from '@/components/common/PDFViewer';

export default function StudentResults() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [details, setDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [viewPdf, setViewPdf] = useState(null);

    useEffect(() => {
        const loadSubmissions = async () => {
            try {
                const data = await fetchStudentHistory(); 
                setSubmissions(data || []);
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        loadSubmissions();
    }, []);

    // Filter to only active semester
    const activeSubmissions = useMemo(() => submissions.filter(s => s.is_active_year === true), [submissions]);
    
    const availableSemesters = useMemo(() => [...new Set(activeSubmissions.map(s => s.semester_name))].filter(Boolean).sort(), [activeSubmissions]);
    const availableSubjects = useMemo(() => {
        let filtered = activeSubmissions;
        if (selectedSemester) filtered = filtered.filter(s => s.semester_name === selectedSemester);
        return [...new Set(filtered.map(s => s.subject_name))].filter(Boolean).sort();
    }, [activeSubmissions, selectedSemester]);

    useEffect(() => { setSelectedSubject(''); }, [selectedSemester]);

    const displayedSubmissions = useMemo(() => {
        return activeSubmissions.filter(s => {
            const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSem = !selectedSemester || s.semester_name === selectedSemester;
            const matchesSubj = !selectedSubject || s.subject_name === selectedSubject;
            return matchesSearch && matchesSem && matchesSubj;
        });
    }, [activeSubmissions, searchQuery, selectedSemester, selectedSubject]);

    const openReportModal = async (submission) => {
        setSelectedSubmission(submission);
        setDetails(null);
        setLoadingDetails(true);
        try {
            const data = await fetchStudentSubmissionDetails(submission.submission_id);
            setDetails(data);
        } catch (err) { console.error(err); } 
        finally { setLoadingDetails(false); }
    };

    if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Award size={28} className="text-blue-600" /> My Results
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Review grades and AI analysis for your current semester.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Search title..." className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all text-slate-800" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <select className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
                    <option value="">All Semesters</option>
                    {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={`w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none ${!selectedSemester && availableSemesters.length > 0 ? 'opacity-50 pointer-events-none' : ''}`} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedSemester && availableSemesters.length > 0}>
                    <option value="">All Subjects</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {displayedSubmissions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 pl-6">Assignment</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Grade</th>
                                    <th className="p-4 text-right pr-6">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayedSubmissions.map(s => (
                                    <tr key={s.submission_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-900 mb-1">{s.title || "Assignment"}</div>
                                            <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                                                <span>{s.subject_name} ({s.semester_name})</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                <span>{new Date(s.submitted_at).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center"><StatusBadge status={s.status} /></td>
                                        <td className="p-4 text-center">
                                            {s.final_score ? (
                                                <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{s.final_score}/100</span>
                                            ) : <span className="text-slate-300 font-bold">-</span>}
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <button onClick={() => openReportModal(s)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors shadow-sm">
                                                <FileText size={14} /> View Report
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-20 text-center flex flex-col items-center">
                        <CheckCircle size={40} className="text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">No results found for the current semester.</p>
                    </div>
                )}
            </div>

            {/* --- REPORT CARD MODAL --- */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                        
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{selectedSubmission.title || "Assignment Report"}</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">Submitted on {new Date(selectedSubmission.submitted_at).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setSelectedSubmission(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col justify-center items-center shadow-sm">
                                    <Award className="text-emerald-300 w-12 h-12 mb-2" />
                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Final Grade</span>
                                    <span className="text-5xl font-black text-emerald-700">{selectedSubmission.final_score || "-"}</span>
                                    <span className="text-sm font-medium text-emerald-600/70 mt-1">out of 100</span>
                                </div>
                                
                                <div className="md:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                            <MessageSquare size={18} className="text-slate-400" /> Teacher Remarks
                                        </h4>
                                        <p className="text-sm text-slate-600 font-medium italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            "{selectedSubmission.teacher_remarks || "Your teacher has not provided remarks yet."}"
                                        </p>
                                    </div>
                                    <button onClick={() => setViewPdf({ url: selectedSubmission.file_url, title: "My Submission" })} className="mt-4 w-full py-3 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 border border-blue-100">
                                        <Eye size={18} /> View My Submitted File
                                    </button>
                                </div>
                            </div>

                            {loadingDetails ? <div className="py-10 flex justify-center"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div> : details ? (
                                <div className="space-y-6 pt-4 border-t border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot className="text-indigo-600" size={24} />
                                        <h3 className="font-bold text-lg text-slate-900">AI & Security Analysis</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {details.vivaSession ? (
                                            <>
                                                <ScoreCard label="Integrity Score" value={details.vivaSession.integrity_score || 100} color={details.vivaSession.integrity_score > 70 ? "green" : "red"} icon={<ShieldAlert size={16}/>} />
                                                <ScoreCard label="Face Match" value={details.vivaSession.face_match_score || 100} color={details.vivaSession.face_match_score > 80 ? "green" : "orange"} icon={<CheckCircle size={16}/>} />
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Video size={14}/> Session Video</p>
                                                    {details.vivaSession.video_url ? (
                                                         <a href={details.vivaSession.video_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-bold flex items-center gap-1">
                                                            Watch Recording &rarr;
                                                         </a>
                                                    ) : <span className="text-sm font-medium text-slate-400">Not Available</span>}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="col-span-3 text-center py-6 text-slate-400 bg-white border border-dashed border-slate-300 rounded-xl text-sm font-medium">No Viva Session Data Found</div>
                                        )}
                                    </div>

                                    {details.vivaLogs && details.vivaLogs.length > 0 && (
                                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                                <MessageSquare size={16} className="text-slate-500" />
                                                <h4 className="font-bold text-slate-700 text-sm">Viva Question Log</h4>
                                            </div>
                                            <div className="p-5 space-y-6 max-h-96 overflow-y-auto">
                                                {details.vivaLogs.map((log, i) => {
                                                    let aiEval = log.ai_evaluation;
                                                    // Ensure JSON is parsed correctly for rendering
                                                    if (typeof aiEval === 'string') {
                                                        try { aiEval = JSON.parse(aiEval); } catch(e) {}
                                                    }
                                                    
                                                    return (
                                                    <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                                        <h5 className="font-bold text-slate-900 mb-3 text-sm leading-relaxed">
                                                            <span className="text-blue-600 mr-2">Q{i+1}.</span>{log.question_text}
                                                        </h5>
                                                        
                                                        <div className="mb-4 pl-6 border-l-2 border-slate-300">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">My Answer</span>
                                                            <p className="text-sm font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-sm italic">
                                                                "{log.student_answer_transcript || "No answer provided"}"
                                                            </p>
                                                        </div>
                                                        
                                                        {aiEval && (
                                                            <div className="pl-6 border-l-2 border-indigo-200">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1 flex items-center gap-1">
                                                                    <Bot size={12}/> AI Feedback
                                                                </span>
                                                                <p className="text-sm font-medium text-indigo-900 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 shadow-sm">
                                                                    {aiEval.feedback || "Verified by AI"}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )})}
                                            </div>
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
    const styles = { 'PENDING': 'bg-amber-50 text-amber-700 border-amber-200', 'AI_GRADED': 'bg-indigo-50 text-indigo-700 border-indigo-200', 'TEACHER_VERIFIED': 'bg-emerald-50 text-emerald-700 border-emerald-200', 'FLAGGED': 'bg-red-50 text-red-700 border-red-200' };
    return <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{status?.replace('_', ' ')}</span>;
}

function ScoreCard({ label, value, color, icon }) {
    const colors = { green: 'text-emerald-700 bg-emerald-50 border-emerald-100', orange: 'text-amber-700 bg-amber-50 border-amber-100', red: 'text-red-700 bg-red-50 border-red-100' };
    return (
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${colors[color] || 'bg-white border-slate-200 text-slate-700'}`}>
            <div className="flex items-center justify-center gap-1.5 opacity-80 mb-2">
                {icon}
                <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-4xl font-black text-center">{value}%</p>
        </div>
    );
}