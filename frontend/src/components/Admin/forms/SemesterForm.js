import React, { useState, useEffect, useMemo } from 'react';
import { createSemester, getDepartments, getSemesters, getYears, updateSemesterStatus } from '@/utils/api';
import { Layers, Building, Globe, ArrowRight, Filter, RefreshCw, Calendar, CheckCircle, XCircle, Power, AlertTriangle, Lock } from 'lucide-react';

const SemesterForm = ({ onSuccess, onError }) => {
  // --- STATE: DATA ---
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [allSemesters, setAllSemesters] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- STATE: CREATE FORM ---
  const [scope, setScope] = useState('GLOBAL'); 
  const [selectedDept, setSelectedDept] = useState('');
  
  const [form, setForm] = useState({ 
    name: '', 
    type: 'ODD', 
    academic_year_id: '',
    department_id: null,
    is_active: false // <--- ALWAYS FALSE ON CREATE
  });
  
  const [submitting, setSubmitting] = useState(false);

  // --- STATE: LIST FILTER ---
  const [filterType, setFilterType] = useState('ALL'); 

  // --- STATE: CONFIRMATION MODAL ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetSem, setTargetSem] = useState(null);

  // ==============================
  // 1. FETCH DATA
  // ==============================
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [deptRes, yearRes, semRes] = await Promise.all([
        getDepartments(),
        getYears(),
        getSemesters()
      ]);
      setDepartments(deptRes);
      setYears(yearRes);
      setAllSemesters(semRes);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ==============================
  // 2. HELPERS
  // ==============================
  const getDeptName = (id) => {
    if (!id) return 'University Wide';
    const d = departments.find(dept => dept.department_id === id);
    return d ? d.name : 'Unknown Dept';
  };

  const getYearInfo = (yearId) => {
    const year = years.find(y => y.academic_year_id === yearId);
    if (!year) return { name: 'Unknown Year', isActive: false };
    return { name: year.name, isActive: year.is_active };
  };

  // ==============================
  // 3. FILTERS
  // ==============================
  const formYears = useMemo(() => {
    if (scope === 'GLOBAL') return years.filter(y => !y.department_id);
    return years.filter(y => y.department_id === selectedDept);
  }, [years, scope, selectedDept]);

  const filteredSemesters = useMemo(() => {
    if (filterType === 'ALL') return allSemesters;
    if (filterType === 'GLOBAL') return allSemesters.filter(s => !s.department_id);
    return allSemesters.filter(s => s.department_id === filterType);
  }, [allSemesters, filterType]);

  // ==============================
  // 4. HANDLERS
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
        ...form,
        is_active: false, // FORCE FALSE
        department_id: scope === 'GLOBAL' ? null : selectedDept
    };

    try {
      await createSemester(payload);
      onSuccess("SEMESTER CREATED (INACTIVE)");
      // Reset form
      setForm(prev => ({ ...prev, name: '', academic_year_id: '', is_active: false })); 
      fetchData(); 
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO CREATE SEMESTER");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Click
  const handleToggleClick = (sem) => {
    setTargetSem(sem);
    setShowConfirm(true);
  };

  // Confirm Status Update
  const confirmToggle = async () => {
    if (!targetSem) return;
    const newStatus = !targetSem.is_active;
    
    try {
      await updateSemesterStatus(targetSem.semester_id, newStatus);
      onSuccess(`SEMESTER ${newStatus ? 'ACTIVATED' : 'DEACTIVATED'}`);
      fetchData();
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO UPDATE STATUS");
    } finally {
      setShowConfirm(false);
      setTargetSem(null);
    }
  };

  return (
    <div className="space-y-12 relative">
      
      {/* ==========================
          SECTION A: CREATE FORM
      ========================== */}
      <form onSubmit={handleSubmit} className="space-y-6 border-b-4 border-black pb-10">
        <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2 flex items-center gap-2">
          <Layers className="w-6 h-6" /> Add New Semester
        </h3>

        {/* Scope Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => { setScope('GLOBAL'); setSelectedDept(''); setForm({...form, academic_year_id: ''}); }}
            className={`cursor-pointer border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all select-none
              ${scope === 'GLOBAL' ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-400 hover:border-black hover:text-black'}`}
          >
            <Globe size={24} />
            <span className="font-bold text-xs uppercase tracking-wider">University Wide</span>
          </div>
          <div 
            onClick={() => { setScope('DEPT'); setForm({...form, academic_year_id: ''}); }}
            className={`cursor-pointer border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all select-none
              ${scope === 'DEPT' ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-400 hover:border-black hover:text-black'}`}
          >
            <Building size={24} />
            <span className="font-bold text-xs uppercase tracking-wider">Department Specific</span>
          </div>
        </div>

        {/* Department Dropdown */}
        {scope === 'DEPT' && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Select Department</label>
            <div className="relative">
              <select 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white appearance-none rounded-none" 
                value={selectedDept}
                onChange={e => { setSelectedDept(e.target.value); setForm({...form, academic_year_id: ''}); }} 
                required={scope === 'DEPT'}
              >
                <option value="">-- CHOOSE DEPARTMENT --</option>
                {departments.map(d => (<option key={d.department_id} value={d.department_id}>{d.name}</option>))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none"><ArrowRight size={16} /></div>
            </div>
          </div>
        )}

        {/* Academic Year Selection */}
        <div>
          <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Academic Year</label>
          <div className="relative">
              <select 
                className={`w-full p-3 border-2 border-black outline-none font-bold bg-white rounded-none
                  ${(scope === 'DEPT' && !selectedDept) ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'focus:bg-gray-50'}`} 
                value={form.academic_year_id}
                onChange={e => setForm({...form, academic_year_id: e.target.value})} 
                required
                disabled={scope === 'DEPT' && !selectedDept}
              >
                <option value="">{scope === 'DEPT' && !selectedDept ? "-- SELECT DEPT FIRST --" : "-- SELECT ACADEMIC YEAR --"}</option>
                {formYears.map(y => (
                    <option key={y.academic_year_id} value={y.academic_year_id}>
                      {y.name} {y.is_active ? '(Active)' : '(Inactive)'}
                    </option>
                ))}
              </select>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Semester Name</label>
            <input type="text" placeholder="e.g. Semester 1" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold rounded-none" 
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Type</label>
            <select className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold rounded-none" 
              value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="ODD">ODD</option>
              <option value="EVEN">EVEN</option>
            </select>
          </div>
        </div>

        <button disabled={submitting} className="w-full bg-black text-white font-black uppercase tracking-widest py-4 hover:bg-gray-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50">
          {submitting ? "PROCESSING..." : "CREATE SEMESTER (DEFAULT INACTIVE)"}
        </button>
      </form>

      {/* ==========================
          SECTION B: VIEW / LIST
      ========================== */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <RefreshCw size={20} className={`cursor-pointer hover:rotate-180 transition-transform ${loadingData ? 'animate-spin' : ''}`} onClick={fetchData}/>
            Existing Semesters
          </h3>
          
          {/* FILTER TOOLBAR */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black">
            <Filter size={16} />
            <select 
              className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[150px]"
              value={filterType} onChange={e => setFilterType(e.target.value)}
            >
              <option value="ALL">SHOW ALL</option>
              <option value="GLOBAL">UNIVERSITY WIDE</option>
              <optgroup label="Specific Departments">
                {departments.map(d => (<option key={d.department_id} value={d.department_id}>{d.name}</option>))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="border-2 border-black bg-white max-h-[500px] overflow-y-auto">
          {loadingData ? (
             <div className="p-12 text-center font-bold animate-pulse">LOADING DATA...</div>
          ) : filteredSemesters.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-3">Semester</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Year Status</th>
                  <th className="p-3">Department</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredSemesters.map((sem, idx) => {
                  const yearInfo = getYearInfo(sem.academic_year_id);
                  const isParentInactive = !yearInfo.isActive;

                  return (
                    <tr key={sem.semester_id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      
                      {/* Name + Type */}
                      <td className="p-3 border-r border-gray-200">
                        <div className="font-black text-base">{sem.name}</div>
                        <span className="text-[10px] font-bold uppercase text-gray-500">{sem.type} Semester</span>
                      </td>

                      {/* Semester Status */}
                      <td className="p-3 border-r border-gray-200">
                         {sem.is_active ? (
                            <span className="inline-flex items-center gap-1 bg-black text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide border border-black">
                                <CheckCircle size={10} /> Active
                            </span>
                         ) : (
                            <span className="inline-flex items-center gap-1 bg-white text-gray-400 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide border border-gray-300">
                                <XCircle size={10} /> Inactive
                            </span>
                         )}
                      </td>

                      {/* Year Status (Context) */}
                      <td className="p-3 border-r border-gray-200 text-xs">
                        <div className="font-bold">{yearInfo.name}</div>
                        {yearInfo.isActive ? (
                             <span className="text-green-600 font-bold text-[10px] uppercase">● Year Active</span>
                        ) : (
                             <span className="text-red-600 font-bold text-[10px] uppercase">● Year Inactive</span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="p-3 font-mono text-xs uppercase text-gray-600 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          {sem.department_id ? <Building size={14}/> : <Globe size={14}/>}
                          {getDeptName(sem.department_id)}
                        </div>
                      </td>

                      {/* Actions (Toggle) */}
                      <td className="p-3 text-right">
                         <button
                           onClick={() => !isParentInactive && handleToggleClick(sem)}
                           disabled={isParentInactive}
                           title={isParentInactive ? "Cannot activate: Academic Year is inactive" : "Toggle Status"}
                           className={`inline-flex items-center gap-2 px-3 py-2 border-2 font-bold text-xs uppercase transition-all
                             ${isParentInactive 
                                ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed' 
                                : sem.is_active 
                                   ? 'border-black bg-white text-black hover:bg-black hover:text-white' 
                                   : 'border-black bg-black text-white hover:bg-gray-800'
                             }`}
                         >
                           {isParentInactive ? <Lock size={14}/> : <Power size={14}/>}
                           {isParentInactive ? 'LOCKED' : (sem.is_active ? 'DEACTIVATE' : 'ACTIVATE')}
                         </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">No semesters found.</div>
          )}
        </div>
      </div>

      {/* =======================
          CONFIRMATION MODAL 
      ======================== */}
      {showConfirm && targetSem && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-black border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase">Confirm Action</h2>
            </div>
            
            <p className="font-medium text-black mb-8 text-lg">
              Are you sure you want to <b>{targetSem.is_active ? 'DEACTIVATE' : 'ACTIVATE'}</b> this semester?
              <br/>
              <span className="block mt-2 font-black text-xl">{targetSem.name}</span>
            </p>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowConfirm(false); setTargetSem(null); }}
                className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={confirmToggle}
                className="flex-1 py-4 bg-black text-white font-bold border-2 border-black hover:bg-gray-800 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SemesterForm;