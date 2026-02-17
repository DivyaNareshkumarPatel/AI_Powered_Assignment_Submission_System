import React, { useState } from 'react';
import { allocateSubject } from '@/utils/api';

const AllocationForm = ({ onSuccess, onError, teachers, subjects, classes }) => {
  const [form, setForm] = useState({ teacher_id: '', subject_id: '', class_id: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await allocateSubject(form);
      onSuccess("TEACHER ALLOCATED");
      setForm({ teacher_id: '', subject_id: '', class_id: '' });
    } catch (err) { onError("FAILED TO ALLOCATE TEACHER"); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2">Allocate Teacher</h3>
      <div>
        <label className="block text-sm font-bold mb-1">TEACHER</label>
        <select className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none" 
          value={form.teacher_id} onChange={e => setForm({...form, teacher_id: e.target.value})} required>
          <option value="">SELECT TEACHER</option>
          {teachers && teachers.map(t => <option key={t.user_id} value={t.user_id}>{t.name} ({t.enrollment_number})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold mb-1">SUBJECT</label>
          <select className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none" 
            value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required>
            <option value="">SELECT SUBJECT</option>
            {subjects && subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">CLASS</label>
          <select className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none" 
            value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} required>
            <option value="">SELECT CLASS</option>
            {classes && classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <button className="mt-6 w-full bg-black text-white font-bold py-3 hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
        ALLOCATE TEACHER
      </button>
    </form>
  );
};

export default AllocationForm;