import React, { useState, useEffect, useMemo } from 'react';
import { fetchTeacherAssignments, toggleAssignmentStatus, updateAssignment, deleteAssignment } from '@/utils/api';
import { Search, FolderOpen, BookOpen, Clock, Calendar, Hash, ChevronRight, Archive, ToggleLeft, ToggleRight, Edit, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ClassView = ({ onSelectAssignment }) => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState('CURRENT');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    // Modals State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedActionAssignment, setSelectedActionAssignment] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState({ title: '', description: '', deadline: '' });

    const loadAssignments = async () => {
        try {
            const data = await fetchTeacherAssignments();
            setAssignments(data || []);
        } catch (err) {
            console.error("Failed to load assignments", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAssignments(); }, []);

    const tabAssignments = useMemo(() => assignments.filter(a => activeTab === 'CURRENT' ? a.is_active_year : !a.is_active_year), [assignments, activeTab]);

    const availableSemesters = useMemo(() => [...new Set(tabAssignments.map(a => a.semester_name))].filter(Boolean).sort(), [tabAssignments]);
    const availableClasses = useMemo(() => {
        let filtered = tabAssignments;
        if (selectedSemester) filtered = filtered.filter(a => a.semester_name === selectedSemester);
        return [...new Set(filtered.map(a => a.class_name))].filter(Boolean).sort();
    }, [tabAssignments, selectedSemester]);
    const availableSubjects = useMemo(() => {
        let filtered = tabAssignments;
        if (selectedSemester) filtered = filtered.filter(a => a.semester_name === selectedSemester);
        if (selectedClass) filtered = filtered.filter(a => a.class_name === selectedClass);
        return [...new Set(filtered.map(a => a.subject_name))].filter(Boolean).sort();
    }, [tabAssignments, selectedSemester, selectedClass]);

    useEffect(() => { setSelectedSemester(''); setSelectedClass(''); setSelectedSubject(''); }, [activeTab]);
    useEffect(() => { setSelectedClass(''); setSelectedSubject(''); }, [selectedSemester]);
    useEffect(() => { setSelectedSubject(''); }, [selectedClass]);

    const displayedAssignments = useMemo(() => {
        return tabAssignments.filter(a => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query || a.title.toLowerCase().includes(query) || a.subject_name.toLowerCase().includes(query) || a.class_name.toLowerCase().includes(query);
            const matchesSem = !selectedSemester || a.semester_name === selectedSemester;
            const matchesClass = !selectedClass || a.class_name === selectedClass;
            const matchesSubj = !selectedSubject || a.subject_name === selectedSubject;
            return matchesSearch && matchesSem && matchesClass && matchesSubj;
        });
    }, [tabAssignments, searchQuery, selectedSemester, selectedClass, selectedSubject]);

    const handleToggleStatus = async (assignmentId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            setAssignments(prev => prev.map(a => a.assignment_id === assignmentId ? { ...a, is_accepting_submissions: newStatus } : a));
            await toggleAssignmentStatus(assignmentId, newStatus);
        } catch (err) {
            toast.error("Failed to change submission status.");
            setAssignments(prev => prev.map(a => a.assignment_id === assignmentId ? { ...a, is_accepting_submissions: currentStatus } : a));
        }
    };

    const openEditModal = (assignment) => {
        setSelectedActionAssignment(assignment);
        // Format date for datetime-local input (YYYY-MM-DDThh:mm)
        const formattedDate = new Date(assignment.deadline).toISOString().slice(0, 16);
        setEditForm({ title: assignment.title, description: assignment.description || '', deadline: formattedDate });
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await updateAssignment(selectedActionAssignment.assignment_id, editForm);
            setAssignments(prev => prev.map(a => a.assignment_id === selectedActionAssignment.assignment_id ? { ...a, ...editForm } : a));
            setEditModalOpen(false);
        } catch (err) {
            toast.error("Failed to update assignment.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setIsProcessing(true);
        try {
            await deleteAssignment(selectedActionAssignment.assignment_id);
            setAssignments(prev => prev.filter(a => a.assignment_id !== selectedActionAssignment.assignment_id));
            setDeleteModalOpen(false);
        } catch (err) {
            toast.error("Failed to delete assignment. It may have existing submissions.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto relative">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FolderOpen size={28} className="text-blue-600" /> Assignment Archive
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Manage and review student submissions</p>
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

            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Search by title, subject, or class..."
                        className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-800"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer appearance-none" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
                        <option value="">All Semesters</option>
                        {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className={`w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer appearance-none ${!selectedSemester && availableSemesters.length > 0 ? 'opacity-50 pointer-events-none' : ''}`} value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">All Classes</option>
                        {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className={`w-full p-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer appearance-none ${!selectedClass && availableClasses.length > 0 ? 'opacity-50 pointer-events-none' : ''}`} value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">All Subjects</option>
                        {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Assignments Grid */}
            {loading ? (
                <div className="p-20 text-center font-medium text-slate-400 flex flex-col items-center justify-center">
                   <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                   Loading assignments...
                </div>
            ) : displayedAssignments.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displayedAssignments.map((assignment) => (
                        <div key={assignment.assignment_id} className={`bg-white border ${assignment.is_accepting_submissions ? 'border-slate-200' : 'border-red-200'} rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group relative overflow-hidden`}>
                            
                            {!assignment.is_accepting_submissions && (
                                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                                    <div className="bg-red-500 text-white text-[9px] font-bold py-1 w-24 text-center absolute top-3 -right-6 rotate-45 shadow-sm z-10">CLOSED</div>
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-start mb-4 pr-10">
                                    <div className="flex flex-col gap-2">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full w-fit">
                                            {assignment.academic_year} • {assignment.semester_name}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                                            <Hash size={12} /> {assignment.subject_code}
                                        </span>
                                    </div>
                                    
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(assignment.assignment_id, assignment.is_accepting_submissions); }}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${assignment.is_accepting_submissions ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}>
                                        {assignment.is_accepting_submissions ? <><ToggleRight size={16} /> Accepting</> : <><ToggleLeft size={16} /> Locked</>}
                                    </button>
                                </div>
                                
                                <div className="flex justify-between items-start gap-4">
                                    <h3 className={`text-lg font-bold leading-tight mb-3 line-clamp-2 transition-colors ${assignment.is_accepting_submissions ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-600'}`}>
                                        {assignment.title}
                                    </h3>
                                    
                                    {/* Action Buttons (Edit/Delete) */}
                                    <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); openEditModal(assignment); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Details">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedActionAssignment(assignment); setDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Assignment">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-2.5 mb-6 text-sm">
                                    <p className="font-medium flex items-center gap-2 text-slate-600"><BookOpen size={16} className="text-slate-400" /> {assignment.subject_name}</p>
                                    <p className="font-medium flex items-center gap-2 text-slate-600"><Calendar size={16} className="text-slate-400" /> {assignment.class_name}</p>
                                    <p className={`font-semibold flex items-center gap-2 ${new Date(assignment.deadline) < new Date() ? 'text-red-500' : 'text-emerald-600'}`}>
                                        <Clock size={16} /> Due: {new Date(assignment.deadline).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            
                            <button onClick={() => {
                                    if (typeof onSelectAssignment === 'function') onSelectAssignment(assignment);
                                    else toast("Please open the 'Review Work' tab from the sidebar to view submissions.");
                                }}
                                className="w-full mt-6 py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                            >
                                View Submissions <ChevronRight size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-16 bg-white border border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center">
                    <FolderOpen size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">No Assignments Found</h3>
                    <p className="text-sm font-medium text-slate-400 mt-1">Adjust your search or filters.</p>
                </div>
            )}

            {/* EDIT MODAL */}
            {editModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Edit size={20} className="text-blue-600"/> Edit Assignment</h3>
                            <button onClick={() => setEditModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                                <input required type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description (Optional)</label>
                                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 resize-none h-24" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Deadline</label>
                                <input required type="datetime-local" value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" disabled={isProcessing} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    {isProcessing ? <Loader2 className="animate-spin" size={16} /> : null} Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 text-center p-6">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Assignment?</h3>
                        <p className="text-sm font-medium text-slate-500 mb-6">Are you sure you want to delete {selectedActionAssignment?.title}? This action cannot be undone.</p>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleDeleteConfirm} disabled={isProcessing} className="flex-1 py-3 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors flex items-center justify-center gap-2">
                                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassView;