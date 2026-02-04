import { useState } from 'react';
import { fetchStudentsByClass } from '@/utils/api';
import { Search, User, ArrowRight, Loader2 } from 'lucide-react';

// ACCEPT setActiveTab HERE
export default function ClassView({ allocations, setActiveTab }) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Safety check: Ensure allocations is an array
  const safeAllocations = Array.isArray(allocations) ? allocations : [];
  const uniqueClasses = [...new Map(safeAllocations.map(item => [item.class_id, item])).values()];

  const handleClassChange = async (e) => {
    const clsId = e.target.value;
    setSelectedClassId(clsId);
    if (clsId) {
      setLoading(true);
      try {
        const data = await fetchStudentsByClass(clsId);
        setStudents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
        setStudents([]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">Student Directory</h2>
            <p className="text-gray-500">View enrolled students in your classes.</p>
        </div>
        
        {/* THIS BUTTON CAUSED THE CRASH BEFORE. NOW IT IS FIXED. */}
        <button 
            onClick={() => setActiveTab && setActiveTab('upload')}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
        >
            Create Assignment <ArrowRight size={16} />
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
            <select 
              className="p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 min-w-[250px] bg-gray-50 text-slate-900 font-medium"
              value={selectedClassId}
              onChange={handleClassChange}
            >
              <option value="">-- Select Class --</option>
              {uniqueClasses.map(c => (
                  <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
              ))}
            </select>
        </div>

        {loading ? (
            <div className="py-10 text-center"><Loader2 className="animate-spin inline text-slate-900" /></div>
        ) : students.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4">Student</th>
                  <th className="p-4">Enrollment ID</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => (
                  <tr key={s.user_id} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-slate-900">{s.name}</td>
                    <td className="p-4 font-mono text-sm text-slate-600">{s.enrollment_number}</td>
                    <td className="p-4 text-gray-600 text-sm">{s.email}</td>
                    <td className="p-4"><span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 text-xs font-semibold rounded-full">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400">Select a class to view student details</p>
          </div>
        )}
      </div>
    </div>
  );
}