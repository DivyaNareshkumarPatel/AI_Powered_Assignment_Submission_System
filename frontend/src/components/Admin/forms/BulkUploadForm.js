import React, { useState } from 'react';
import { bulkUploadUsers } from '@/utils/api';
import { Upload } from 'lucide-react';

const BulkUploadForm = ({ onSuccess, onError }) => {
  const [file, setFile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return onError("SELECT A FILE FIRST");
    
    setLoading(true);
    setStats(null);

    try {
      const res = await bulkUploadUsers(file, {}); 
      setStats(res);
      onSuccess("UPLOAD COMPLETE");
    } catch (err) { 
      onError("UPLOAD FAILED"); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2">Bulk Upload Users</h3>
        
        <div className="p-4 border-2 border-black bg-gray-50 text-sm">
          <p className="font-bold mb-2 uppercase">Instructions:</p>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>File Format: <b>.xlsx</b></li>
            <li>Required: <b>name, email, enrollment_number, role</b></li>
            <li>Roles: <b>STUDENT, TEACHER, ADMIN</b></li>
            <li><b>Students Only:</b> Provide <b>class_name</b> (Must match exactly).</li>
            <li><b>Teachers:</b> Leave class_name blank. Assign manually later.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-bold mb-1">EXCEL FILE</label>
            <input type="file" accept=".xlsx, .xls" className="w-full p-2 border-2 border-black bg-white" 
              onChange={e => setFile(e.target.files[0])} required />
          </div>
        </div>

        <button disabled={loading} className={`mt-4 w-full text-white font-bold py-3 transition-all flex justify-center items-center border-2 border-black shadow-[4px_4px_0px_0px_rgba(150,150,150,1)]
          ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}>
           <Upload className="mr-2" size={20}/> {loading ? "PROCESSING..." : "UPLOAD & PROCESS"}
        </button>
      </form>

      {stats && (
        <div className="mt-6 p-6 border-2 border-black bg-gray-50">
          <h3 className="font-bold text-lg mb-4 border-b border-black pb-2">UPLOAD SUMMARY</h3>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="p-3 bg-white border-2 border-black text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs font-bold uppercase text-gray-500">Users Processed</p>
              <p className="text-2xl font-black">{stats.users_processed}</p>
            </div>
          </div>
          {stats.errors && stats.errors.length > 0 && (
            <div className="mt-4">
              <p className="font-bold text-sm mb-2 text-black">ERRORS / WARNINGS:</p>
              <ul className="text-xs font-mono bg-black text-white p-3 space-y-1 max-h-40 overflow-y-auto border-2 border-black">
                {stats.errors.map((err, idx) => <li key={idx}>• {err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUploadForm;