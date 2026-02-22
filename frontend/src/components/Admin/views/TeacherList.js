import React, { useState, useEffect, useMemo } from 'react';
import { getTeachers, getInstitutes, updateTeacher, deleteTeacher } from '@/utils/api';
import { Users, Search, Edit2, Trash2, X, AlertTriangle, RefreshCw, Filter, Mail, Building, Hash } from 'lucide-react';

const TeacherList = ({ onSuccess, onError }) => {
  const [teachers, setTeachers] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstitute, setFilterInstitute] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', enrollment_number: '', institute_id: '' });
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [techRes, instRes] = await Promise.all([
        getTeachers(),
        getInstitutes()
      ]);
      setTeachers(techRes || []);
      setInstitutes(instRes || []);
    } catch (err) {
      console.error(err);
      onError("Failed to load teachers data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter List
  const filteredTeachers = useMemo(() => {
    let result = teachers;
    
    if (filterInstitute) {
        result = result.filter(t => t.institute_id === filterInstitute);
    }

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(t => 
            (t.name && t.name.toLowerCase().includes(q)) || 
            (t.email && t.email.toLowerCase().includes(q)) ||
            (t.enrollment_number && t.enrollment_number.toLowerCase().includes(q))
        );
    }
    return result;
  }, [teachers, filterInstitute, searchQuery]);


  // ==============================
  // HANDLERS
  // ==============================
  const openEditModal = (teacher) => {
    setEditForm({
      id: teacher.user_id,
      name: teacher.name,
      email: teacher.email,
      enrollment_number: teacher.enrollment_number, // acts as Employee ID for Teachers
      institute_id: teacher.institute_id || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateTeacher(editForm.id, {
          name: editForm.name,
          email: editForm.email,
          enrollment_number: editForm.enrollment_number,
          institute_id: editForm.institute_id
      });
      onSuccess("TEACHER UPDATED SUCCESSFULLY");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO UPDATE TEACHER");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (teacher) => {
    setTeacherToDelete(teacher);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      await deleteTeacher(teacherToDelete.user_id);
      onSuccess("TEACHER DELETED SUCCESSFULLY");
      fetchData();
    } catch (err) {
      onError("FAILED TO DELETE TEACHER");
    } finally {
      setShowDeleteConfirm(false);
      setTeacherToDelete(null);
    }
  };

  return (
    <div className="space-y-8 relative">
      
      {/* ==========================
          HEADER & FILTERS
      ========================== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 w-full xl:w-auto">
          <Users size={24} className="text-black" /> 
          <span className="flex items-center gap-2">
            Teacher Directory
            <RefreshCw size={16} className={`cursor-pointer hover:rotate-180 transition-transform ${loading ? 'animate-spin' : ''}`} onClick={fetchData}/>
          </span>
        </h3>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* SEARCH */}
          <div className="relative w-full sm:w-[250px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                  type="text" placeholder="Search name, ID, or email..."
                  className="w-full pl-9 pr-3 py-2 border-2 border-black font-bold outline-none focus:bg-gray-50 text-xs"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>

          {/* INSTITUTE FILTER */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black w-full sm:w-auto">
            <Filter size={16} />
            <select 
              className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[150px] w-full"
              value={filterInstitute} onChange={e => setFilterInstitute(e.target.value)}
            >
              <option value="">ALL INSTITUTES</option>
              {institutes.map(inst => (<option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* ==========================
          DATA TABLE
      ========================== */}
      <div className="border-2 border-black bg-white max-h-[600px] overflow-y-auto">
        {loading ? (
           <div className="p-12 text-center font-bold animate-pulse">LOADING TEACHERS...</div>
        ) : filteredTeachers.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
              <tr>
                <th className="p-4">Teacher Name</th>
                <th className="p-4">Contact & ID</th>
                <th className="p-4">Institute</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredTeachers.map((t, idx) => (
                  <tr key={t.user_id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    
                    <td className="p-4 border-r border-gray-200 font-black text-base">
                      {t.name}
                    </td>

                    <td className="p-4 border-r border-gray-200 text-xs font-mono">
                      <div className="flex flex-col gap-1 text-gray-700">
                          <span className="flex items-center gap-2 font-bold bg-gray-200 px-1 py-0.5 border border-gray-300 w-fit">
                             <Hash size={12}/> EMP ID: {t.enrollment_number}
                          </span>
                          <span className="flex items-center gap-2">
                             <Mail size={12}/> {t.email}
                          </span>
                      </div>
                    </td>

                    <td className="p-4 border-r border-gray-200 text-xs font-bold uppercase text-gray-600">
                       <div className="flex items-center gap-2">
                           <Building size={14}/> {t.institute_name || 'Global (No Institute)'}
                       </div>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button 
                           onClick={() => openEditModal(t)}
                           title="Edit Teacher"
                           className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                         >
                           <Edit2 size={16} />
                         </button>

                         <button 
                           onClick={() => openDeleteModal(t)}
                           title="Delete Teacher"
                           className="p-2 border-2 border-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </td>

                  </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">No teachers found.</div>
        )}
      </div>

      {/* =======================
          EDIT MODAL
      ======================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-lg w-full p-8">
            <div className="flex items-center justify-between gap-4 mb-6 text-black border-b-2 border-black pb-4">
              <h2 className="text-2xl font-black uppercase flex items-center gap-2"><Edit2 size={24}/> Edit Teacher</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="hover:text-red-600 transition-colors"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Teacher Name (MANDATORY)</label>
                    <input type="text" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
                      value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                 </div>
                 <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Employee ID (UNIQUE)</label>
                    <input type="text" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
                      value={editForm.enrollment_number} onChange={e => setEditForm({...editForm, enrollment_number: e.target.value})} required />
                 </div>
               </div>

               <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Email (MANDATORY & UNIQUE)</label>
                  <input type="email" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
                    value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
               </div>

               <div>
                  <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Institute (Optional)</label>
                  <select 
                    className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
                    value={editForm.institute_id}
                    onChange={e => setEditForm({...editForm, institute_id: e.target.value})} 
                  >
                    <option value="">-- NO INSTITUTE --</option>
                    {institutes.map(i => (<option key={i.institute_id} value={i.institute_id}>{i.name}</option>))}
                  </select>
               </div>

               <div className="flex gap-4 pt-4 border-t-2 border-black mt-4">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-4 bg-blue-600 text-white font-bold border-2 border-black hover:bg-blue-800 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50">
                    {submitting ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {showDeleteConfirm && teacherToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Deletion</h2>
            </div>
            
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to delete this teacher? 
              <br/><br/><span className="text-red-600 font-bold">WARNING:</span> This action is permanent and may remove the teacher from all active subject allocations!
            </p>

            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{teacherToDelete.name}</span>
              <span className="block text-xs font-bold text-gray-500 mt-1 uppercase">{teacherToDelete.email}</span>
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteConfirm(false); setTeacherToDelete(null); }} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest" type="button">Cancel</button>
              <button onClick={confirmDelete} type="button" className="flex-1 py-4 bg-red-600 text-white font-bold border-2 border-black hover:bg-red-700 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherList;