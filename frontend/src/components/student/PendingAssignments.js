import React, { useState, useEffect, useMemo } from 'react';
import { fetchPendingAssignments } from '@/utils/api';
import { BookOpen, Clock, Upload, Search, Calendar, Hash, Eye, CheckCircle } from 'lucide-react';
import PDFViewer from '@/components/common/PDFViewer';

const PendingAssignments = ({ onUploadClick }) => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    
    // State to control the PDF Viewer modal
    const [viewPdf, setViewPdf] = useState(null);

    useEffect(() => {
        const loadAssignments = async () => {
            try {
                const data = await fetchPendingAssignments();
                setAssignments(data || []);
            } catch (err) {
                console.error("Failed to fetch assignments", err);
            } finally {
                setLoading(false);
            }
        };
        loadAssignments();
    }, []);

    const availableSubjects = useMemo(() => {
        return [...new Set(assignments.map(a => a.subject_name))].sort();
    }, [assignments]);

    const displayedAssignments = useMemo(() => {
        return assignments.filter(a => {
            const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  a.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSubject = !selectedSubject || a.subject_name === selectedSubject;
            return matchesSearch && matchesSubject;
        });
    }, [assignments, searchQuery, selectedSubject]);

    if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen size={28} className="text-blue-600" /> Pending Tasks
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Assignments waiting for your submission</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Search by title or subject..."
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-800"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <select className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer appearance-none" 
                    value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                    <option value="">All Subjects</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Grid */}
            {displayedAssignments.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displayedAssignments.map((assignment) => (
                        <div key={assignment.assignment_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                                        Pending
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                        <Hash size={12} /> {assignment.subject_code}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {assignment.title}
                                </h3>
                                {/* Show Description if available */}
                                {assignment.description && (
                                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{assignment.description}</p>
                                )}
                                
                                <div className="space-y-2.5 mb-6 text-sm">
                                    <p className="font-medium flex items-center gap-2 text-slate-600"><BookOpen size={16} className="text-slate-400" /> {assignment.subject_name}</p>
                                    <p className="font-medium flex items-center gap-2 text-slate-600"><Calendar size={16} className="text-slate-400" /> {assignment.teacher_name}</p>
                                    <p className={`font-semibold flex items-center gap-2 ${new Date(assignment.deadline) < new Date() ? 'text-red-500' : 'text-blue-600'}`}>
                                        <Clock size={16} /> Due: {new Date(assignment.deadline).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Action Buttons (View Question & Submit) */}
                            <div className="flex gap-3 mt-auto">
                                <button 
                                    onClick={() => setViewPdf({ url: assignment.question_file_url, title: assignment.title })} 
                                    className="flex-1 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 hover:text-slate-900 transition-all"
                                >
                                    <Eye size={18} /> View Question
                                </button>
                                <button 
                                    onClick={() => onUploadClick(assignment)} 
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm transition-all"
                                >
                                    <Upload size={18} /> Submit Work
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-16 bg-white border border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center">
                    <CheckCircle size={48} className="text-emerald-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">All Caught Up!</h3>
                    <p className="text-sm font-medium text-slate-400 mt-1">You have no pending assignments right now.</p>
                </div>
            )}

            {/* PDF Viewer Modal */}
            <PDFViewer isOpen={!!viewPdf} onClose={() => setViewPdf(null)} fileUrl={viewPdf?.url} title={viewPdf?.title} />
        </div>
    );
};

export default PendingAssignments;