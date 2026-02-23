import React, { useState, useEffect, useMemo } from 'react';
import { fetchTeacherAssignments } from '@/utils/api';
import { Search, FolderOpen, BookOpen, Clock, Calendar, Hash, ChevronRight, Layers, Archive } from 'lucide-react';

const ClassView = ({ onSelectAssignment }) => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState('CURRENT');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const data = await fetchTeacherAssignments();
                setAssignments(data || []);
            } catch (err) {
                console.error("Failed to load assignments", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssignments();
    }, []);

    const tabAssignments = useMemo(() => {
        return assignments.filter(a => activeTab === 'CURRENT' ? a.is_active_year : !a.is_active_year);
    }, [assignments, activeTab]);

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

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
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
                        <div key={assignment.assignment_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                                        {assignment.academic_year} • {assignment.semester_name}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                        <Hash size={12} /> {assignment.subject_code}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {assignment.title}
                                </h3>
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
                                    else alert("Please open the 'Review Work' tab from the sidebar to view submissions.");
                                }}
                                className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
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
        </div>
    );
};

export default ClassView;