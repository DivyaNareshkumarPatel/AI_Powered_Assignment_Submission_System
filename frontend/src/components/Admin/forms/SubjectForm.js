import React, { useState, useEffect, useMemo } from 'react';
import { createSubject, getInstitutes, getSubjects } from '@/utils/api'; 
import { BookOpen, Building, Filter, RefreshCw, Hash, ArrowRight } from 'lucide-react';

const SubjectForm = ({ onSuccess, onError }) => {
  // --- STATE: DATA ---
  const [institutes, setInstitutes] = useState([]);
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- STATE: CREATE FORM ---
  const [form, setForm] = useState({ 
    name: '', 
    code: '', 
    institute_id: '' 
  });
  const [submitting, setSubmitting] = useState(false);

  // --- STATE: LIST FILTER ---
  const [filterInstitute, setFilterInstitute] = useState('ALL'); 

  // ==============================
  // 1. FETCH DATA
  // ==============================
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [instRes, subjRes] = await Promise.all([
        getInstitutes(),
        getSubjects()
      ]);
      setInstitutes(instRes);
      setExistingSubjects(subjRes);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ==============================
  // 2. FILTERING LOGIC
  // ==============================
  const filteredSubjectsList = useMemo(() => {
    if (filterInstitute === 'ALL') return existingSubjects;
    return existingSubjects.filter(s => s.institute_id === filterInstitute);
  }, [existingSubjects, filterInstitute]);

  // Helper to get Institute Name
  const getInstituteName = (id) => {
    const inst = institutes.find(i => i.institute_id === id);
    return inst ? inst.name : 'Unknown Institute';
  };

  // ==============================
  // 3. HANDLERS
  // ==============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSubject(form);
      onSuccess("SUBJECT ADDED SUCCESSFULLY");
      setForm({ name: '', code: '', institute_id: '' }); // Reset form
      fetchData(); // Refresh list
    } catch (err) {
      onError(err.response?.data?.error || "FAILED TO ADD SUBJECT");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      
      {/* ==========================
          CREATE FORM
      ========================== */}
      <form onSubmit={handleSubmit} className="space-y-6 border-b-4 border-black pb-10">
        <h3 className="text-xl font-black uppercase border-b-2 border-black pb-2 flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> Add New Subject
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Institute Selection */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
              <Building size={12}/> Select Institute
            </label>
            <div className="relative">
              <select 
                className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold bg-white appearance-none rounded-none" 
                value={form.institute_id}
                onChange={e => setForm({...form, institute_id: e.target.value})} 
                required
              >
                <option value="">-- CHOOSE INSTITUTE --</option>
                {institutes.map(inst => (
                  <option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none"><ArrowRight size={16} /></div>
            </div>
          </div>

          {/* Subject Name */}
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider">Subject Name</label>
            <input 
              type="text" 
              placeholder="e.g. Data Structures" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold rounded-none" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              required 
            />
          </div>

          {/* Subject Code */}
          <div>
            <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
               <Hash size={12} /> Subject Code
            </label>
            <input 
              type="text" 
              placeholder="e.g. CS201" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold rounded-none uppercase" 
              value={form.code} 
              onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} 
              required 
            />
          </div>

        </div>

        <button 
          disabled={submitting} 
          className="w-full bg-black text-white font-black uppercase tracking-widest py-4 hover:bg-gray-800 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-50"
        >
          {submitting ? "PROCESSING..." : "ADD SUBJECT"}
        </button>
      </form>

      {/* ==========================
          EXISTING SUBJECTS LIST
      ========================== */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <RefreshCw size={20} className={`cursor-pointer hover:rotate-180 transition-transform ${loadingData ? 'animate-spin' : ''}`} onClick={fetchData}/>
            Existing Subjects
          </h3>

          {/* FILTER TOOLBAR */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black">
            <Filter size={16} />
            <select 
              className="p-1 bg-transparent text-xs font-bold outline-none border-b-2 border-transparent hover:border-black transition-colors min-w-[150px]"
              value={filterInstitute} 
              onChange={e => setFilterInstitute(e.target.value)}
            >
              <option value="ALL">ALL INSTITUTES</option>
              {institutes.map(inst => (
                <option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-2 border-black bg-white max-h-[400px] overflow-y-auto">
          {loadingData ? (
             <div className="p-12 text-center font-bold animate-pulse">LOADING DATA...</div>
          ) : filteredSubjectsList.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
                <tr>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Institute</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredSubjectsList.map((subj, idx) => (
                  <tr key={subj.subject_id} className={`border-b border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-3 font-black border-r border-gray-200">{subj.name}</td>
                    <td className="p-3 border-r border-gray-200 font-mono font-bold text-blue-600">
                      {subj.code}
                    </td>
                    <td className="p-3 border-r border-gray-200 text-xs font-mono uppercase text-gray-500">
                      <div className="flex items-center gap-2">
                        <Building size={14}/>
                        {getInstituteName(subj.institute_id)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-400 font-bold uppercase border-dashed">
              No subjects found for this filter.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SubjectForm;