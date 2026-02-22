import React, { useState, useEffect, useMemo } from 'react';
import { createYear, getYears, getDepartments, getInstitutes, updateYearStatus, updateYear, deleteYear } from '@/utils/api';
import { Calendar, RefreshCw, Power, CheckCircle, XCircle, Filter, Search, AlertTriangle, Edit2, Trash2, X } from 'lucide-react';

const AcademicYearForm = ({ onSuccess, onError }) => {
  const [years, setYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [form, setForm] = useState({ 
    name: '', 
    start_date: '', 
    end_date: '', 
    department_id: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  
  // States for Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // Filter & Search State
  const [filterInstitute, setFilterInstitute] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); 
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [yearToToggle, setYearToToggle] = useState(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [yearToDelete, setYearToDelete] = useState(null);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [yearRes, deptRes, instRes] = await Promise.all([
        getYears(),
        getDepartments(),
        getInstitutes()
      ]);
      setYears(yearRes || []);
      setDepartments(deptRes || []);
      setInstitutes(instRes || []);
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const formDepartments = departments; 

  const filteredYears = useMemo(() => {
    let result = years;

    if (filterInstitute) {
        result = result.filter(y => {
            const dept = departments.find(d => d.department_id === y.department_id);
            return dept && dept.institute_id === filterInstitute;
        });
    }

    if (filterStatus !== 'ALL') {
        const isActive = filterStatus === 'ACTIVE';
        result = result.filter(y => y.is_active === isActive);
    }

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(y => y.name.toLowerCase().includes(q) || (y.department_name && y.department_name.toLowerCase().includes(q)));
    }

    return result;
  }, [years, departments, filterInstitute, filterStatus, searchQuery]);

  // ==============================
  // HANDLERS
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new Date(form.start_date) > new Date(form.end_date)) {
        return onError("End date cannot be before start date!");
    }
    setSubmitting(true);
    try {
      if (isEditing) {
        await updateYear(editId, form);
        onSuccess("ACADEMIC YEAR UPDATED");
        cancelEdit();
      } else {
        await createYear(form);
        onSuccess("ACADEMIC YEAR CREATED (ACTIVE)");
        setForm({ name: '', start_date: '', end_date: '', department_id: '' });
      }
      fetchData();
    } catch (err) {
      onError(err.response?.data?.error || (isEditing ? "FAILED TO UPDATE YEAR" : "FAILED TO CREATE YEAR"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (year) => {
    setIsEditing(true);
    setEditId(year.academic_year_id);
    setForm({
      name: year.name,
      start_date: new Date(year.start_date).toISOString().split('T')[0],
      end_date: new Date(year.end_date).toISOString().split('T')[0],
      department_id: year.department_id
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ name: '', start_date: '', end_date: '', department_id: '' });
  };

  // Status Toggle Handlers
  const handleToggleClick = (year) => {
    setYearToToggle(year);
    setShowStatusConfirm(true);
  };

  const confirmToggle = async () => {
    if (!yearToToggle) return;
    try {
      await updateYearStatus(yearToToggle.academic_year_id, !yearToToggle.is_active);
      onSuccess(`YEAR ${!yearToToggle.is_active ? 'ACTIVATED' : 'DEACTIVATED'}`);
      fetchData();
    } catch (err) {
      onError("FAILED TO UPDATE STATUS");
    } finally {
      setShowStatusConfirm(false);
      setYearToToggle(null);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (year) => {
    setYearToDelete(year);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!yearToDelete) return;
    try {
      await deleteYear(yearToDelete.academic_year_id);
      onSuccess("ACADEMIC YEAR DELETED");
      if (isEditing && editId === yearToDelete.academic_year_id) cancelEdit();
      fetchData();
    } catch (err) {
      onError("FAILED TO DELETE YEAR");
    } finally {
      setShowDeleteConfirm(false);
      setYearToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-10 relative">
      
      {/* ==========================
          CREATE / EDIT FORM
      ========================== */}
      <form onSubmit={handleSubmit} className={`space-y-6 p-6 border-4 ${isEditing ? 'border-blue-500 bg-blue-50' : 'border-black bg-white'} pb-10`}>
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={24} /> 
            {isEditing ? "Edit Academic Year" : "Add New Academic Year"}
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
              onChange={e => setForm({...form, department_id: e.target.value})} 
              required
            >
              <option value="">-- SELECT DEPARTMENT --</option>
              {formDepartments.map(d => (
                <option key={d.department_id} value={d.department_id}>{d.institute_name} - {d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Academic Year Name</label>
            <input 
              type="text" 
              placeholder="e.g. 2024-2025" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14}/> Start Date (MANDATORY)
            </label>
            <input 
              type="date" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
              value={form.start_date} 
              onChange={e => setForm({...form, start_date: e.target.value})} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14}/> End Date (MANDATORY)
            </label>
            <input 
              type="date" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
              value={form.end_date} 
              onChange={e => setForm({...form, end_date: e.target.value})} 
              required 
            />
          </div>
        </div>

        <button disabled={submitting} className={`mt-8 w-full text-white font-black uppercase tracking-widest py-4 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50 ${isEditing ? 'bg-blue-600 hover:bg-blue-800' : 'bg-black hover:bg-gray-800'}`}>
          {submitting ? "PROCESSING..." : (isEditing ? "UPDATE ACADEMIC YEAR" : "CREATE ACADEMIC YEAR")}
        </button>
      </form>

      {/* ==========================
          EXISTING YEARS LIST
      ========================== */}
      <div>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 w-full xl:w-auto">
            <RefreshCw size={20} className={`cursor-pointer hover:rotate-180 transition-transform ${loadingData ? 'animate-spin' : ''}`} onClick={fetchData}/>
            Existing Academic Years
          </h3>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text" placeholder="Search name/dept..."
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
                className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[150px] w-full"
                value={filterInstitute} onChange={e => setFilterInstitute(e.target.value)}
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
          ) : filteredYears.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4">Academic Year</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredYears.map((year, idx) => (
                    <tr key={year.academic_year_id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      
                      <td className="p-4 border-r border-gray-200">
                        <div className="font-black text-base">{year.name}</div>
                      </td>

                      <td className="p-4 border-r border-gray-200 text-xs font-mono text-gray-600">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-black">{formatDate(year.start_date)}</span>
                          <span className="text-[10px] uppercase text-gray-400">to</span>
                          <span className="font-bold text-black">{formatDate(year.end_date)}</span>
                        </div>
                      </td>

                      <td className="p-4 border-r border-gray-200">
                        <div className="font-bold text-sm">{year.department_name}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-500 mt-1">{year.institute_name}</div>
                      </td>

                      <td className="p-4 border-r border-gray-200">
                         {year.is_active ? (
                            <span className="inline-flex items-center gap-1 bg-black text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide border border-black"><CheckCircle size={10} /> Active</span>
                         ) : (
                            <span className="inline-flex items-center gap-1 bg-white text-gray-400 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wide border border-gray-300"><XCircle size={10} /> Inactive</span>
                         )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {/* Status Toggle Button */}
                           <button
                             onClick={() => handleToggleClick(year)}
                             title="Toggle Status"
                             className={`p-2 border-2 transition-all ${year.is_active ? 'border-black bg-white text-black hover:bg-black hover:text-white' : 'border-black bg-black text-white hover:bg-gray-800'}`}
                           >
                             <Power size={16}/>
                           </button>

                           {/* Edit Button */}
                           <button 
                             onClick={() => handleEditClick(year)}
                             title="Edit Year"
                             className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                           >
                             <Edit2 size={16} />
                           </button>

                           {/* Delete Button */}
                           <button 
                             onClick={() => handleDeleteClick(year)}
                             title="Delete Year"
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
            <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">
                {searchQuery || filterInstitute || filterStatus !== 'ALL' ? "No academic years found matching filters." : "No academic years found."}
            </div>
          )}
        </div>
      </div>

      {/* =======================
          TOGGLE STATUS MODAL 
      ======================== */}
      {showStatusConfirm && yearToToggle && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className={`flex items-center gap-4 mb-6 border-b-2 border-black pb-4 ${yearToToggle.is_active ? 'text-red-600' : 'text-green-600'}`}>
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Action</h2>
            </div>
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to <b>{yearToToggle.is_active ? 'DEACTIVATE' : 'ACTIVATE'}</b> this academic year?
              {yearToToggle.is_active && (
                 <><br/><br/><span className="text-red-600 font-bold">WARNING:</span> Deactivating this year will automatically deactivate all semesters associated with it!</>
              )}
            </p>
            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{yearToToggle.name}</span>
              <span className="block text-xs font-bold text-gray-500 mt-1 uppercase">{yearToToggle.department_name}</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowStatusConfirm(false); setYearToToggle(null); }} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest" type="button">Cancel</button>
              <button onClick={confirmToggle} type="button" className={`flex-1 py-4 text-white font-bold border-2 border-black transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${yearToToggle.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}>
                {yearToToggle.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {showDeleteConfirm && yearToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Deletion</h2>
            </div>
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to delete this academic year? 
              <br/><br/><span className="text-red-600 font-bold">WARNING:</span> This may permanently delete all semesters, classes, and data associated with it!
            </p>
            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{yearToDelete.name}</span>
              <span className="block text-xs font-bold text-gray-500 mt-1 uppercase">{yearToDelete.department_name}</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteConfirm(false); setYearToDelete(null); }} className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest" type="button">Cancel</button>
              <button onClick={confirmDelete} type="button" className="flex-1 py-4 bg-red-600 text-white font-bold border-2 border-black hover:bg-red-700 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AcademicYearForm;