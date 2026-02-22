import React, { useState, useMemo } from 'react';
import { createDepartment, updateDepartment, deleteDepartment } from '@/utils/api';
import { Library, Building, Edit2, Trash2, X, Search, AlertTriangle, Filter } from 'lucide-react';

const DepartmentForm = ({ onSuccess, onError, institutes, departments }) => {
  const [name, setName] = useState('');
  const [instituteId, setInstituteId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // States for Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // States for Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstitute, setFilterInstitute] = useState('');

  // States for Delete Modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  // ==============================
  // SEARCH & FILTERING
  // ==============================
  const filteredDepartments = useMemo(() => {
    if (!departments) return [];
    
    let result = departments;

    // Filter by Institute
    if (filterInstitute) {
        result = result.filter(dept => dept.institute_id === filterInstitute);
    }

    // Filter by Name
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(dept => dept.name.toLowerCase().includes(q));
    }

    return result;
  }, [departments, searchQuery, filterInstitute]);

  // ==============================
  // HANDLERS
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await updateDepartment(editId, { name, institute_id: instituteId });
        onSuccess("DEPARTMENT UPDATED");
        cancelEdit();
      } else {
        await createDepartment({ name, institute_id: instituteId });
        onSuccess("DEPARTMENT CREATED");
        setName('');
        setInstituteId('');
      }
    } catch (err) {
      onError(isEditing ? "FAILED TO UPDATE DEPARTMENT" : "FAILED TO CREATE DEPARTMENT");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (dept) => {
    setIsEditing(true);
    setEditId(dept.department_id);
    setName(dept.name);
    setInstituteId(dept.institute_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
    setInstituteId('');
  };

  const handleDeleteClick = (dept) => {
    setDepartmentToDelete(dept);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!departmentToDelete) return;
    try {
      await deleteDepartment(departmentToDelete.department_id);
      onSuccess("DEPARTMENT DELETED");
      if (isEditing && editId === departmentToDelete.department_id) cancelEdit();
    } catch (err) {
      onError("FAILED TO DELETE DEPARTMENT");
    } finally {
      setShowConfirm(false);
      setDepartmentToDelete(null);
    }
  };

  return (
    <div className="space-y-8 relative">
      
      {/* ==========================
          CREATE / EDIT FORM
      ========================== */}
      <form onSubmit={handleSubmit} className={`space-y-6 p-6 border-4 ${isEditing ? 'border-blue-500 bg-blue-50' : 'border-black bg-white'}`}>
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Library size={24} /> 
            {isEditing ? "Edit Department" : "Add New Department"}
          </div>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-black flex items-center gap-1 text-sm">
              <X size={16}/> Cancel
            </button>
          )}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <label className="block text-sm font-bold mb-1">DEPARTMENT NAME</label>
            <input 
                type="text" 
                placeholder="e.g. Computer Engineering" 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
            />
            </div>

            <div>
            <label className="block text-sm font-bold mb-1">PARENT INSTITUTE</label>
            <select 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white appearance-none" 
                value={instituteId} 
                onChange={e => setInstituteId(e.target.value)} 
                required
            >
                <option value="">-- SELECT INSTITUTE --</option>
                {institutes && institutes.map(inst => (
                <option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>
                ))}
            </select>
            </div>
        </div>

        <button disabled={loading} className={`w-full text-white font-bold py-3 transition-colors shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${isEditing ? 'bg-blue-600 hover:bg-blue-800' : 'bg-black hover:bg-gray-800'}`}>
          {loading ? "PROCESSING..." : (isEditing ? "UPDATE DEPARTMENT" : "CREATE DEPARTMENT")}
        </button>
      </form>

      {/* ==========================
          EXISTING DEPARTMENTS LIST
      ========================== */}
      <div className="border-t-2 border-black pt-6">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold uppercase">Existing Departments</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                {/* SEARCH BAR */}
                <div className="relative w-full sm:w-[250px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search department..."
                        className="w-full pl-9 pr-3 py-2 border-2 border-black font-bold outline-none focus:bg-gray-50 text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                        {institutes && institutes.map(inst => (
                            <option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {filteredDepartments.map(dept => (
            <li key={dept.department_id} className={`p-4 border-2 flex justify-between items-center transition-colors ${editId === dept.department_id ? 'border-blue-500 bg-blue-50' : 'border-black bg-white hover:bg-gray-50'}`}>
              
              <div className="flex flex-col">
                <span className="font-bold text-lg">{dept.name}</span>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
                        <Building size={12}/> {dept.institute_name}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">| ID: {dept.department_id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditClick(dept)}
                  title="Edit Department"
                  type="button"
                  className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(dept)}
                  title="Delete Department"
                  type="button"
                  className="p-2 border-2 border-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </li>
          ))}
          {filteredDepartments.length === 0 && (
            <p className="text-gray-500 italic p-4 border-2 border-dashed border-gray-300 text-center font-bold uppercase text-xs">
                {searchQuery || filterInstitute ? "No departments found matching your filters." : "No departments found."}
            </p>
          )}
        </ul>
      </div>

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {showConfirm && departmentToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Deletion</h2>
            </div>
            
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to delete this department? 
              <br/><br/>
              <span className="text-red-600 font-bold">WARNING:</span> This may permanently delete all academic years, classes, and users associated with it!
            </p>

            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{departmentToDelete.name}</span>
              <span className="block text-xs font-bold text-gray-500 mt-1 uppercase">{departmentToDelete.institute_name}</span>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowConfirm(false); setDepartmentToDelete(null); }}
                className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest"
                type="button"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                type="button"
                className="flex-1 py-4 bg-red-600 text-white font-bold border-2 border-black hover:bg-red-700 transition-transform active:translate-y-1 uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentForm;