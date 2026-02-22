import React, { useState, useMemo } from 'react';
import { createInstitute, updateInstitute, deleteInstitute } from '@/utils/api';
import { Building, Edit2, Trash2, X, Search, AlertTriangle } from 'lucide-react';

const InstituteForm = ({ onSuccess, onError, institutes }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // States for Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // States for Search
  const [searchQuery, setSearchQuery] = useState('');

  // States for Delete Modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [instituteToDelete, setInstituteToDelete] = useState(null);

  // ==============================
  // SEARCH FILTERING
  // ==============================
  const filteredInstitutes = useMemo(() => {
    if (!institutes) return [];
    if (!searchQuery.trim()) return institutes;
    
    const q = searchQuery.toLowerCase().trim();
    return institutes.filter(inst => inst.name.toLowerCase().includes(q));
  }, [institutes, searchQuery]);

  // ==============================
  // HANDLERS
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await updateInstitute(editId, { name });
        onSuccess("INSTITUTE UPDATED");
        cancelEdit();
      } else {
        await createInstitute({ name });
        onSuccess("INSTITUTE CREATED");
        setName('');
      }
    } catch (err) {
      onError(isEditing ? "FAILED TO UPDATE INSTITUTE" : "FAILED TO CREATE INSTITUTE");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (inst) => {
    setIsEditing(true);
    setEditId(inst.institute_id);
    setName(inst.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setName('');
  };

  const handleDeleteClick = (inst) => {
    setInstituteToDelete(inst);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!instituteToDelete) return;
    try {
      await deleteInstitute(instituteToDelete.institute_id);
      onSuccess("INSTITUTE DELETED");
      if (isEditing && editId === instituteToDelete.institute_id) cancelEdit();
    } catch (err) {
      onError("FAILED TO DELETE INSTITUTE");
    } finally {
      setShowConfirm(false);
      setInstituteToDelete(null);
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
            <Building size={24} /> 
            {isEditing ? "Edit Institute" : "Add New Institute"}
          </div>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-black flex items-center gap-1 text-sm">
              <X size={16}/> Cancel
            </button>
          )}
        </h3>
        
        <div>
          <label className="block text-sm font-bold mb-1">INSTITUTE NAME</label>
          <input 
            type="text" 
            placeholder="e.g. UVPCE" 
            className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
        </div>

        <button disabled={loading} className={`w-full text-white font-bold py-3 transition-colors shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${isEditing ? 'bg-blue-600 hover:bg-blue-800' : 'bg-black hover:bg-gray-800'}`}>
          {loading ? "PROCESSING..." : (isEditing ? "UPDATE INSTITUTE" : "CREATE INSTITUTE")}
        </button>
      </form>

      {/* ==========================
          EXISTING INSTITUTES LIST
      ========================== */}
      <div className="border-t-2 border-black pt-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold uppercase">Existing Institutes</h3>
            
            {/* SEARCH BAR */}
            <div className="relative w-full sm:w-[250px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search institute..."
                    className="w-full pl-9 pr-3 py-2 border-2 border-black font-bold outline-none focus:bg-gray-50 text-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

        <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {filteredInstitutes.map(inst => (
            <li key={inst.institute_id} className={`p-4 border-2 flex justify-between items-center transition-colors ${editId === inst.institute_id ? 'border-blue-500 bg-blue-50' : 'border-black bg-white hover:bg-gray-50'}`}>
              
              <div className="flex flex-col">
                <span className="font-bold text-lg">{inst.name}</span>
                <span className="text-[10px] font-mono text-gray-500">ID: {inst.institute_id}</span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditClick(inst)}
                  title="Edit Institute"
                  type="button"
                  className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteClick(inst)}
                  title="Delete Institute"
                  type="button"
                  className="p-2 border-2 border-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </li>
          ))}
          {filteredInstitutes.length === 0 && (
            <p className="text-gray-500 italic p-4 border-2 border-dashed border-gray-300 text-center font-bold uppercase text-xs">
                {searchQuery ? `No institutes found matching "${searchQuery}"` : "No institutes found."}
            </p>
          )}
        </ul>
      </div>

      {/* =======================
          DELETE CONFIRMATION MODAL 
      ======================== */}
      {showConfirm && instituteToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6 text-red-600 border-b-2 border-black pb-4">
              <AlertTriangle size={36} strokeWidth={2.5} />
              <h2 className="text-2xl font-black uppercase text-black">Confirm Deletion</h2>
            </div>
            
            <p className="font-medium text-black mb-4 text-sm">
              Are you sure you want to delete this institute? 
              <br/><br/>
              <span className="text-red-600 font-bold">WARNING:</span> This may permanently delete all departments, academic years, classes, and users associated with it!
            </p>

            <div className="p-4 bg-gray-100 border-2 border-black mb-8">
              <span className="block font-black text-xl">{instituteToDelete.name}</span>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowConfirm(false); setInstituteToDelete(null); }}
                className="flex-1 py-4 font-bold border-2 border-black hover:bg-gray-100 transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
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

export default InstituteForm;