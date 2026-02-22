import React, { useState, useEffect, useMemo } from 'react';
import { 
    getStudents, updateStudent, deleteStudent,
    getInstitutes, getDepartments, getYears, getSemesters, getClasses 
} from '@/utils/api';
import { 
    GraduationCap, Search, Edit2, Trash2, X, AlertTriangle, 
    RefreshCw, Filter, Mail, Hash, Building, Layers 
} from 'lucide-react';

const StudentList = ({ onSuccess, onError }) => {
  // ==========================================
  // 1. DATA STATES
  // ==========================================
  const [students, setStudents] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // 2. FILTER & SEARCH STATES
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstitute, setSelectedInstitute] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ==========================================
  // 3. MODAL STATES
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ 
      id: '', name: '', email: '', enrollment_number: '', 
      institute_id: '', semester_id: '', class_id: '', account_status: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // ==========================================
  // 4. DATA FETCHING
  // ==========================================
  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [stuRes, instRes, deptRes, yearRes, semRes, classRes] = await Promise.all([
        getStudents(), getInstitutes(), getDepartments(), 
        getYears(), getSemesters(), getClasses()
      ]);
      setStudents(stuRes || []);
      setInstitutes(instRes || []);
      setDepartments(deptRes || []);
      setAcademicYears(yearRes || []);
      setSemesters(semRes || []);
      setClasses(classRes || []);
    } catch (err) {
      console.error(err);
      onError("Failed to load student data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMasterData(); }, []);

  // ==========================================
  // 5. CASCADING LOGIC FOR FILTERS & EDIT FORM
  // ==========================================
  const filteredDepartments = useMemo(() => departments.filter(d => d.institute_id === selectedInstitute), [departments, selectedInstitute]);
  const filteredYears = useMemo(() => academicYears.filter(y => y.department_id === selectedDepartment), [academicYears, selectedDepartment]);
  const filteredSemesters = useMemo(() => semesters.filter(s => s.academic_year_id === selectedYear), [semesters, selectedYear]);
  const filteredClasses = useMemo(() => classes.filter(c => c.semester_id === selectedSemester), [classes, selectedSemester]);

  // Reset downstream filter selections
  useEffect(() => { setSelectedDepartment(''); }, [selectedInstitute]);
  useEffect(() => { setSelectedYear(''); }, [selectedDepartment]);
  useEffect(() => { setSelectedSemester(''); }, [selectedYear]);
  useEffect(() => { setSelectedClass(''); }, [selectedSemester]);

  // ==========================================
  // 6. MAIN LIST FILTERING
  // ==========================================
  const displayedStudents = useMemo(() => {
    let result = students;

    // Search Query
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(s => 
            (s.name?.toLowerCase().includes(q)) || 
            (s.email?.toLowerCase().includes(q)) ||
            (s.enrollment_number?.toLowerCase().includes(q))
        );
    }

    // Dropdown Filters
    if (statusFilter) result = result.filter(s => s.account_status === statusFilter);
    if (selectedClass) result = result.filter(s => s.class_id === selectedClass);
    else if (selectedSemester) result = result.filter(s => s.semester_id === selectedSemester);
    else if (selectedInstitute) result = result.filter(s => s.institute_id === selectedInstitute);

    return result;
  }, [students, searchQuery, statusFilter, selectedInstitute, selectedSemester, selectedClass]);

  // ==========================================
  // 7. HANDLERS
  // ==========================================
  const openEditModal = (student) => {
    setEditForm({
      id: student.user_id,
      name: student.name,
      email: student.email,
      enrollment_number: student.enrollment_number,
      institute_id: student.institute_id || '',
      semester_id: student.semester_id || '',
      class_id: student.class_id || '',
      account_status: student.account_status || 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateStudent(editForm.id, editForm);
      onSuccess("STUDENT UPDATED SUCCESSFULLY");
      setIsEditModalOpen(false);
      fetchMasterData();
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO UPDATE STUDENT");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!studentToDelete) return;
    try {
      await deleteStudent(studentToDelete.user_id);
      onSuccess("STUDENT DELETED PERMANENTLY");
      fetchMasterData();
    } catch (err) {
      onError("FAILED TO DELETE STUDENT");
    } finally {
      setStudentToDelete(null);
    }
  };

  // Helper for Status Badges
  const getStatusColor = (status) => {
      switch(status) {
          case 'ACTIVE': return 'bg-green-200 text-green-800 border-green-800';
          case 'ALUMNI': return 'bg-blue-200 text-blue-800 border-blue-800';
          case 'DROPPED': return 'bg-red-200 text-red-800 border-red-800';
          case 'SUSPENDED': return 'bg-yellow-200 text-yellow-800 border-yellow-800';
          default: return 'bg-gray-200 text-gray-800 border-gray-800';
      }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* ==========================
          HEADER & SEARCH
      ========================== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b-2 border-black pb-4">
        <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
          <GraduationCap size={28} className="text-black" /> Student Directory
        </h3>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full sm:w-[300px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                  type="text" placeholder="Search name, ID, or email..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-black font-bold outline-none focus:bg-gray-50 bg-white"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
          <button onClick={fetchMasterData} className="p-2 border-2 border-black hover:bg-gray-100 transition-colors bg-white">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ==========================
          FILTER BAR
      ========================== */}
      <div className="bg-gray-100 p-4 border-2 border-black grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
         <div className="col-span-1 md:col-span-1">
             <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Filter size={12}/> Status</label>
             <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                 <option value="">ALL STATUS</option>
                 <option value="ACTIVE">ACTIVE</option>
                 <option value="ALUMNI">ALUMNI</option>
                 <option value="DROPPED">DROPPED</option>
                 <option value="SUSPENDED">SUSPENDED</option>
             </select>
         </div>
         <div>
             <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">Institute</label>
             <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedInstitute} onChange={e => setSelectedInstitute(e.target.value)}>
                 <option value="">ALL INSTITUTES</option>
                 {institutes.map(i => <option key={i.institute_id} value={i.institute_id}>{i.name}</option>)}
             </select>
         </div>
         <div className={!selectedInstitute ? 'opacity-50' : ''}>
             <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">Department</label>
             <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} disabled={!selectedInstitute}>
                 <option value="">ALL DEPTS</option>
                 {filteredDepartments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
             </select>
         </div>
         <div className={!selectedDepartment ? 'opacity-50' : ''}>
             <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">Year</label>
             <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} disabled={!selectedDepartment}>
                 <option value="">ALL YEARS</option>
                 {filteredYears.map(y => <option key={y.academic_year_id} value={y.academic_year_id}>{y.name}</option>)}
             </select>
         </div>
         <div className={!selectedYear ? 'opacity-50' : ''}>
             <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">Semester</label>
             <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} disabled={!selectedYear}>
                 <option value="">ALL SEMESTERS</option>
                 {filteredSemesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.name}</option>)}
             </select>
         </div>
         <div className={!selectedSemester ? 'opacity-50' : ''}>
             <label className="text-[10px] font-bold uppercase mb-1 flex items-center gap-1">Class</label>
             <select className="w-full p-2 border-2 border-black font-bold text-xs bg-white" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={!selectedSemester}>
                 <option value="">ALL CLASSES</option>
                 {filteredClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
             </select>
         </div>
      </div>

      {/* ==========================
          DATA TABLE
      ========================== */}
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-black text-white text-[10px] uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-4 border-r border-white/20">Student Name & ID</th>
                  <th className="p-4 border-r border-white/20">Academic Context</th>
                  <th className="p-4 border-r border-white/20 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y-2 divide-gray-200">
                {loading ? (
                    <tr><td colSpan="4" className="p-12 text-center font-black animate-pulse">LOADING STUDENT DATA...</td></tr>
                ) : displayedStudents.length > 0 ? (
                  displayedStudents.map((s, idx) => (
                      <tr key={s.user_id} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="p-4 border-r border-gray-200">
                          <div className="font-black text-lg">{s.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="bg-black text-white px-2 py-0.5 text-[10px] font-mono font-bold flex items-center gap-1">
                                 <Hash size={10}/> {s.enrollment_number}
                              </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-bold mt-2">
                             <Mail size={12}/> {s.email}
                          </div>
                        </td>

                        <td className="p-4 border-r border-gray-200">
                           <div className="font-bold text-sm flex items-center gap-1 text-blue-800">
                               <Layers size={14}/> {s.class_name || 'Unassigned Class'}
                           </div>
                           <div className="text-xs font-bold text-gray-600 mt-1 uppercase">
                               {s.semester_name || 'No Semester'} | {s.academic_year || 'No Year'}
                           </div>
                           <div className="text-[10px] uppercase font-bold text-gray-400 mt-2 flex items-center gap-1">
                               <Building size={10}/> {s.institute_name || 'No Institute'}
                           </div>
                        </td>

                        <td className="p-4 border-r border-gray-200 text-center">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase border-2 ${getStatusColor(s.account_status)}`}>
                                {s.account_status}
                            </span>
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <button onClick={() => openEditModal(s)} className="p-2 border-2 border-black bg-white hover:bg-yellow-400 transition-all active:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none">
                               <Edit2 size={16} />
                             </button>
                             <button onClick={() => setStudentToDelete(s)} className="p-2 border-2 border-black bg-white hover:bg-red-500 hover:text-white transition-all active:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none">
                               <Trash2 size={16} />
                             </button>
                          </div>
                        </td>
                      </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400 font-black uppercase tracking-widest bg-gray-50">No students found.</td></tr>
                )}
              </tbody>
            </table>
        </div>
        <div className="bg-gray-100 p-2 text-right text-[10px] font-black uppercase text-gray-500 border-t-2 border-black">
            TOTAL MATCHING: {displayedStudents.length}
        </div>
      </div>

      {/* =======================
          EDIT MODAL
      ======================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 mb-6 text-black border-b-2 border-black pb-4">
              <h2 className="text-2xl font-black uppercase flex items-center gap-2"><Edit2 size={24}/> Edit Student</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-6">
               
               {/* Identity Section */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 border-2 border-black">
                   <div className="col-span-1 md:col-span-2">
                      <label className="block text-[10px] font-bold mb-1 uppercase">Full Name</label>
                      <input type="text" className="w-full p-2 border-2 border-black font-bold bg-white" 
                        value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase">Email</label>
                      <input type="email" className="w-full p-2 border-2 border-black font-bold bg-white" 
                        value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
                   </div>
                   <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase">Enrollment No.</label>
                      <input type="text" className="w-full p-2 border-2 border-black font-bold bg-white" 
                        value={editForm.enrollment_number} onChange={e => setEditForm({...editForm, enrollment_number: e.target.value})} required />
                   </div>
               </div>

               {/* Academic Placement Section */}
               <div className="space-y-4 p-4 border-2 border-black">
                   <h4 className="font-black text-sm uppercase border-b-2 border-black pb-1">Academic Placement</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-bold mb-1 uppercase">Institute</label>
                          <select className="w-full p-2 border-2 border-black font-bold bg-white" value={editForm.institute_id} onChange={e => setEditForm({...editForm, institute_id: e.target.value, semester_id: '', class_id: ''})}>
                            <option value="">-- NO INSTITUTE --</option>
                            {institutes.map(i => <option key={i.institute_id} value={i.institute_id}>{i.name}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold mb-1 uppercase">Account Status</label>
                          <select className="w-full p-2 border-2 border-black font-bold bg-white" value={editForm.account_status} onChange={e => setEditForm({...editForm, account_status: e.target.value})}>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="ALUMNI">ALUMNI</option>
                            <option value="DROPPED">DROPPED</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold mb-1 uppercase">Current Semester</label>
                          <select className="w-full p-2 border-2 border-black font-bold bg-white" value={editForm.semester_id} onChange={e => setEditForm({...editForm, semester_id: e.target.value, class_id: ''})}>
                            <option value="">-- UNASSIGNED --</option>
                            {semesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.name}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold mb-1 uppercase">Target Class</label>
                          <select className="w-full p-2 border-2 border-black font-bold bg-white" value={editForm.class_id} onChange={e => setEditForm({...editForm, class_id: e.target.value})}>
                            <option value="">-- UNASSIGNED --</option>
                            {classes.filter(c => !editForm.semester_id || c.semester_id === editForm.semester_id).map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                          </select>
                       </div>
                   </div>
               </div>

               <div className="flex gap-4 pt-4 border-t-2 border-black">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 font-black border-4 border-black hover:bg-gray-100 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-blue-600 text-white font-black border-4 border-black hover:bg-blue-800 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 disabled:opacity-50">
                    {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,0,0,0.4)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={48} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black leading-tight">Delete Student?</h2>
            </div>
            
            <p className="font-bold text-black mb-4 text-sm">
              Are you sure you want to permanently delete <span className="bg-red-200 px-1">{studentToDelete.name}</span>? 
              <br/><br/><span className="text-red-600 font-black">WARNING:</span> This will permanently erase their account, login access, and all associated submissions/viva data. Consider changing their status to "ALUMNI" or "DROPPED" instead.
            </p>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStudentToDelete(null)} className="flex-1 py-4 font-black border-4 border-black hover:bg-gray-100 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1" type="button">Cancel</button>
              <button onClick={handleDelete} type="button" className="flex-1 py-4 bg-red-600 text-white font-black border-4 border-black hover:bg-red-700 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentList;