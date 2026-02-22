import React, { useState, useEffect, useMemo } from 'react';
import { createClass, getClasses, getSemesters, getDepartments, getInstitutes, updateClass, deleteClass } from '@/utils/api';
import { Users, RefreshCw, Filter, Search, Edit2, Trash2, X, AlertTriangle, Building, Layers } from 'lucide-react';

const ClassForm = ({ onSuccess, onError }) => {
  const [institutes, setInstitutes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [form, setForm] = useState({ 
    name: '', 
    department_id: '',
    semester_id: ''
  });
  // Virtual state just for driving the dropdowns smoothly
  const [formInstituteId, setFormInstituteId] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Filter & Search State
  const [filterInstitute, setFilterInstitute] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [instRes, deptRes, semRes, classRes] = await Promise.all([
        getInstitutes(),
        getDepartments(),
        getSemesters(),
        getClasses()
      ]);
      setInstitutes(instRes || []);
      setDepartments(deptRes || []);
      setSemesters(semRes || []);
      setClassesList(classRes || []);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Form Cascading Logic
  const formDepartments = useMemo(() => {
      if (!formInstituteId) return departments;
      return departments.filter(d => d.institute_id === formInstituteId);
  }, [departments, formInstituteId]);

  const formSemesters = useMemo(() => {
      if (!form.department_id) return [];
      return semesters.filter(s => s.department_id === form.department_id && s.is_active);
  }, [semesters, form.department_id]);


  // Main List Filters
  const filteredClasses = useMemo(() => {
    let result = classesList;

    if (filterInstitute) result = result.filter(c => c.institute_id === filterInstitute);
    if (filterDept) result = result.filter(c => c.department_id === filterDept);
    if (filterSem) result = result.filter(c => c.semester_id === filterSem);
    
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(c => c.name.toLowerCase().includes(q));
    }

    return result;
  }, [classesList, filterInstitute, filterDept, filterSem, searchQuery]);

  // Extract unique identifiers for filters
  const uniqueInstitutes = useMemo(() => {
      const map = new Map();
      departments.forEach(d => { if(d.institute_id) map.set(d.institute_id, d.institute_name); });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [departments]);


  // HANDLERS
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        await updateClass(editId, form);
        onSuccess("CLASS UPDATED");
        cancelEdit();
      } else {
        await createClass(form);
        onSuccess("CLASS CREATED");
        setForm({ name: '', department_id: '', semester_id: '' });
        setFormInstituteId('');
      }
      fetchData();
    } catch (err) {
      onError(err.response?.data?.error || (isEditing ? "FAILED TO UPDATE CLASS" : "FAILED TO CREATE CLASS"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (cls) => {
    setIsEditing(true);
    setEditId(cls.class_id);
    setFormInstituteId(cls.institute_id || '');
    setForm({
      name: cls.name,
      department_id: cls.department_id,
      semester_id: cls.semester_id
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ name: '', department_id: '', semester_id: '' });
    setFormInstituteId('');
  };

  const handleDeleteClick = (cls) => {
    setClassToDelete(cls);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!classToDelete) return;
    try {
      await deleteClass(classToDelete.class_id);
      onSuccess("CLASS DELETED");
      if (isEditing && editId === classToDelete.class_id) cancelEdit();
      fetchData();
    } catch (err) {
      onError("FAILED TO DELETE CLASS");
    } finally {
      setShowDeleteConfirm(false);
      setClassToDelete(null);
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
            <Users size={24} /> 
            {isEditing ? "Edit Class" : "Add New Class"}
          </div>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-black flex items-center gap-1 text-sm">
              <X size={16}/> Cancel
            </button>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Institute (Filter)</label>
            <select 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
              value={formInstituteId}
              onChange={e => {
                  setFormInstituteId(e.target.value);
                  setForm({...form, department_id: '', semester_id: ''}); // cascade reset
              }} 
            >
              <option value="">-- ALL INSTITUTES --</option>
              {institutes.map(inst => (<option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Department (MANDATORY)</label>
            <select 
              className={`w-full p-3 border-2 border-black outline-none font-bold bg-white ${!formDepartments.length ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'focus:bg-gray-50'}`} 
              value={form.department_id}
              onChange={e => setForm({...form, department_id: e.target.value, semester_id: ''})} 
              required
            >
              <option value="">-- SELECT DEPARTMENT --</option>
              {formDepartments.map(d => (<option key={d.department_id} value={d.department_id}>{d.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Semester (MANDATORY)</label>
            <select 
              className={`w-full p-3 border-2 border-black outline-none font-bold bg-white ${!form.department_id ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'focus:bg-gray-50'}`} 
              value={form.semester_id}
              onChange={e => setForm({...form, semester_id: e.target.value})} 
              required
              disabled={!form.department_id}
            >
              <option value="">{!form.department_id ? "-- SELECT DEPT FIRST --" : "-- SELECT SEMESTER --"}</option>
              {formSemesters.map(s => (<option key={s.semester_id} value={s.semester_id}>{s.name}</option>))}
            </select>
          </div>
        </div>

        <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Class Name / Division</label>
            <input type="text" placeholder="e.g. Div-A, CSE-1, etc." className="w-full md:w-1/2 p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        </div>

        <button disabled={submitting} className={`mt-8 w-full text-white font-black uppercase tracking-widest py-4 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 ${isEditing ? 'bg-blue-600 hover:bg-blue-800' : 'bg-black hover:bg-gray-800'}`}>
          {submitting ? "PROCESSING..." : (isEditing ? "UPDATE CLASS" : "CREATE CLASS")}
        </button>
      </form>

      {/* ==========================
          VIEW / LIST
      ========================== */}
      <div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 w-full xl:w-auto">
            <RefreshCw size={20} className={`cursor-pointer hover:rotate-180 transition-transform ${loadingData ? 'animate-spin' : ''}`} onClick={fetchData}/>
            Existing Classes
          </h3>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full xl:w-auto">
            
            {/* SEARCH */}
            <div className="relative w-full sm:w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text" placeholder="Search class name..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-black font-bold outline-none focus:bg-gray-50 text-xs"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* INSTITUTE FILTER */}
            <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black w-full sm:w-auto">
              <Filter size={16} />
              <select 
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[120px] w-full"
                value={filterInstitute} 
                onChange={e => { setFilterInstitute(e.target.value); setFilterDept(''); setFilterSem(''); }}
              >
                <option value="">ALL INSTITUTES</option>
                {uniqueInstitutes.map(i => (<option key={i.id} value={i.id}>{i.name}</option>))}
              </select>
            </div>

            {/* DEPARTMENT FILTER */}
            <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black w-full sm:w-auto">
              <Filter size={16} />
              <select 
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[120px] w-full"
                value={filterDept} 
                onChange={e => { setFilterDept(e.target.value); setFilterSem(''); }}
              >
                <option value="">ALL DEPARTMENTS</option>
                {departments
                  .filter(d => filterInstitute ? d.institute_id === filterInstitute : true)
                  .map(d => (<option key={d.department_id} value={d.department_id}>{d.name}</option>))
                }
              </select>
            </div>

            {/* SEMESTER FILTER */}
            <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black w-full sm:w-auto">
              <Filter size={16} />
              <select 
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[120px] w-full"
                value={filterSem} onChange={e => setFilterSem(e.target.value)}
              >
                <option value="">ALL SEMESTERS</option>
                {semesters
                  .filter(s => filterDept ? s.department_id === filterDept : true)
                  .map(s => (<option key={s.semester_id} value={s.semester_id}>{s.name}</option>))
                }
              </select>
            </div>

          </div>
        </div>

        <div className="border-2 border-black bg-white max-h-[500px] overflow-y-auto">
          {loadingData ? (
             <div className="p-12 text-center font-bold animate-pulse">LOADING DATA...</div>
          ) : filteredClasses.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-4">Class / Div Name</th>
                  <th className="p-4">Semester</th>
                  <th className="p-4">Department Context</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredClasses.map((cls, idx) => (
                    <tr key={cls.class_id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      
                      <td className="p-4 border-r border-gray-200 font-black text-lg">
                        {cls.name}
                      </td>

                      <td className="p-4 border-r border-gray-200">
                        <span className="font-bold text-black flex items-center gap-2">
                           <Layers size={14} className="text-gray-500" /> {cls.semester_name}
                        </span>
                      </td>

                      <td className="p-4 border-r border-gray-200">
                         <div className="font-bold text-sm">{cls.department_name}</div>
                         <div className="text-[10px] uppercase font-bold text-gray-500 mt-1 flex items-center gap-1">
                             <Building size={10}/> {cls.institute_name}
                         </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => handleEditClick(cls)}
                             title="Edit Class"
                             className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                           >
                             <Edit2 size={16} />
                           </button>

                           <button 
                             onClick={() => handleDeleteClick(cls)}
                             title="Delete Class"
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
            <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">No classes found matching filters.</div>
          )}
        </div>
      </div>

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {showDeleteConfirm && classToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Deletion</h2>
            </div>
            
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to delete this Class/Division? 
              <br/><br/><span className="text-red-600 font-bold">WARNING:</span> This may permanently delete all student enrollments and assignments tied to it!
            </p>

            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{classToDelete.name}</span>
              <span className="block text-xs font-bold text-gray-600 mt-1 uppercase">{classToDelete.semester_name} - {classToDelete.department_name}</span>
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteConfirm(false); setClassToDelete(null); }} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest" type="button">Cancel</button>
              <button onClick={confirmDelete} type="button" className="flex-1 py-4 bg-red-600 text-white font-bold border-2 border-black hover:bg-red-700 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClassForm;