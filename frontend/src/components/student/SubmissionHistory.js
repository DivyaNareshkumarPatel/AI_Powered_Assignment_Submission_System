import { useState, useEffect } from 'react';
import { fetchStudentHistory } from '@/utils/api';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentHistory()
      .then((data) => setSubmissions(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Submission History</h2>
        <p className="text-gray-500">View grades and status of past assignments.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin inline text-slate-900 w-8 h-8" /></div>
      ) : submissions.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase">Assignment</th>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase">Subject</th>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((s) => (
                <tr key={s.submission_id} className="hover:bg-gray-50 transition">
                  <td className="p-5 font-medium text-slate-900">{s.title}</td>
                  <td className="p-5 text-sm text-gray-600">{s.subject_name}</td>
                  <td className="p-5 text-sm text-gray-500">{new Date(s.submitted_at).toLocaleDateString()}</td>
                  <td className="p-5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="p-5 font-bold text-slate-800">
                    {s.final_score ? s.final_score : <span className="text-gray-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400">No submissions found yet.</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
    const configs = {
        'PENDING': { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Processing' },
        'AI_GRADED': { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, text: 'AI Graded' },
        'TEACHER_VERIFIED': { color: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Verified' },
        'FLAGGED': { color: 'bg-red-100 text-red-700', icon: AlertCircle, text: 'Flagged' }
    };
    const config = configs[status] || configs['PENDING'];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
            <Icon size={12} /> {config.text}
        </span>
    );
}