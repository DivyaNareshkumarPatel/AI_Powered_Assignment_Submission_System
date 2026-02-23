import React, { useState, useEffect, useMemo } from 'react';
import { fetchTeacherAllocations, createAssignment } from '@/utils/api';
import { Upload, FileText, Calendar, BookOpen, Layers, CheckCircle, AlertTriangle, CloudUpload } from 'lucide-react';

const UploadAssignment = ({ onSuccess }) => {
    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    
    const [questionFile, setQuestionFile] = useState(null);
    const [solutionFile, setSolutionFile] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        const loadAllocations = async () => {
            try {
                const data = await fetchTeacherAllocations();
                setAllocations(data || []);
            } catch (err) { setError("Failed to load your assigned classes."); } 
            finally { setLoading(false); }
        };
        loadAllocations();
    }, []);

    const activeAllocations = useMemo(() => allocations.filter(a => a.is_active === true), [allocations]);
    const availableSemesters = useMemo(() => Array.from(new Set(activeAllocations.map(a => a.semester_name).filter(Boolean))).sort(), [activeAllocations]);
    const availableClasses = useMemo(() => {
        if (!selectedSemester) return [];
        const uniqueClasses = new Map();
        activeAllocations.filter(a => a.semester_name === selectedSemester).forEach(a => uniqueClasses.set(a.class_id, { id: a.class_id, name: a.class_name }));
        return Array.from(uniqueClasses.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [activeAllocations, selectedSemester]);
    const availableSubjects = useMemo(() => {
        if (!selectedSemester || !selectedClassId) return [];
        const uniqueSubjects = new Map();
        activeAllocations.filter(a => a.semester_name === selectedSemester && a.class_id === selectedClassId).forEach(a => uniqueSubjects.set(a.subject_id, { id: a.subject_id, name: a.subject_name, code: a.subject_code }));
        return Array.from(uniqueSubjects.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [activeAllocations, selectedSemester, selectedClassId]);

    useEffect(() => { setSelectedClassId(''); setSelectedSubjectId(''); }, [selectedSemester]);
    useEffect(() => { setSelectedSubjectId(''); }, [selectedClassId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        
        if (!selectedSemester || !selectedClassId || !selectedSubjectId) return setError("Please complete the Academic Target selection.");
        if (!questionFile || !solutionFile) return setError("Both Question and Solution PDFs are required.");

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('deadline', deadline);
            formData.append('class_id', selectedClassId);
            formData.append('subject_id', selectedSubjectId);
            formData.append('question_file', questionFile);
            formData.append('solution_file', solutionFile);

            await createAssignment(formData);
            
            setSuccessMessage("Assignment successfully deployed!");
            setTitle(''); setDescription(''); setDeadline(''); setSelectedSemester(''); setQuestionFile(null); setSolutionFile(null);
            if (onSuccess) onSuccess("Assignment Created Successfully!");
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err) { setError(err.response?.data?.error || "Failed to create assignment."); } 
        finally { setIsSubmitting(false); }
    };

    if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CloudUpload size={28} className="text-blue-600" /> Deploy Assignment
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Upload a new assignment for your active classes.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {error && <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm font-medium"><AlertTriangle size={18} /> {error}</div>}
                {successMessage && <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3 text-sm font-medium"><CheckCircle size={18} /> {successMessage}</div>}

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                    
                    {/* Academic Target Selection */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2"><Layers size={16} className="text-slate-400"/> 1. Target Audience</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Semester</label>
                                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} required>
                                    <option value="">Select Semester</option>
                                    {availableSemesters.map(sem => <option key={sem} value={sem}>{sem}</option>)}
                                </select>
                            </div>
                            <div className={!selectedSemester ? 'opacity-50 pointer-events-none' : ''}>
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Class</label>
                                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required disabled={!selectedSemester}>
                                    <option value="">Select Class</option>
                                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className={!selectedClassId ? 'opacity-50 pointer-events-none' : ''}>
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Subject</label>
                                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} required disabled={!selectedClassId}>
                                    <option value="">Select Subject</option>
                                    {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Assignment Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mt-4"><FileText size={16} className="text-slate-400"/> 2. Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Assignment Title</label>
                                <input type="text" className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" placeholder="e.g. Unit 1: OOP Concepts" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-2">Instructions (Optional)</label>
                                <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all min-h-[100px] resize-y" placeholder="Add specific instructions for the students..." value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><Calendar size={14}/> Submission Deadline</label>
                                <input type="datetime-local" className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" value={deadline} onChange={e => setDeadline(e.target.value)} required />
                            </div>
                        </div>
                    </div>

                    {/* File Uploads */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mt-4"><Upload size={16} className="text-slate-400"/> 3. Files</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer relative">
                                <label className="cursor-pointer block w-full h-full absolute inset-0 opacity-0">
                                    <input type="file" accept="application/pdf" onChange={e => setQuestionFile(e.target.files[0])} required />
                                </label>
                                <BookOpen size={28} className="mx-auto mb-3 text-blue-500" />
                                <span className="block text-sm font-bold text-slate-700 mb-1">Student Question PDF</span>
                                <span className="text-xs font-medium text-slate-400">{questionFile ? <span className="text-blue-600">{questionFile.name}</span> : 'Click to browse (Visible to Students)'}</span>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer relative">
                                <label className="cursor-pointer block w-full h-full absolute inset-0 opacity-0">
                                    <input type="file" accept="application/pdf" onChange={e => setSolutionFile(e.target.files[0])} required />
                                </label>
                                <CheckCircle size={28} className="mx-auto mb-3 text-emerald-500" />
                                <span className="block text-sm font-bold text-slate-700 mb-1">Teacher Solution PDF</span>
                                <span className="text-xs font-medium text-slate-400">{solutionFile ? <span className="text-emerald-600">{solutionFile.name}</span> : 'Click to browse (Used by AI only)'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-70 shadow-sm">
                            {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CloudUpload size={20} />}
                            {isSubmitting ? 'Processing & Deploying...' : 'Deploy Assignment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadAssignment;