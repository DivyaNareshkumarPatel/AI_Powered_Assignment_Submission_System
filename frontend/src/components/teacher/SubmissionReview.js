'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchTeacherAssignments, fetchSubmissions, updateSubmissionGrade, fetchSubmissionDetails, resetStudentSubmission } from '@/utils/api';
import { ChevronRight, Loader2, Eye, X, Save, Bot, ShieldAlert, Video, MessageSquare, CheckCircle, FolderOpen, Lock, Archive, Search, RotateCcw } from 'lucide-react';
import PDFViewer from '@/components/common/PDFViewer';
import toast from 'react-hot-toast';

export default function SubmissionReview() {
  const [allAssignments, setAllAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  const [activeTab, setActiveTab] = useState('CURRENT');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [viewPdf, setViewPdf] = useState(null);
  
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [vivaDetails, setVivaDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState('grading');

  const [editScore, setEditScore] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false); // 🔴 New state for reset loading

  useEffect(() => {
    const loadData = async () => {
      try {
        const asgData = await fetchTeacherAssignments();
        setAllAssignments(asgData || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadData();
  }, []);

  const tabAssignments = useMemo(() => allAssignments.filter(a => activeTab === 'CURRENT' ? a.is_active_year : !a.is_active_year), [allAssignments, activeTab]);
  const availableSemesters = useMemo(() => [...new Set(tabAssignments.map(a => a.semester_name))].filter(Boolean).sort(), [tabAssignments]);
  const availableClasses = useMemo(() => {
      let filtered = tabAssignments;
      if (selectedSemester) filtered = filtered.filter(a => a.semester_name === selectedSemester);
      const map = new Map();
      filtered.forEach(a => { if (!map.has(a.class_id)) map.set(a.class_id, { id: a.class_id, name: a.class_name }); });
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tabAssignments, selectedSemester]);
  const availableSubjects = useMemo(() => {
      if (!selectedClassId) return [];
      let filtered = tabAssignments.filter(a => a.class_id === selectedClassId);
      if (selectedSemester) filtered = filtered.filter(a => a.semester_name === selectedSemester);
      const map = new Map();
      filtered.forEach(a => { if (!map.has(a.subject_id)) map.set(a.subject_id, { id: a.subject_id, name: a.subject_name }); });
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tabAssignments, selectedSemester, selectedClassId]);
  const availableAssignments = useMemo(() => {
      if (!selectedClassId || !selectedSubjectId) return [];
      let filtered = tabAssignments.filter(a => a.class_id === selectedClassId && a.subject_id === selectedSubjectId);
      if (selectedSemester) filtered = filtered.filter(a => a.semester_name === selectedSemester);
      return filtered;
  }, [tabAssignments, selectedSemester, selectedClassId, selectedSubjectId]);

  useEffect(() => { setSelectedSemester(''); setSelectedClassId(''); setSelectedSubjectId(''); setSelectedAssignmentId(''); setSubmissions([]); }, [activeTab]);
  useEffect(() => { setSelectedClassId(''); setSelectedSubjectId(''); setSelectedAssignmentId(''); setSubmissions([]); }, [selectedSemester]);
  useEffect(() => { setSelectedSubjectId(''); setSelectedAssignmentId(''); setSubmissions([]); }, [selectedClassId]);
  useEffect(() => { setSelectedAssignmentId(''); setSubmissions([]); setSearchQuery(''); }, [selectedSubjectId]);

  const handleAssignmentChange = async (e) => {
    const asgId = e.target.value;
    setSelectedAssignmentId(asgId);
    setSearchQuery('');
    if (asgId) {
      setLoadingSubmissions(true);
      try {
        const data = await fetchSubmissions(asgId);
        setSubmissions(data);
      } catch (err) { console.error(err); } finally { setLoadingSubmissions(false); }
    } else { setSubmissions([]); }
  };

  const displayedSubmissions = useMemo(() => {
      if (!searchQuery) return submissions;
      const lowerQuery = searchQuery.toLowerCase();
      return submissions.filter(s => 
          (s.student_name && s.student_name.toLowerCase().includes(lowerQuery)) ||
          (s.enrollment_number && s.enrollment_number.toLowerCase().includes(lowerQuery))
      );
  }, [submissions, searchQuery]);

  const openReviewModal = async (submission) => {
      setSelectedSubmission(submission);
      setEditScore(submission.final_score || '');
      setEditRemarks(submission.teacher_remarks || '');
      setVivaDetails(null);
      setModalTab('grading');
      setLoadingDetails(true);
      try {
          const details = await fetchSubmissionDetails(submission.submission_id);
          setVivaDetails(details);
      } catch (err) { console.error("Failed to load details", err); } finally { setLoadingDetails(false); }
  };

  const handleSaveGrade = async () => {
      if (!selectedSubmission || activeTab === 'PAST') return;
      setSaving(true);
      try {
          await updateSubmissionGrade(selectedSubmission.submission_id, editScore, editRemarks);
          setSubmissions(prev => prev.map(s => s.submission_id === selectedSubmission.submission_id ? { ...s, final_score: editScore, teacher_remarks: editRemarks, status: 'TEACHER_VERIFIED' } : s));
          setSelectedSubmission(null);
      } catch (err) { toast.error("Failed to save grade."); } finally { setSaving(false); }
  };

  // 🔴 NEW: Handle Reset Submission
  const handleResetSubmission = async () => {
      if (!window.confirm(`Are you sure you want to request a re-upload from ${selectedSubmission.student_name}?\n\nThis will permanently erase their current PDF and Viva score, and send the assignment back to their pending list.`)) return;
      
      setResetting(true);
      try {
          await resetStudentSubmission(selectedSubmission.submission_id);
          // Remove the submission from the local state list immediately
          setSubmissions(prev => prev.filter(s => s.submission_id !== selectedSubmission.submission_id));
          setSelectedSubmission(null); // Close the modal
      } catch (err) {
          toast.error("Failed to reset the submission.");
          console.error(err);
      } finally {
          setResetting(false);
      }
  };

  const isReadOnly = activeTab === 'PAST';

  if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <>
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle size={28} className="text-blue-600" /> Submission Review
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Grade and verify student assignments</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button onClick={() => setActiveTab('CURRENT')} className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'CURRENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        Active Year
                    </button>
                    <button onClick={() => setActiveTab('PAST')} className={`px-5 py-2 text-sm font-semibold rounded-md transition-all flex items-center gap-2 ${activeTab === 'PAST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Archive size={16}/> Past Years
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <select className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                    <option value="">Select Semester</option>
                    {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={`w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer ${!selectedSemester && availableSemesters.length > 0 ? 'opacity-50' : ''}`} value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} disabled={!selectedSemester && availableSemesters.length > 0}>
                    <option value="">Select Class</option>
                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className={`w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 transition-colors cursor-pointer ${!selectedClassId ? 'opacity-50' : ''}`} value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} disabled={!selectedClassId}>
                    <option value="">Select Subject</option>
                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className={`w-full p-3 border border-blue-200 rounded-xl text-sm font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 outline-none focus:border-blue-600 transition-colors cursor-pointer ${!selectedSubjectId ? 'opacity-50 border-slate-200 bg-slate-50 text-slate-700' : ''}`} value={selectedAssignmentId} onChange={handleAssignmentChange} disabled={!selectedSubjectId}>
                    <option value="">Select Assignment</option>
                    {availableAssignments.map(a => <option key={a.assignment_id} value={a.assignment_id}>{a.title}</option>)}
                </select>
            </div>

            {/* Table Area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {submissions.length > 0 && (
                    <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" placeholder="Search by student name or enrollment number..." 
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-white"
                            />
                        </div>
                    </div>
                )}

                {loadingSubmissions ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
                ) : submissions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="p-4 pl-6">Student</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Score</th>
                                <th className="p-4 text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedSubmissions.length > 0 ? (
                                displayedSubmissions.map((s) => (
                                <tr key={s.submission_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="font-bold text-slate-900">{s.student_name}</div>
                                        <div className="text-xs font-medium text-slate-500 mt-0.5">{s.enrollment_number}</div>
                                    </td>
                                    <td className="p-4 text-center"><StatusBadge status={s.status} /></td>
                                    <td className="p-4 text-center">
                                        <span className={`text-lg font-bold ${s.final_score ? 'text-slate-900' : 'text-slate-300'}`}>{s.final_score ? `${s.final_score}%` : '-'}</span>
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <button onClick={() => openReviewModal(s)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors shadow-sm">
                                            {isReadOnly ? <Eye size={14}/> : 'Review'} <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="py-10 text-center text-slate-500 font-medium">No students matched your search <strong>{searchQuery}</strong></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                ) : (
                    <div className="py-20 text-center flex flex-col items-center">
                        <FolderOpen size={40} className="text-slate-200 mb-3" />
                        <p className="text-slate-500 font-medium">{selectedAssignmentId ? 'No submissions yet.' : 'Select an assignment above to begin.'}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Modal Overlay */}
        {selectedSubmission && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                {selectedSubmission.student_name}
                                {isReadOnly && <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Lock size={12}/> READ ONLY</span>}
                            </h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">{selectedSubmission.enrollment_number}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="bg-slate-100 p-1 rounded-lg flex mr-2">
                                <button onClick={() => setModalTab('grading')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${modalTab === 'grading' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Grading</button>
                                <button onClick={() => setModalTab('report')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${modalTab === 'report' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>AI Report</button>
                            </div>
                            <button onClick={() => setSelectedSubmission(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                        {modalTab === 'grading' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Final Grade</label>
                                        <div className="flex items-end gap-2">
                                            <input type="number" value={editScore} onChange={(e) => setEditScore(e.target.value)} disabled={isReadOnly}
                                                className={`w-24 text-4xl font-bold text-slate-900 bg-transparent border-b-2 border-slate-200 outline-none pb-1 transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'focus:border-blue-600'}`} />
                                            <span className="text-xl font-bold text-slate-400 pb-2">%</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setViewPdf({ url: selectedSubmission.file_url, title: `Submission: ${selectedSubmission.student_name}` })} 
                                        className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-semibold py-4 rounded-xl border border-blue-200 transition-colors shadow-sm">
                                        <Eye size={18} /> View Student PDF
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher Remarks</label>
                                    <textarea className={`w-full p-4 border border-slate-200 rounded-xl outline-none h-48 resize-none text-sm font-medium transition-all ${isReadOnly ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 shadow-sm'}`}
                                        placeholder="Enter feedback for the student..." value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} disabled={isReadOnly} />
                                </div>
                            </div>
                        )}

                        {modalTab === 'report' && (
                            loadingDetails ? <div className="py-20 flex justify-center"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div> :
                            vivaDetails?.vivaSession ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <ScoreCard label="Integrity Score" value={vivaDetails.vivaSession.integrity_score || 100} color={vivaDetails.vivaSession.integrity_score > 70 ? "green" : "red"} icon={<ShieldAlert size={16} />} />
                                        <ScoreCard label="Face Match" value={vivaDetails.vivaSession.face_match_score || 100} color={vivaDetails.vivaSession.face_match_score > 80 ? "green" : "orange"} icon={<CheckCircle size={16} />} />
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                            <div className="flex items-center gap-2 text-slate-500 mb-2"><Video size={16} /><span className="text-xs font-semibold uppercase tracking-wider">Session Video</span></div>
                                            {vivaDetails.vivaSession.video_url ? <a href={vivaDetails.vivaSession.video_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 font-bold text-sm">Watch Recording &rarr;</a> : <span className="text-slate-400 font-medium text-sm">Not Available</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                            <MessageSquare size={16} className="text-slate-500" />
                                            <h4 className="font-bold text-slate-700 text-sm">Viva Question Log</h4>
                                        </div>
                                        <div className="p-5 space-y-6 max-h-96 overflow-y-auto">
                                            {vivaDetails.vivaLogs && vivaDetails.vivaLogs.length > 0 ? vivaDetails.vivaLogs.map((log, i) => {
                                                let aiEval = log.ai_evaluation;
                                                if (typeof aiEval === 'string') {
                                                    try { aiEval = JSON.parse(aiEval); } catch(e) {}
                                                }

                                                const score = aiEval?.score || 0;
                                                const maxMarks = aiEval?.max_marks || 10;
                                                const questionPercentage = Math.round((score / maxMarks) * 100);

                                                return (
                                                <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 relative">
                                                    
                                                    <div className="absolute top-5 right-5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm flex flex-col items-center min-w-[60px]">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Score</span>
                                                        <span className="text-sm font-black text-blue-600">{questionPercentage}%</span>
                                                    </div>

                                                    <h5 className="font-bold text-slate-900 mb-3 text-sm leading-relaxed pr-16">
                                                        <span className="text-blue-600 mr-2">Q{i+1}.</span>{log.question_text}
                                                    </h5>
                                                    
                                                    <div className="mb-4 pl-6 border-l-2 border-slate-300">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Student's Answer</span>
                                                        <p className="text-sm font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-sm italic">
                                                            {log.student_answer_transcript || "No answer provided"}
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
                                            )}) : <p className="text-slate-400 font-medium text-sm text-center">No logs found.</p>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl">
                                    <ShieldAlert className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                                    <p className="text-slate-500 font-medium">No Viva or AI Report data found.</p>
                                </div>
                            )
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center gap-3">
                        
                        {/* 🔴 NEW: Reset Button on the left side of the footer */}
                        <div>
                            {!isReadOnly && modalTab === 'grading' && (
                                <button onClick={handleResetSubmission} disabled={resetting} className="px-5 py-2.5 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-200 shadow-sm text-sm">
                                    {resetting ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />} Request Re-upload
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setSelectedSubmission(null)} className="px-6 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors text-sm">Close</button>
                            {!isReadOnly && modalTab === 'grading' && (
                                <button onClick={handleSaveGrade} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm text-sm">
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Grade
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        )}
        <PDFViewer isOpen={!!viewPdf} onClose={() => setViewPdf(null)} fileUrl={viewPdf?.url} title={viewPdf?.title} />
    </>
  );
}

function ScoreCard({ label, value, color, icon }) {
    const styles = { green: 'bg-emerald-50 border-emerald-100 text-emerald-800', orange: 'bg-amber-50 border-amber-100 text-amber-800', red: 'bg-red-50 border-red-100 text-red-800' };
    return (
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between ${styles[color] || 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2 opacity-80">{icon}<span className="text-xs font-bold uppercase tracking-wider">{label}</span></div>
            <p className="text-3xl font-black">{value}%</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const styles = { 'PENDING': 'bg-slate-100 text-slate-600', 'AI_GRADED': 'bg-indigo-50 text-indigo-700', 'TEACHER_VERIFIED': 'bg-emerald-50 text-emerald-700' };
    return <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border border-white/20 shadow-sm ${styles[status] || styles['PENDING']}`}>{status?.replace('_', ' ')}</span>;
}