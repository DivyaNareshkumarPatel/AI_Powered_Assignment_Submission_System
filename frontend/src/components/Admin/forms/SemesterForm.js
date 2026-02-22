import React, { useState, useEffect, useMemo } from 'react';
import { createSemester, getDepartments, getSemesters, getYears, updateSemesterStatus, updateSemester, deleteSemester } from '@/utils/api';
import { Layers, Building, Filter, RefreshCw, Calendar, CheckCircle, XCircle, Power, AlertTriangle, Search, Edit2, Trash2, X } from 'lucide-react';

const SemesterForm = ({ onSuccess, onError }) => {
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [allSemesters, setAllSemesters] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [form, setForm] = useState({ 
    name: '', 
    type: 'ODD', 
    academic_year_id: '',
    department_id: '',
    start_date: '', 
    end_date: '',   
  });
  const [submitting, setSubmitting] = useState(false);

  // States for Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Filter & Search
  const [filterInstitute, setFilterInstitute] = useState('');
  const [filterYear, setFilterYear] = useState(''); // NEW: Academic Year Filter
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [targetSem, setTargetSem] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [semToDelete, setSemToDelete] = useState(null);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [deptRes, yearRes, semRes] = await Promise.all([
        getDepartments(),
        getYears(),
        getSemesters()
      ]);
      setDepartments(deptRes || []);
      setYears(yearRes || []);
      setAllSemesters(semRes || []);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter Academic Years based on Selected Department (For the Create Form)
  const formYears = useMemo(() => {
    return years.filter(y => y.department_id === form.department_id);
  }, [years, form.department_id]);

  // Filter Academic Years based on Selected Institute (For the List Filter Dropdown)
  const filterYearsList = useMemo(() => {
    if (!filterInstitute) return years;
    return years.filter(y => {
        const dept = departments.find(d => d.department_id === y.department_id);
        return dept && dept.institute_id === filterInstitute;
    });
  }, [years, departments, filterInstitute]);

  // Determine allowed dates for the Date Pickers based on selected Academic Year
  const selectedYearLimits = useMemo(() => {
    if (!form.academic_year_id) return { min: '', max: '' };
    const year = years.find(y => y.academic_year_id === form.academic_year_id);
    if (!year) return { min: '', max: '' };
    return {
        min: new Date(year.start_date).toISOString().split('T')[0],
        max: new Date(year.end_date).toISOString().split('T')[0]
    };
  }, [form.academic_year_id, years]);

  // Helpers
  const getDeptInfo = (id) => {
    const d = departments.find(dept => dept.department_id === id);
    return d ? { name: d.name, inst: d.institute_name } : { name: 'Unknown', inst: 'Unknown' };
  };

  const getYearInfo = (yearId) => {
    const year = years.find(y => y.academic_year_id === yearId);
    if (!year) return { name: 'Unknown Year', isActive: false };
    return { name: year.name, isActive: year.is_active };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Main List Filter
  const filteredSemesters = useMemo(() => {
    let result = allSemesters;

    if (filterInstitute) {
        result = result.filter(s => {
            const dept = departments.find(d => d.department_id === s.department_id);
            return dept && dept.institute_id === filterInstitute;
        });
    }

    if (filterYear) {
        result = result.filter(s => s.academic_year_id === filterYear);
    }

    if (filterStatus !== 'ALL') {
        const isActive = filterStatus === 'ACTIVE';
        result = result.filter(s => s.is_active === isActive);
    }

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(s => s.name && s.name.toLowerCase().includes(q));
    }

    return result;
  }, [allSemesters, departments, filterInstitute, filterYear, filterStatus, searchQuery]);

  // ==============================
  // HANDLERS
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        await updateSemester(editId, form);
        onSuccess("SEMESTER UPDATED");
        cancelEdit();
      } else {
        await createSemester(form);
        onSuccess("SEMESTER CREATED (INACTIVE)");
        setForm({ name: '', type: 'ODD', academic_year_id: '', department_id: '', start_date: '', end_date: '' }); 
      }
      fetchData(); 
    } catch (err) {
      onError(err.response?.data?.error || (isEditing ? "FAILED TO UPDATE SEMESTER" : "FAILED TO CREATE SEMESTER"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (sem) => {
    setIsEditing(true);
    setEditId(sem.semester_id);
    setForm({
      name: sem.name,
      type: sem.type,
      academic_year_id: sem.academic_year_id,
      department_id: sem.department_id,
      start_date: new Date(sem.start_date).toISOString().split('T')[0],
      end_date: new Date(sem.end_date).toISOString().split('T')[0]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ name: '', type: 'ODD', academic_year_id: '', department_id: '', start_date: '', end_date: '' });
  };

  // Toggle Handlers
  const handleToggleClick = (sem) => {
    setTargetSem(sem);
    setShowStatusConfirm(true);
  };

  const confirmToggle = async () => {
    if (!targetSem) return;
    try {
      await updateSemesterStatus(targetSem.semester_id, !targetSem.is_active);
      onSuccess(`SEMESTER ${!targetSem.is_active ? 'ACTIVATED' : 'DEACTIVATED'}`);
      fetchData();
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO UPDATE STATUS");
    } finally {
      setShowStatusConfirm(false);
      setTargetSem(null);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (sem) => {
    setSemToDelete(sem);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!semToDelete) return;
    try {
      await deleteSemester(semToDelete.semester_id);
      onSuccess("SEMESTER DELETED");
      if (isEditing && editId === semToDelete.semester_id) cancelEdit();
      fetchData();
    } catch (err) {
      onError("FAILED TO DELETE SEMESTER");
    } finally {
      setShowDeleteConfirm(false);
      setSemToDelete(null);
    }
  };

  // Extract unique institutes for the filter dropdown
  const uniqueInstitutes = useMemo(() => {
      const map = new Map();
      departments.forEach(d => { if(d.institute_id) map.set(d.institute_id, d.institute_name); });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [departments]);

  // When Institute filter changes, reset the Year filter
  const handleInstituteFilterChange = (e) => {
      setFilterInstitute(e.target.value);
      setFilterYear(''); // Reset year filter when institute changes
  };

  return (
    <div className="space-y-12 relative">
      
      {/* ==========================
          CREATE / EDIT FORM
      ========================== */}
      <form onSubmit={handleSubmit} className={`space-y-6 p-6 border-4 ${isEditing ? 'border-blue-500 bg-blue-50' : 'border-black bg-white'} pb-10`}>
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers size={24} /> 
            {isEditing ? "Edit Semester" : "Add New Semester"}
          </div>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-black flex items-center gap-1 text-sm">
              <X size={16}/> Cancel
            </button>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Department (MANDATORY)</label>
            <select 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
              value={form.department_id}
              onChange={e => setForm({...form, department_id: e.target.value, academic_year_id: ''})} 
              required
            >
              <option value="">-- SELECT DEPARTMENT --</option>
              {departments.map(d => (<option key={d.department_id} value={d.department_id}>{d.institute_name} - {d.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Academic Year</label>
            <select 
              className={`w-full p-3 border-2 border-black outline-none font-bold bg-white
                ${!form.department_id ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'focus:bg-gray-50'}`} 
              value={form.academic_year_id}
              onChange={e => setForm({...form, academic_year_id: e.target.value, start_date: '', end_date: ''})} 
              required
              disabled={!form.department_id}
            >
              <option value="">{!form.department_id ? "-- SELECT DEPT FIRST --" : "-- SELECT ACADEMIC YEAR --"}</option>
              {formYears.map(y => (
                  <option key={y.academic_year_id} value={y.academic_year_id}>
                    {y.name} {y.is_active ? '(Active)' : '(Inactive)'}
                  </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Semester Name</label>
            <input type="text" placeholder="e.g. Semester 1" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Type</label>
            <select className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold" 
              value={form.type} onChange={e => setForm({...form, type: e.target.value})} required>
              <option value="ODD">ODD</option>
              <option value="EVEN">EVEN</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2"><Calendar size={14}/> Start Date</span>
                {selectedYearLimits.min && <span className="text-[9px] text-gray-500">Min: {formatDate(selectedYearLimits.min)}</span>}
            </label>
            <input type="date" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold disabled:opacity-50 bg-white" 
              value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} 
              min={selectedYearLimits.min} max={selectedYearLimits.max}
              disabled={!form.academic_year_id} required />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2"><Calendar size={14}/> End Date</span>
                {selectedYearLimits.max && <span className="text-[9px] text-gray-500">Max: {formatDate(selectedYearLimits.max)}</span>}
            </label>
            <input type="date" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold disabled:opacity-50 bg-white" 
              value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} 
              min={selectedYearLimits.min} max={selectedYearLimits.max}
              disabled={!form.academic_year_id} required />
          </div>
        </div>

        <button disabled={submitting} className={`mt-8 w-full text-white font-black uppercase tracking-widest py-4 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 ${isEditing ? 'bg-blue-600 hover:bg-blue-800' : 'bg-black hover:bg-gray-800'}`}>
          {submitting ? "PROCESSING..." : (isEditing ? "UPDATE SEMESTER" : "CREATE SEMESTER")}
        </button>
      </form>

      {/* ==========================
          VIEW / LIST
      ========================== */}
      <div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 w-full xl:w-auto">
            <RefreshCw size={20} className={`cursor-pointer hover:rotate-180 transition-transform ${loadingData ? 'animate-spin' : ''}`} onClick={fetchData}/>
            Existing Semesters
          </h3>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full xl:w-auto">
            
            <div className="relative w-full sm:w-[150px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text" placeholder="Search..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-black font-bold outline-none focus:bg-gray-50 text-xs"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex items-center bg-gray-100 border-2 border-black w-full sm:w-auto">
              <button type="button" onClick={() => setFilterStatus('ALL')} className={`flex-1 sm:flex-none px-3 py-2 text-[10px] font-black uppercase transition-colors ${filterStatus === 'ALL' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-200'}`}>All</button>
              <button type="button" onClick={() => setFilterStatus('ACTIVE')} className={`flex-1 sm:flex-none px-3 py-2 text-[10px] font-black uppercase border-l-2 border-black transition-colors ${filterStatus === 'ACTIVE' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>Active</button>
              <button type="button" onClick={() => setFilterStatus('INACTIVE')} className={`flex-1 sm:flex-none px-3 py-2 text-[10px] font-black uppercase border-l-2 border-black transition-colors ${filterStatus === 'INACTIVE' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>Inactive</button>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black w-full sm:w-auto">
              <Filter size={16} />
              <select 
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[120px] w-full"
                value={filterInstitute} onChange={handleInstituteFilterChange}
              >
                <option value="">ALL INSTITUTES</option>
                {uniqueInstitutes.map(i => (<option key={i.id} value={i.id}>{i.name}</option>))}
              </select>
            </div>

            {/* NEW: ACADEMIC YEAR FILTER */}
            <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black w-full sm:w-auto">
              <Filter size={16} />
              <select 
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[150px] w-full"
                value={filterYear} onChange={e => setFilterYear(e.target.value)}
              >
                <option value="">ALL ACADEMIC YEARS</option>
                {filterYearsList.map(y => (<option key={y.academic_year_id} value={y.academic_year_id}>{y.name}</option>))}
              </select>
            </div>

          </div>
        </div>

        <div className="border-2 border-black bg-white max-h-[500px] overflow-y-auto">
          {loadingData ? (
             <div className="p-12 text-center font-bold animate-pulse">LOADING DATA...</div>
          ) : filteredSemesters.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-4">Semester</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Year Context</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredSemesters.map((sem, idx) => {
                  const yearInfo = getYearInfo(sem.academic_year_id);
                  const deptInfo = getDeptInfo(sem.department_id);
                  const isParentInactive = !yearInfo.isActive;

                  return (
                    <tr key={sem.semester_id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      
                      <td className="p-4 border-r border-gray-200">
                        <div className="font-black text-base">{sem.name}</div>
                        <span className="text-[10px] font-bold uppercase text-gray-500">{sem.type} Semester</span>
                      </td>

                      <td className="p-4 border-r border-gray-200 text-xs font-mono text-gray-600">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-black">{formatDate(sem.start_date)}</span>
                          <span className="text-[10px] uppercase text-gray-400">to</span>
                          <span className="font-bold text-black">{formatDate(sem.end_date)}</span>
                        </div>
                      </td>

                      <td className="p-4 border-r border-gray-200">
                        <div className="font-bold text-sm">{deptInfo.name}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">{deptInfo.inst}</div>
                      </td>

                      <td className="p-4 border-r border-gray-200 text-xs">
                        <div className="font-bold">{yearInfo.name}</div>
                        {yearInfo.isActive ? (
                             <span className="text-green-600 font-bold text-[10px] uppercase">● Year Active</span>
                        ) : (
                             <span className="text-red-600 font-bold text-[10px] uppercase">● Year Inactive</span>
                        )}
                      </td>

                      <td className="p-4 border-r border-gray-200">
                         {sem.is_active ? (
                            <span className="inline-flex items-center gap-1 bg-black text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide border border-black"><CheckCircle size={10} /> Active</span>
                         ) : (
                            <span className="inline-flex items-center gap-1 bg-white text-gray-400 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide border border-gray-300"><XCircle size={10} /> Inactive</span>
                         )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {/* Status Toggle Button */}
                           <button
                             onClick={() => !isParentInactive && handleToggleClick(sem)}
                             disabled={isParentInactive}
                             title={isParentInactive ? "Cannot activate: Academic Year is inactive" : "Toggle Status"}
                             className={`p-2 border-2 transition-all ${isParentInactive ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed' : sem.is_active ? 'border-black bg-white text-black hover:bg-black hover:text-white' : 'border-black bg-black text-white hover:bg-gray-800'}`}
                           >
                             <Power size={16}/>
                           </button>

                           {/* Edit Button */}
                           <button 
                             onClick={() => handleEditClick(sem)}
                             title="Edit Semester"
                             className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                           >
                             <Edit2 size={16} />
                           </button>

                           {/* Delete Button */}
                           <button 
                             onClick={() => handleDeleteClick(sem)}
                             title="Delete Semester"
                             className="p-2 border-2 border-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">No semesters found matching filters.</div>
          )}
        </div>
      </div>

      {/* =======================
          STATUS CONFIRMATION MODAL 
      ======================== */}
      {showStatusConfirm && targetSem && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className={`flex items-center gap-4 mb-6 border-b-2 border-black pb-4 ${targetSem.is_active ? 'text-red-600' : 'text-green-600'}`}>
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Action</h2>
            </div>
            
            <p className="font-medium text-black mb-8 text-lg">
              Are you sure you want to <b>{targetSem.is_active ? 'DEACTIVATE' : 'ACTIVATE'}</b> this semester?
              <br/><span className="block mt-2 font-black text-xl">{targetSem.name}</span>
            </p>

            <div className="flex gap-4">
              <button onClick={() => { setShowStatusConfirm(false); setTargetSem(null); }} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest" type="button">Cancel</button>
              <button onClick={confirmToggle} type="button" className={`flex-1 py-4 text-white font-bold border-2 border-black transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${targetSem.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}>
                  {targetSem.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {showDeleteConfirm && semToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Deletion</h2>
            </div>
            
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to delete this semester? 
              <br/><br/><span className="text-red-600 font-bold">WARNING:</span> This may permanently delete all classes, subjects, assignments, and student enrollments associated with it!
            </p>

            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{semToDelete.name}</span>
              <span className="block text-xs font-bold text-gray-500 mt-1 uppercase">{semToDelete.type} Semester</span>
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteConfirm(false); setSemToDelete(null); }} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest" type="button">Cancel</button>
              <button onClick={confirmDelete} type="button" className="flex-1 py-4 bg-red-600 text-white font-bold border-2 border-black hover:bg-red-700 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SemesterForm;