import React, { useState } from 'react';
import { bulkUploadUsers } from '../../../../api'; 
import { Upload } from 'lucide-react';

const BulkUploadForm = ({ onSuccess, onError }) => {
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('STUDENT');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return onError("Please select a file.");
    
    setLoading(true);
    setStats(null);

    try {
      const res = await bulkUploadUsers(file, { default_role: role });
      setStats(res);
      onSuccess("Upload Processed Successfully!");
    } catch (err) {
      onError("Upload failed. Check file format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Bulk Upload Users</h3>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-1">Instructions:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Upload an Excel file (.xlsx)</li>
            <li>Required Columns: <b>name, email, enrollment_number</b></li>
            <li>Optional Columns: <b>role, class_name, subject_code</b></li>
            <li>For Teachers: Provide <b>class_name</b> & <b>subject_code</b> to auto-allocate.</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Role</label>
            <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              onChange={e => setRole(e.target.value)}>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel File</label>
            <input type="file" accept=".xlsx, .xls" className="w-full p-2 border rounded-lg bg-white" 
              onChange={e => setFile(e.target.files[0])} required />
          </div>
        </div>

        <button disabled={loading} className={`mt-4 w-full text-white font-semibold py-3 rounded-lg transition-all flex justify-center items-center
          ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
           <Upload className="mr-2" size={20}/> {loading ? "Processing..." : "Upload & Process"}
        </button>
      </form>

      {stats && (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-bold text-lg mb-3">Upload Summary</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-white rounded shadow-sm text-center">
              <p className="text-gray-500 text-sm">Users Processed</p>
              <p className="text-2xl font-bold text-green-600">{stats.users_processed}</p>
            </div>
            <div className="p-3 bg-white rounded shadow-sm text-center">
              <p className="text-gray-500 text-sm">Allocations</p>
              <p className="text-2xl font-bold text-blue-600">{stats.allocations_made}</p>
            </div>
          </div>
          {stats.errors && stats.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-red-600 font-semibold text-sm mb-2">Errors / Warnings:</p>
              <ul className="text-xs text-red-500 space-y-1 max-h-40 overflow-y-auto bg-red-50 p-2 rounded">
                {stats.errors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUploadForm;