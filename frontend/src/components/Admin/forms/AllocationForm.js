import React, { useState } from 'react';
// Adjust imports to point to your API file location relative to this file
import { allocateSubject } from '../../../../api'; 

const AllocationForm = ({ onSuccess, onError, teachers, subjects, classes }) => {
  const [form, setForm] = useState({ teacher_id: '', subject_id: '', class_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await allocateSubject(form);
      onSuccess("Teacher Allocated Successfully!");
      setForm({ teacher_id: '', subject_id: '', class_id: '' });
    } catch (err) {
      onError("Failed to allocate teacher.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Manual Teacher Allocation</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
          <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
            value={form.teacher_id} onChange={e => setForm({...form, teacher_id: e.target.value})} required>
            <option value="">Select Teacher</option>
            {teachers.map(t => <option key={t.user_id} value={t.user_id}>{t.name} ({t.enrollment_number})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
              value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} required>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <button className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all">
        Allocate Teacher
      </button>
    </form>
  );
};

export default AllocationForm;