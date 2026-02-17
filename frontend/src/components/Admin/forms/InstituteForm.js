import React, { useState } from 'react';
import { createInstitute } from '@/utils/api';
import { Building } from 'lucide-react';

const InstituteForm = ({ onSuccess, onError, institutes }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createInstitute({ name });
      onSuccess("INSTITUTE CREATED");
      setName('');
    } catch (err) {
      onError("FAILED TO CREATE INSTITUTE");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2 flex items-center gap-2">
          <Building size={24} /> Add New Institute
        </h3>
        
        <div>
          <label className="block text-sm font-bold mb-1">INSTITUTE NAME</label>
          <input 
            type="text" 
            placeholder="e.g. UVPCE" 
            className="w-full p-3 border-2 border-black focus:bg-gray-50 outline-none font-bold" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
        </div>

        <button disabled={loading} className="w-full bg-black text-white font-bold py-3 hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
          {loading ? "PROCESSING..." : "CREATE INSTITUTE"}
        </button>
      </form>

      <div className="border-t-2 border-black pt-6">
        <h3 className="text-lg font-bold mb-4 uppercase">Existing Institutes</h3>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {institutes && institutes.map(inst => (
            <li key={inst.institute_id} className="p-3 border-2 border-black flex justify-between items-center bg-gray-50">
              <span className="font-bold">{inst.name}</span>
              <span className="text-xs font-mono bg-black text-white px-2 py-1">ID: {inst.institute_id.split('-')[0]}...</span>
            </li>
          ))}
          {(!institutes || institutes.length === 0) && <p className="text-gray-500 italic">No institutes found.</p>}
        </ul>
      </div>
    </div>
  );
};

export default InstituteForm;