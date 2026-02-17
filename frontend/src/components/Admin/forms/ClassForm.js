import React, { useState, useEffect, useMemo } from 'react';
import { createClass, getDepartments, getYears, getSemesters, getClasses } from '@/utils/api';
import { GraduationCap, ArrowRight, Building, Calendar, Layers, RefreshCw, Filter } from 'lucide-react';

const ClassForm = ({ onSuccess, onError }) => {
  // --- STATE: DATA ---
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [existingClasses, setExistingClasses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- STATE: CREATE FORM ---
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [className, setClassName] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  // --- STATE: LIST FILTERS ---
  const [filterDept, setFilterDept] = useState('ALL'); // 'ALL' or Dept UUID
  const [filterYear, setFilterYear] = useState('ALL'); // 'ALL' or Year UUID

  // ==============================
  // 1. FETCH ALL DATA
  // ==============================
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [deptRes, yearRes, semRes, classRes] = await Promise.all([
        getDepartments(),
        getYears(),
        getSemesters(),
        getClasses()
      ]);
      setDepartments(deptRes);
      setYears(yearRes);
      setSemesters(semRes);
      setExistingClasses(classRes);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ==============================
  // 2. CREATE FORM FILTERING LOGIC
  // ==============================

  // Step A: Filter Years for Create Form
  const createFormYears = useMemo(() => {
    if (!selectedDept) return [];
    // Show years specifically for this dept OR global years
    return years.filter(y => y.department_id === selectedDept || !y.department_id);
  }, [years, selectedDept]);

  // Step B: Filter Semesters for Create Form
  const createFormSemesters = useMemo(() => {
    if (!selectedYear) return [];
    return semesters.filter(s => s.academic_year_id === selectedYear);
  }, [semesters, selectedYear]);


  // ==============================
  // 3. LIST VIEW FILTERING LOGIC
  // ==============================

  // Filter A: Get Years valid for the selected List Filter Department
  const listFilterYears = useMemo(() => {
    if (filterDept === 'ALL') return [];
    // Show years for selected filter dept OR global years
    return years.filter(y => y.department_id === filterDept || !y.department_id);
  }, [years, filterDept]);

  // Filter B: Drill down the classes
  const filteredClassesList = useMemo(() => {
    let list = existingClasses;

    // 1. Filter by Department
    if (filterDept !== 'ALL') {
      list = list.filter(c => c.department_id === filterDept);
    }

    // 2. Filter by Academic Year (Only if Dept is selected and Year is not ALL)
    if (filterDept !== 'ALL' && filterYear !== 'ALL') {
      // Classes don't have academic_year_id directly, they have semester_id.
      // We must find which semester belongs to the selected year.
      const validSemesterIds = semesters
        .filter(s => s.academic_year_id === filterYear)
        .map(s => s.semester_id);
      
      list = list.filter(c => validSemesterIds.includes(c.semester_id));
    }

    return list;
  }, [existingClasses, filterDept, filterYear, semesters]);


  // ==============================
  // 4. HANDLERS
  // ==============================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: className,
      department_id: selectedDept, 
      semester_id: selectedSem
    };

    try {
      await createClass(payload);
      onSuccess("CLASS CREATED SUCCESSFULLY");
      setClassName(''); // Reset name only
      fetchData();      // Refresh list
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO CREATE CLASS");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get names for display
  const getDeptName = (id) => {
    const d = departments.find(d => d.department_id === id);
    return d ? d.name : 'Unknown Dept';
  };
  
  const getSemName = (id) => {
    const s = semesters.find(s => s.semester_id === id);
    if (!s) return '...';
    return `${s.name} (${s.is_active ? 'Active' : 'Inactive'})`;
  };

  return (
    <div className="space-y-12">
      
      {/* ==========================
          CREATE FORM
      ========================== */}
      <form onSubmit={handleSubmit} className="space-y-6 border-b-4 border-black pb-10">
        <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2 flex items-center gap-2">
          <GraduationCap className="w-6 h-6" /> Create New Class
        </h3>

        <div className="grid grid-cols-1 gap-6">
          
          {/* 1. SELECT DEPARTMENT (Always First) */}
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
              <Building size={12}/> Select Department
            </label>
            <div className="relative">
              <select 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white appearance-none rounded-none" 
                value={selectedDept}
                onChange={e => { 
                  setSelectedDept(e.target.value); 
                  setSelectedYear(''); 
                  setSelectedSem(''); 
                }} 
                required
              >
                <option value="">-- CHOOSE DEPARTMENT --</option>
                {departments.map(d => (
                  <option key={d.department_id} value={d.department_id}>{d.name} ({d.institute_name})</option>
                ))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none"><ArrowRight size={16} /></div>
            </div>
          </div>

          {/* 2. SELECT ACADEMIC YEAR */}
          <div className={`transition-opacity duration-300 ${!selectedDept ? 'opacity-50' : 'opacity-100'}`}>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={12}/> Select Academic Year
            </label>
            <div className="relative">
              <select 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white appearance-none rounded-none" 
                value={selectedYear}
                onChange={e => { 
                  setSelectedYear(e.target.value); 
                  setSelectedSem(''); 
                }} 
                required
                disabled={!selectedDept}
              >
                <option value="">
                  {!selectedDept ? "-- SELECT DEPT FIRST --" : "-- CHOOSE ACADEMIC YEAR --"}
                </option>
                {createFormYears.map(y => (
                  <option key={y.academic_year_id} value={y.academic_year_id}>
                    {y.name} {y.is_active ? '(Active)' : '(Inactive)'}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none"><ArrowRight size={16} /></div>
            </div>
          </div>

          {/* 3. SELECT SEMESTER */}
          <div className={`transition-opacity duration-300 ${!selectedYear ? 'opacity-50' : 'opacity-100'}`}>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
              <Layers size={12}/> Select Semester
            </label>
            <div className="relative">
              <select 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white appearance-none rounded-none" 
                value={selectedSem}
                onChange={e => setSelectedSem(e.target.value)} 
                required
                disabled={!selectedYear}
              >
                <option value="">
                  {!selectedYear ? "-- SELECT YEAR FIRST --" : "-- CHOOSE SEMESTER --"}
                </option>
                {createFormSemesters.map(s => (
                  <option key={s.semester_id} value={s.semester_id}>
                    {s.name} ({s.type}) - {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none"><ArrowRight size={16} /></div>
            </div>
          </div>

          {/* 4. CLASS NAME */}
          <div className={`transition-opacity duration-300 ${!selectedSem ? 'opacity-50' : 'opacity-100'}`}>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Class Name</label>
            <input 
              type="text" 
              placeholder="e.g. Computer Engineering - Div A" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold rounded-none" 
              value={className} 
              onChange={e => setClassName(e.target.value)} 
              required 
              disabled={!selectedSem}
            />
          </div>

        </div>

        <button 
          disabled={submitting || !selectedSem} 
          className="w-full bg-black text-white font-black uppercase tracking-widest py-4 hover:bg-gray-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "PROCESSING..." : "CREATE CLASS"}
        </button>
      </form>

      {/* ==========================
          EXISTING CLASSES LIST
      ========================== */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <RefreshCw size={20} className={`cursor-pointer hover:rotate-180 transition-transform ${loadingData ? 'animate-spin' : ''}`} onClick={fetchData}/>
            Existing Classes
          </h3>

          {/* CASCADING FILTER TOOLBAR */}
          <div className="flex items-center gap-4 bg-gray-100 p-2 border-2 border-black">
            <Filter size={16} />
            
            {/* 1. Department Filter */}
            <div className="relative">
              <span className="text-[10px] font-bold uppercase text-gray-500 absolute -top-2 left-0">Department</span>
              <select 
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-black transition-colors min-w-[150px]"
                value={filterDept} 
                onChange={e => { setFilterDept(e.target.value); setFilterYear('ALL'); }}
              >
                <option value="ALL">ALL DEPARTMENTS</option>
                {departments.map(d => (<option key={d.department_id} value={d.department_id}>{d.name}</option>))}
              </select>
            </div>

            {/* 2. Academic Year Filter (Conditional) */}
            {filterDept !== 'ALL' && (
              <div className="relative animate-in fade-in slide-in-from-left-2">
                 <span className="text-[10px] font-bold uppercase text-gray-500 absolute -top-2 left-0">Academic Year</span>
                 <select 
                  className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-black transition-colors min-w-[150px]"
                  value={filterYear} 
                  onChange={e => setFilterYear(e.target.value)}
                >
                  <option value="ALL">ALL YEARS</option>
                  {listFilterYears.map(y => (
                    <option key={y.academic_year_id} value={y.academic_year_id}>
                      {y.name} {y.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="border-2 border-black bg-white max-h-[400px] overflow-y-auto">
          {loadingData ? (
             <div className="p-12 text-center font-bold animate-pulse">LOADING DATA...</div>
          ) : filteredClassesList.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-3">Class Name</th>
                  <th className="p-3">Semester</th>
                  <th className="p-3">Department</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredClassesList.map((cls, idx) => (
                  <tr key={cls.class_id} className={`border-b border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-3 font-black border-r border-gray-200">{cls.name}</td>
                    <td className="p-3 border-r border-gray-200 text-xs font-bold text-gray-600">
                      {getSemName(cls.semester_id)}
                    </td>
                    <td className="p-3 border-r border-gray-200 text-xs font-mono uppercase text-gray-500">
                      <div className="flex items-center gap-2">
                        <Building size={14}/>
                        {getDeptName(cls.department_id)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">
              No classes found for this filter.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ClassForm;