import React, { useState, useEffect } from 'react';
import { createYear, getDepartments, updateYearStatus } from '@/utils/api'; 
import { AlertTriangle, Check, Calendar, ArrowRight, Loader2, Power } from 'lucide-react';

const AcademicYearForm = ({ onSuccess, onError, years, departments: propDepartments }) => {
  const [form, setForm] = useState({ 
    name: '', 
    start_date: '', 
    end_date: '', 
    department_id: '',
    is_active: false 
  });
  
  const [showConfirm, setShowConfirm] = useState(false);
  
  // confirmAction can be: 'CREATE', 'ACTIVATE', 'DEACTIVATE'
  const [confirmAction, setConfirmAction] = useState(null); 
  
  const [targetYear, setTargetYear] = useState(null); 
  const [loading, setLoading] = useState(false);
  
  const [localDepartments, setLocalDepartments] = useState([]);

  useEffect(() => {
    if (!propDepartments || propDepartments.length === 0) {
      const fetchDepts = async () => {
        try {
          const data = await getDepartments();
          setLocalDepartments(data);
        } catch (err) { console.error(err); }
      };
      fetchDepts();
    } else {
      setLocalDepartments(propDepartments);
    }
  }, [propDepartments]);

  const getDeptName = (id) => {
    if (!id) return 'UNIVERSITY WIDE';
    const dept = localDepartments?.find(d => d.department_id === id);
    return dept ? dept.name : 'Unknown Dept';
  };

  // --- HANDLERS ---

  // 1. Handle Create Form Submit
  const handleCreatePreSubmit = (e) => {
    e.preventDefault();
    if (form.is_active) {
      setConfirmAction('CREATE');
      setShowConfirm(true); 
    } else {
      submitCreateData(); 
    }
  };

  const submitCreateData = async () => {
    setLoading(true);
    try {
      await createYear(form); 
      onSuccess("ACADEMIC YEAR CREATED");
      setForm({ name: '', start_date: '', end_date: '', department_id: '', is_active: false });
      setShowConfirm(false);
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO CREATE YEAR");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Status Toggle (Activate OR Deactivate)
  const handleToggleStatus = (year) => {
    setTargetYear(year);
    setShowConfirm(true);

    if (year.is_active) {
      setConfirmAction('DEACTIVATE');
    } else {
      setConfirmAction('ACTIVATE');
    }
  };

  const submitUpdateStatus = async (id, status) => {
    setLoading(true);
    try {
      await updateYearStatus(id, status);
      onSuccess(`YEAR ${status ? 'ACTIVATED' : 'DEACTIVATED'}`);
      setShowConfirm(false);
      setTargetYear(null);
    } catch (err) {
      onError("FAILED TO UPDATE STATUS");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = () => {
    if (confirmAction === 'CREATE') {
      submitCreateData();
    } else if (confirmAction === 'ACTIVATE') {
      submitUpdateStatus(targetYear.academic_year_id, true);
    } else if (confirmAction === 'DEACTIVATE') {
      submitUpdateStatus(targetYear.academic_year_id, false);
    }
  };

  return (
    <div className="space-y-8 relative">
      
      {/* =======================
          CREATE FORM 
      ======================== */}
      <form onSubmit={handleCreatePreSubmit} className="space-y-6">
        <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2 flex items-center gap-2">
          <Calendar className="w-6 h-6" /> Create Academic Year
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Department Scope</label>
            <div className="relative">
              <select 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white appearance-none rounded-none"
                value={form.department_id}
                onChange={e => setForm({...form, department_id: e.target.value})}
              >
                <option value="">-- GLOBAL / UNIVERSITY WIDE --</option>
                {localDepartments.map(d => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name} ({d.institute_name})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none">
                {localDepartments.length === 0 ? <Loader2 className="animate-spin w-4 h-4" /> : <ArrowRight size={16} />}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase">
              * Select 'Global' if this year applies to all departments.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Year Name</label>
            <input 
              type="text" 
              placeholder="e.g. 2025-2026" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold rounded-none placeholder:font-normal" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              required 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Start Date</label>
            <input type="date" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-mono rounded-none" 
              value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required />
          </div>
          
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">End Date</label>
            <input type="date" className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-mono rounded-none" 
              value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required />
          </div>

          <div 
            className={`md:col-span-2 flex items-center gap-4 p-4 border-2 border-black cursor-pointer transition-all select-none
              ${form.is_active ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
            onClick={() => setForm({...form, is_active: !form.is_active})}
          >
            <div className={`w-6 h-6 border-2 flex items-center justify-center transition-colors
              ${form.is_active ? 'border-white bg-white' : 'border-black bg-white'}`}>
               {form.is_active && <Check size={16} className="text-black" strokeWidth={4} />}
            </div>
            <div>
              <span className="font-bold block uppercase tracking-wide">Set as Active Year</span>
              <span className={`text-xs font-mono block ${form.is_active ? 'text-gray-300' : 'text-gray-500'}`}>
                Check this to make it the current year immediately.
              </span>
            </div>
          </div>
        </div>

        <button disabled={loading} className="w-full bg-black text-white font-black uppercase tracking-widest py-4 hover:bg-gray-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50">
          {loading ? "PROCESSING..." : "CREATE ACADEMIC YEAR"}
        </button>
      </form>

      {/* =======================
          EXISTING YEARS LIST 
      ======================== */}
      <div className="border-t-4 border-black pt-8 mt-8">
        <h3 className="text-lg font-black uppercase mb-4 tracking-tighter">Existing Academic Years</h3>
        {years && years.length > 0 ? (
          <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {years.map(y => (
              <li key={y.academic_year_id} className="p-4 border-2 border-black flex justify-between items-center bg-white shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg">{y.name}</span>
                    {y.is_active && (
                       <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">Current</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-bold uppercase mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    {getDeptName(y.department_id)}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleToggleStatus(y)}
                    className={`flex items-center gap-2 px-3 py-1.5 border-2 border-black font-bold text-xs uppercase transition-all
                      ${y.is_active 
                        ? 'bg-black text-white hover:bg-gray-800' 
                        : 'bg-white text-gray-400 hover:text-black hover:bg-gray-50'}`}
                  >
                    <Power size={14} />
                    {y.is_active ? 'Active' : 'Activate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-gray-300">
            <p className="text-gray-400 font-bold">NO YEARS FOUND</p>
          </div>
        )}
      </div>

      {/* =======================
          CONFIRMATION MODAL 
      ======================== */}
      {showConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8 relative">
            
            <div className="flex items-center gap-4 mb-6 text-black border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Warning</h2>
            </div>
            
            <div className="font-medium text-black mb-8 space-y-4">
              <p>
                You are about to <span className="font-black">{confirmAction}</span> the year: <br/>
                <span className="text-xl font-black">{confirmAction === 'CREATE' ? form.name : targetYear?.name}</span>
              </p>
              
              <div className="bg-gray-100 p-4 border-l-4 border-black text-sm">
                <p className="font-bold">CONSEQUENCE:</p>
                
                {confirmAction === 'DEACTIVATE' ? (
                  <p>
                    This will leave the following scope <b>WITHOUT</b> an active academic year. Users may not be able to access current semester data.
                  </p>
                ) : (
                  <p>This will automatically <b>DEACTIVATE</b> the current active year for:</p>
                )}
                
                <p className="font-mono mt-1 underline decoration-2">
                   {confirmAction === 'CREATE' 
                     ? (form.department_id ? getDeptName(form.department_id) : 'THE ENTIRE UNIVERSITY')
                     : (targetYear?.department_id ? getDeptName(targetYear.department_id) : 'THE ENTIRE UNIVERSITY')
                   }
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowConfirm(false); setTargetYear(null); }}
                className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmClick}
                disabled={loading}
                className="flex-1 py-4 bg-black text-white font-bold border-2 border-black hover:bg-gray-800 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {loading ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AcademicYearForm;