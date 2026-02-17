import React, { useState } from 'react';
import { createDepartment } from '@/utils/api';
import { Library } from 'lucide-react';

const DepartmentForm = ({ onSuccess, onError, institutes, departments }) => {
  const [form, setForm] = useState({ name: '', institute_id: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createDepartment(form);
      onSuccess("DEPARTMENT CREATED");
      setForm({ name: '', institute_id: '' });
    } catch (err) {
      onError("FAILED TO CREATE DEPARTMENT");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2 flex items-center gap-2">
          <Library size={24} /> Add New Department
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-1">SELECT INSTITUTE</label>
            <select 
              className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold" 
              value={form.institute_id} 
              onChange={e => setForm({...form, institute_id: e.target.value})} 
              required
            >
              <option value="">-- CHOOSE INSTITUTE --</option>
              {institutes && institutes.map(inst => (
                <option key={inst.institute_id} value={inst.institute_id}>{inst.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-1">DEPARTMENT NAME</label>
            <input 
              type="text" 
              placeholder="e.g. Computer Engineering" 
              className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              required 
            />
          </div>
        </div>

        <button disabled={loading} className="w-full bg-black text-white font-bold py-3 hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
          {loading ? "PROCESSING..." : "CREATE DEPARTMENT"}
        </button>
      </form>

      <div className="border-t-2 border-black pt-6">
        <h3 className="text-lg font-bold mb-4 uppercase">Existing Departments</h3>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {departments && departments.map(dept => (
            <li key={dept.department_id} className="p-3 border-2 border-black flex flex-col bg-gray-50">
              <span className="font-bold text-lg">{dept.name}</span>
              <span className="text-xs font-bold text-gray-500 uppercase">{dept.institute_name || "Unknown Institute"}</span>
            </li>
          ))}
          {(!departments || departments.length === 0) && <p className="text-gray-500 italic">No departments found.</p>}
        </ul>
      </div>
    </div>
  );
};

export default DepartmentForm;