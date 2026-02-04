'use client';
import { useState } from 'react';
import { createAssignment } from '@/utils/api';
import { FileText, CheckCircle, UploadCloud, Loader2 } from 'lucide-react';

export default function UploadAssignment({ allocations }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', allocation_json: '', deadline: '',
    question_file: null, solution_file: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedAlloc = JSON.parse(formData.allocation_json);
      
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('deadline', formData.deadline);
      payload.append('class_id', selectedAlloc.class_id);
      payload.append('subject_id', selectedAlloc.subject_id);
      payload.append('question_file', formData.question_file);
      payload.append('solution_file', formData.solution_file);

      await createAssignment(payload);
      alert('Assignment Published Successfully!');
      setFormData({ title: '', description: '', allocation_json: '', deadline: '', question_file: null, solution_file: null });
    } catch (err) {
      alert('Failed to upload assignment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Create Assignment</h2>
        <p className="text-gray-500">Upload questions and solution keys for your subjects.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Target Subject</label>
              <select 
                className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 bg-gray-50"
                value={formData.allocation_json}
                onChange={e => setFormData({...formData, allocation_json: e.target.value})}
                required
              >
                <option value="">-- Select Class & Subject --</option>
                {allocations.map(a => (
                  <option key={a.allocation_id} value={JSON.stringify(a)}>
                    {a.class_name} — {a.subject_name} ({a.subject_code})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Assignment Title</label>
              <input type="text" className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900" 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Unit 3 Test" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Instructions</label>
            <textarea className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 h-32 resize-none"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Enter instructions for students..."></textarea>
          </div>

          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">Submission Deadline</label>
             <input type="datetime-local" className="w-full max-w-sm p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 text-gray-600"
              value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} required />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition group">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx"
                onChange={e => setFormData({...formData, question_file: e.target.files[0]})} required />
              <div className="flex flex-col items-center">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:scale-110 transition">
                    <FileText size={24} />
                 </div>
                 <span className="text-sm font-medium text-slate-700">Question File</span>
                 <span className="text-xs text-gray-400 mt-1">{formData.question_file ? formData.question_file.name : 'PDF or Docx'}</span>
              </div>
            </div>

            <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition group">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx"
                onChange={e => setFormData({...formData, solution_file: e.target.files[0]})} required />
              <div className="flex flex-col items-center">
                 <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 group-hover:scale-110 transition">
                    <CheckCircle size={24} />
                 </div>
                 <span className="text-sm font-medium text-slate-700">Solution Key (Hidden)</span>
                 <span className="text-xs text-gray-400 mt-1">{formData.solution_file ? formData.solution_file.name : 'Used for AI Grading'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold hover:bg-black transition shadow-xl shadow-slate-200 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <><UploadCloud size={20} /> Publish Assignment</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}