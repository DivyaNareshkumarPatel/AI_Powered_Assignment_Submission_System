import { useState, useEffect } from 'react';
import { fetchTeacherAssignments, fetchSubmissions, fetchTeacherAllocations } from '@/utils/api';
import { ChevronRight, FileText, Search, Loader2, Filter } from 'lucide-react';

export default function SubmissionReview() {
  // Data States
  const [allocations, setAllocations] = useState([]); // ONLY contains classes this teacher owns
  const [allAssignments, setAllAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  // Selection States
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  
  const [loading, setLoading] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [allocData, asgData] = await Promise.all([
          fetchTeacherAllocations(), // <--- THIS is the key filter (Backend restricted)
          fetchTeacherAssignments()
        ]);
        setAllocations(allocData || []);
        setAllAssignments(asgData || []);
      } catch (err) {
        console.error("Failed to load filter data", err);
      }
    };
    loadData();
  }, []);

  // --- STRICT FILTERING LOGIC ---

  // Step 1: Get Unique Classes from the Teacher's Allocations
  // We use a Map to remove duplicates (e.g. if teacher teaches 2 subjects to same class)
  const uniqueClasses = [...new Map(allocations.map(item => [item.class_id, item])).values()];

  // Step 2: Get Subjects ONLY for the Selected Class (and owned by teacher)
  const availableSubjects = allocations.filter(a => a.class_id === selectedClassId);

  // Step 3: Get Assignments ONLY for Selected Class AND Subject
  const availableAssignments = allAssignments.filter(a => 
    a.class_id === selectedClassId && a.subject_id === selectedSubjectId
  );

  // --- HANDLERS ---

  const handleClassChange = (e) => {
    setSelectedClassId(e.target.value);
    setSelectedSubjectId('');     // Reset Subject
    setSelectedAssignmentId('');  // Reset Assignment
    setSubmissions([]);           // Clear Table
  };

  const handleSubjectChange = (e) => {
    setSelectedSubjectId(e.target.value);
    setSelectedAssignmentId('');  // Reset Assignment
    setSubmissions([]);           // Clear Table
  };

  const handleAssignmentChange = async (e) => {
    const asgId = e.target.value;
    setSelectedAssignmentId(asgId);
    
    if (asgId) {
      setLoading(true);
      try {
        const data = await fetchSubmissions(asgId);
        setSubmissions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      setSubmissions([]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Grading & Review</h2>
        <p className="text-gray-500">Filter by your classes and subjects to find assignments.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        
        {/* --- FILTERS SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
          
          {/* 1. SELECT CLASS (Only Teacher's Classes) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">1. Select Class</label>
            <select 
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900"
              value={selectedClassId}
              onChange={handleClassChange}
            >
              <option value="">-- Choose Class --</option>
              {uniqueClasses.map(c => (
                <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
              ))}
            </select>
          </div>

          {/* 2. SELECT SUBJECT (Only Subjects taught by this Teacher to this Class) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">2. Select Subject</label>
            <select 
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900 disabled:opacity-50 disabled:bg-gray-100"
              value={selectedSubjectId}
              onChange={handleSubjectChange}
              disabled={!selectedClassId}
            >
              <option value="">-- Choose Subject --</option>
              {availableSubjects.map(s => (
                <option key={s.subject_id} value={s.subject_id}>{s.subject_name} ({s.subject_code})</option>
              ))}
            </select>
          </div>

          {/* 3. SELECT ASSIGNMENT */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">3. Select Assignment</label>
            <select 
              className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900 disabled:opacity-50 disabled:bg-gray-100"
              value={selectedAssignmentId}
              onChange={handleAssignmentChange}
              disabled={!selectedSubjectId}
            >
              <option value="">-- Choose Assignment --</option>
              {availableAssignments.map(a => (
                <option key={a.assignment_id} value={a.assignment_id}>{a.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- SUBMISSIONS TABLE --- */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
             <Loader2 className="animate-spin text-slate-900 w-8 h-8 mb-2" />
             <p className="text-gray-500">Loading Submissions...</p>
          </div>
        ) : submissions.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4">Student</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((s) => (
                  <tr key={s.submission_id} className="hover:bg-gray-50 transition">
                    <td className="p-4">
                        <div className="font-medium text-slate-900">{s.student_name}</div>
                        <div className="text-xs text-gray-500">{s.enrollment_number}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{new Date(s.submitted_at).toLocaleDateString()}</td>
                    <td className="p-4">
                        <StatusBadge status={s.status} />
                    </td>
                    <td className="p-4">
                        <div className="font-bold text-slate-800 text-lg">{s.final_score || '-'}</div>
                    </td>
                    <td className="p-4">
                        <button className="text-slate-900 hover:text-blue-600 text-sm font-semibold flex items-center gap-1 transition">
                            Details <ChevronRight size={14} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
             <Filter className="mx-auto h-10 w-10 text-gray-300 mb-2" />
             <p className="text-gray-400">
               {selectedAssignmentId ? "No students have submitted this assignment yet." : "Please select Class & Subject to view assignments."}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
    const styles = {
        'PENDING': 'bg-gray-100 text-gray-600',
        'AI_GRADED': 'bg-blue-50 text-blue-700',
        'VIVA_COMPLETED': 'bg-purple-50 text-purple-700',
        'TEACHER_VERIFIED': 'bg-green-50 text-green-700',
        'FLAGGED': 'bg-red-50 text-red-700'
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border border-transparent ${styles[status] || styles['PENDING']}`}>
            {status.replace('_', ' ')}
        </span>
    );
}