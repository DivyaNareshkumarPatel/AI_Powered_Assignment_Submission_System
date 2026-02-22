import React, { useState, useEffect, useMemo } from 'react';
import { createSubject, getInstitutes, getSubjects, updateSubject, deleteSubject } from '@/utils/api';
import { BookOpen, RefreshCw, Filter, Search, Edit2, Trash2, X, AlertTriangle, Building } from 'lucide-react';

const SubjectForm = ({ onSuccess, onError }) => {
  const [institutes, setInstitutes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [form, setForm] = useState({ 
    name: '', 
    code: '', 
    institute_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Filter & Search
  const [filterInstitute, setFilterInstitute] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [instRes, subRes] = await Promise.all([
        getInstitutes(),
        getSubjects()
      ]);
      setInstitutes(instRes || []);
      setSubjects(subRes || []);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Main List Filters
  const filteredSubjects = useMemo(() => {
    let result = subjects;

    // Filter by Institute
    if (filterInstitute) {
        result = result.filter(sub => sub.institute_id === filterInstitute);
    }

    // Search by Name or Code
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(sub => 
            (sub.name && sub.name.toLowerCase().includes(q)) || 
            (sub.code && sub.code.toLowerCase().includes(q))
        );
    }

    return result;
  }, [subjects, filterInstitute, searchQuery]);

  // HANDLERS
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        await updateSubject(editId, form);
        onSuccess("SUBJECT UPDATED");
        cancelEdit();
      } else {
        await createSubject(form);
        onSuccess("SUBJECT CREATED");
        setForm({ name: '', code: '', institute_id: '' });
      }
      fetchData();
    } catch (err) {
      onError(err.response?.data?.error || (isEditing ? "FAILED TO UPDATE SUBJECT" : "FAILED TO CREATE SUBJECT"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (sub) => {
    setIsEditing(true);
    setEditId(sub.subject_id);
    setForm({
      name: sub.name,
      code: sub.code,
      institute_id: sub.institute_id
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ name: '', code: '', institute_id: '' });
  };

  const handleDeleteClick = (sub) => {
    setSubjectToDelete(sub);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    try {
      await deleteSubject(subjectToDelete.subject_id);
      onSuccess("SUBJECT DELETED");
      if (isEditing && editId === subjectToDelete.subject_id) cancelEdit();
      fetchData();
    } catch (err) {
      onError("FAILED TO DELETE SUBJECT");
    } finally {
      setShowDeleteConfirm(false);
      setSubjectToDelete(null);
    }
  };

  return (
    <div className="space-y-12 relative">
      
      {/* ==========================
          CREATE / EDIT FORM
      ========================== */}
      <form onSubmit={handleSubmit} className={`space-y-6 p-6 border-4 ${isEditing ? 'border-blue-500 bg-blue-50' : 'border-black bg-white'} pb-10`}>
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen size={24} /> 
            {isEditing ? "Edit Subject" : "Add New Subject"}
          </div>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-black flex items-center gap-1 text-sm">
              <X size={16}/> Cancel
            </button>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Subject Name (MANDATORY)</label>
            <input type="text" placeholder="e.g. Data Structures" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Subject Code (UNIQUE)</label>
            <input type="text" placeholder="e.g. CS101" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white uppercase" 
              value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Institute (MANDATORY)</label>
          <select 
            className="w-full md:w-1/2 p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
            value={form.institute_id}
            onChange={e => setForm({...form, institute_id: e.target.value})} 
            required
          >
            <option value="">-- SELECT INSTITUTE --</option>
            {institutes.map(inst => (<option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>))}
          </select>
        </div>

        <button disabled={submitting} className={`mt-8 w-full text-white font-black uppercase tracking-widest py-4 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 ${isEditing ? 'bg-blue-600 hover:bg-blue-800' : 'bg-black hover:bg-gray-800'}`}>
          {submitting ? "PROCESSING..." : (isEditing ? "UPDATE SUBJECT" : "CREATE SUBJECT")}
        </button>
      </form>

      {/* ==========================
          VIEW / LIST
      ========================== */}
      <div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 w-full xl:w-auto">
            <RefreshCw size={20} className={`cursor-pointer hover:rotate-180 transition-transform ${loadingData ? 'animate-spin' : ''}`} onClick={fetchData}/>
            Existing Subjects
          </h3>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full xl:w-auto">
            
            {/* SEARCH */}
            <div className="relative w-full sm:w-[250px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text" placeholder="Search name or code..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-black font-bold outline-none focus:bg-gray-50 text-xs"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* INSTITUTE FILTER */}
            <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black w-full sm:w-auto">
              <Filter size={16} />
              <select 
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[150px] w-full"
                value={filterInstitute} 
                onChange={e => setFilterInstitute(e.target.value)}
              >
                <option value="">ALL INSTITUTES</option>
                {institutes.map(i => (<option key={i.institute_id} value={i.institute_id}>{i.name}</option>))}
              </select>
            </div>

          </div>
        </div>

        <div className="border-2 border-black bg-white max-h-[500px] overflow-y-auto">
          {loadingData ? (
             <div className="p-12 text-center font-bold animate-pulse">LOADING DATA...</div>
          ) : filteredSubjects.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-4">Subject Name</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Institute Context</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredSubjects.map((sub, idx) => (
                    <tr key={sub.subject_id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      
                      <td className="p-4 border-r border-gray-200 font-black text-base">
                        {sub.name}
                      </td>

                      <td className="p-4 border-r border-gray-200">
                        <span className="font-bold uppercase text-gray-800 bg-gray-200 px-2 py-1 border border-black text-xs">{sub.code}</span>
                      </td>

                      <td className="p-4 border-r border-gray-200">
                         <div className="flex items-center gap-2">
                             <Building size={14} className="text-gray-500"/>
                             <span className="font-bold uppercase text-gray-600">{sub.institute_name}</span>
                         </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => handleEditClick(sub)}
                             title="Edit Subject"
                             className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                           >
                             <Edit2 size={16} />
                           </button>

                           <button 
                             onClick={() => handleDeleteClick(sub)}
                             title="Delete Subject"
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
            <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">No subjects found matching filters.</div>
          )}
        </div>
      </div>

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {showDeleteConfirm && subjectToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Deletion</h2>
            </div>
            
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to delete this subject? 
              <br/><br/><span className="text-red-600 font-bold">WARNING:</span> This may permanently delete all teacher allocations and assignments tied to it!
            </p>

            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{subjectToDelete.name}</span>
              <span className="block text-xs font-bold text-gray-800 mt-1 uppercase bg-gray-300 inline-block px-1 border border-black">{subjectToDelete.code}</span>
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteConfirm(false); setSubjectToDelete(null); }} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest" type="button">Cancel</button>
              <button onClick={confirmDelete} type="button" className="flex-1 py-4 bg-red-600 text-white font-bold border-2 border-black hover:bg-red-700 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SubjectForm;