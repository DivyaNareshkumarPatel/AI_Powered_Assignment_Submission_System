import React, { useState, useEffect, useMemo } from 'react';
import { 
    getAllocations, getInstitutes, getDepartments, getYears, 
    getSemesters, getClasses, updateAllocation, deleteAllocation,
    getTeachers, getSubjects 
} from '@/utils/api';
import { 
    BookOpen, Building, Briefcase, Calendar, Layers, 
    RefreshCw, Search, GraduationCap, Edit2, Trash2, X, AlertTriangle, Hash 
} from 'lucide-react';

const AllocationList = ({ onSuccess, onError }) => {
    // ==========================================
    // 1. DATA & MASTER STATES
    // ==========================================
    const [institutes, setInstitutes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [classes, setClasses] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);
    
    // ==========================================
    // 2. FILTER & SEARCH STATES
    // ==========================================
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // ==========================================
    // 3. EDIT & DELETE MODAL STATES
    // ==========================================
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ 
        allocation_id: '', teacher_id: '', subject_id: '', class_id: '', academic_year_id: '' 
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allocationToDelete, setAllocationToDelete] = useState(null);

    // ==========================================
    // 4. FETCH DATA ON MOUNT
    // ==========================================
    const fetchMasterData = async () => {
        setLoading(true);
        try {
            const [instRes, deptRes, yearRes, semRes, classRes, allocRes, techRes, subRes] = await Promise.all([
                getInstitutes(), getDepartments(), getYears(), 
                getSemesters(), getClasses(), getAllocations(),
                getTeachers(), getSubjects()
            ]);
            setInstitutes(instRes || []);
            setDepartments(deptRes || []);
            setAcademicYears(yearRes || []);
            setSemesters(semRes || []);
            setClasses(classRes || []);
            setAllocations(allocRes || []);
            setAllTeachers(techRes || []);
            setAllSubjects(subRes || []);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMasterData(); }, []);

    // ==========================================
    // 5. CASCADING NAVIGATIONAL LOGIC
    // ==========================================
    const filteredDepartments = useMemo(() => {
        return departments.filter(d => d.institute_id === selectedInstitute);
    }, [departments, selectedInstitute]);

    const filteredYears = useMemo(() => {
        return academicYears.filter(y => y.department_id === selectedDepartment);
    }, [academicYears, selectedDepartment]);

    const filteredSemesters = useMemo(() => {
        return semesters.filter(s => s.academic_year_id === selectedYear);
    }, [semesters, selectedYear]);

    const filteredClasses = useMemo(() => {
        return classes.filter(c => c.semester_id === selectedSemester);
    }, [classes, selectedSemester]);

    // Reset downstream selections
    useEffect(() => { setSelectedDepartment(''); }, [selectedInstitute]);
    useEffect(() => { setSelectedYear(''); }, [selectedDepartment]);
    useEffect(() => { setSelectedSemester(''); }, [selectedYear]);
    useEffect(() => { setSelectedClass(''); }, [selectedSemester]);

    // ==========================================
    // 6. LOCAL FILTERING & SEARCH
    // ==========================================
    const displayedAllocations = useMemo(() => {
        let filtered = allocations;

        // A. Search Query (Teacher, Enrollment, Subject)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(a => 
                (a.teacher_name?.toLowerCase().includes(q)) || 
                (a.teacher_enrollment?.toLowerCase().includes(q)) ||
                (a.subject_name?.toLowerCase().includes(q)) ||
                (a.subject_code?.toLowerCase().includes(q))
            );
        }

        // B. Cascade Filters
        if (selectedClass) filtered = filtered.filter(a => a.class_id === selectedClass);
        else if (selectedSemester) filtered = filtered.filter(a => a.semester_id === selectedSemester);
        else if (selectedYear) filtered = filtered.filter(a => a.academic_year_id === selectedYear);
        else if (selectedDepartment) filtered = filtered.filter(a => a.department_id === selectedDepartment);
        else if (selectedInstitute) filtered = filtered.filter(a => a.institute_id === selectedInstitute);

        return filtered;
    }, [allocations, searchQuery, selectedInstitute, selectedDepartment, selectedYear, selectedSemester, selectedClass]);

    // ==========================================
    // 7. ACTION HANDLERS
    // ==========================================
    const handleEditOpen = (a) => {
        setEditForm({
            allocation_id: a.allocation_id,
            teacher_id: a.teacher_id,
            subject_id: a.subject_id,
            class_id: a.class_id,
            academic_year_id: a.academic_year_id || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateAllocation(editForm.allocation_id, editForm);
            onSuccess("ALLOCATION UPDATED");
            setIsEditModalOpen(false);
            fetchMasterData();
        } catch (err) {
            onError(err.response?.data?.error || "UPDATE FAILED");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteAllocation(allocationToDelete.allocation_id);
            onSuccess("ALLOCATION REMOVED");
            setAllocationToDelete(null);
            fetchMasterData();
        } catch (err) {
            onError("DELETE FAILED");
        }
    };

    return (
        <div className="space-y-6">
            {/* HEADER & SEARCH */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-black pb-4">
                <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                    <BookOpen className="w-8 h-8" /> Teacher Allocations
                </h2>
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search teacher, ID or subject..."
                        className="w-full pl-10 pr-4 py-2 border-2 border-black font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button onClick={fetchMasterData} className="p-2 hover:bg-gray-100 rounded-full">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* CASCADING FILTER BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-gray-100 p-4 border-2 border-black">
                {/* INSTITUTE */}
                <div>
                    <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Building size={12}/> Institute</label>
                    <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedInstitute} onChange={(e) => setSelectedInstitute(e.target.value)}>
                        <option value="">-- ALL INSTITUTES --</option>
                        {institutes.map(i => <option key={i.institute_id} value={i.institute_id}>{i.name}</option>)}
                    </select>
                </div>

                {/* DEPARTMENT */}
                <div className={!selectedInstitute ? 'opacity-50' : ''}>
                    <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Briefcase size={12}/> Dept</label>
                    <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} disabled={!selectedInstitute}>
                        <option value="">-- ALL DEPTS --</option>
                        {filteredDepartments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                    </select>
                </div>

                {/* ACADEMIC YEAR */}
                <div className={!selectedDepartment ? 'opacity-50' : ''}>
                    <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Year</label>
                    <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} disabled={!selectedDepartment}>
                        <option value="">-- ALL YEARS --</option>
                        {filteredYears.map(y => <option key={y.academic_year_id} value={y.academic_year_id}>{y.name}</option>)}
                    </select>
                </div>

                {/* SEMESTER */}
                <div className={!selectedYear ? 'opacity-50' : ''}>
                    <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><GraduationCap size={12}/> Sem</label>
                    <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} disabled={!selectedYear}>
                        <option value="">-- ALL SEMS --</option>
                        {filteredSemesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.name}</option>)}
                    </select>
                </div>

                {/* CLASS */}
                <div className={!selectedSemester ? 'opacity-50' : ''}>
                    <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Layers size={12}/> Class</label>
                    <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedSemester}>
                        <option value="">-- ALL CLASSES --</option>
                        {filteredClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="border-2 border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black text-white text-[10px] uppercase">
                        <tr>
                            <th className="p-4 border-r border-white/10">Teacher Details</th>
                            <th className="p-4 border-r border-white/10">Subject / Class</th>
                            <th className="p-4 border-r border-white/10">Academic Year</th>
                            <th className="p-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium divide-y-2 divide-black">
                        {displayedAllocations.map((a) => (
                            <tr key={a.allocation_id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-base">{a.teacher_name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                        <Hash size={10}/> {a.teacher_enrollment}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-blue-700">{a.subject_name}</div>
                                    <div className="text-[10px] uppercase font-black text-gray-400">Class: {a.class_name}</div>
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 bg-gray-200 border border-black text-[10px] font-black uppercase">
                                        {a.academic_year || 'N/A'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleEditOpen(a)} className="p-2 border-2 border-black hover:bg-yellow-400 transition-all active:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none">
                                            <Edit2 size={16}/>
                                        </button>
                                        <button onClick={() => setAllocationToDelete(a)} className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-all active:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {displayedAllocations.length === 0 && (
                    <div className="p-12 text-center font-black text-gray-400 uppercase tracking-widest bg-gray-50">
                        No allocations found
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4 font-black uppercase">
                            <h2 className="text-xl flex items-center gap-2"><Edit2/> Edit Allocation</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="hover:rotate-90 transition-transform"><X/></button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            {/* Teacher Select */}
                            <div>
                                <label className="text-[10px] font-bold uppercase">Teacher</label>
                                <select className="w-full p-2 border-2 border-black font-bold bg-gray-50 cursor-not-allowed" value={editForm.teacher_id} disabled>
                                    {allTeachers.map(t => <option key={t.user_id} value={t.user_id}>{t.name} ({t.enrollment_number})</option>)}
                                </select>
                                <p className="text-[9px] text-gray-400 mt-1">* Teacher cannot be changed once allocated. Re-allocate if needed.</p>
                            </div>
                            
                            {/* Subject Select */}
                            <div>
                                <label className="text-[10px] font-bold uppercase">Subject</label>
                                <select className="w-full p-2 border-2 border-black font-bold" value={editForm.subject_id} onChange={e => setEditForm({...editForm, subject_id: e.target.value})} required>
                                    {allSubjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.code})</option>)}
                                </select>
                            </div>

                            {/* Class Select */}
                            <div>
                                <label className="text-[10px] font-bold uppercase">Target Class</label>
                                <select className="w-full p-2 border-2 border-black font-bold" value={editForm.class_id} onChange={e => setEditForm({...editForm, class_id: e.target.value})} required>
                                    {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 border-2 border-black font-black uppercase hover:bg-gray-100 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-black text-white font-black uppercase hover:bg-gray-800 disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Update Allocation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION */}
            {allocationToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-white border-4 border-black p-8 max-w-md w-full shadow-[12px_12px_0px_0px_rgba(255,0,0,0.4)]">
                        <div className="flex items-center gap-4 text-red-600 mb-6">
                            <AlertTriangle size={48} strokeWidth={3}/>
                            <h3 className="text-2xl font-black uppercase text-black leading-tight">Revoke Allocation?</h3>
                        </div>
                        <p className="text-sm font-bold mb-8">
                            This will remove <span className="underline decoration-red-500 decoration-2">{allocationToDelete.subject_name}</span> from 
                            <span className="font-black"> {allocationToDelete.teacher_name}'s</span> workload. This action is permanent.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setAllocationToDelete(null)} className="flex-1 py-3 border-2 border-black font-black hover:bg-gray-100 uppercase">Keep it</button>
                            <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white border-2 border-black font-black hover:bg-red-700 uppercase">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllocationList;