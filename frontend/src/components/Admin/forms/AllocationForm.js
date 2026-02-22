import React, { useState, useEffect, useMemo } from 'react';
import { 
  allocateSubject, 
  getInstitutes, 
  getDepartments, 
  getYears, 
  getSemesters, 
  getClasses, 
  getTeachers, 
  getSubjects 
} from '@/utils/api';

const AllocationForm = ({ onSuccess, onError }) => {
  // ==========================================
  // 1. DATA STATES
  // ==========================================
  const [institutes, setInstitutes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // ==========================================
  // 2. SELECTION STATES
  // ==========================================
  const [selectedInstitute, setSelectedInstitute] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // ==========================================
  // 3. FETCH MASTER DATA ON MOUNT
  // ==========================================
  useEffect(() => {
    const loadData = async () => {
      try {
        const [instRes, deptRes, yearRes, semRes, classRes, teacherRes, subjectRes] = await Promise.all([
          getInstitutes(),
          getDepartments(),
          getYears(),
          getSemesters(),
          getClasses(),
          getTeachers(),
          getSubjects()
        ]);
        setInstitutes(instRes || []);
        setDepartments(deptRes || []);
        setYears(yearRes || []);
        setSemesters(semRes || []);
        setClasses(classRes || []);
        setTeachers(teacherRes || []);
        setSubjects(subjectRes || []);
      } catch (err) {
        console.error("Failed to load allocation data", err);
      }
    };
    loadData();
  }, []);

  // ==========================================
  // 4. CASCADING FILTER LOGIC
  // ==========================================
  const filteredDepartments = useMemo(() => departments.filter(d => d.institute_id === selectedInstitute), [departments, selectedInstitute]);
  const filteredYears = useMemo(() => years.filter(y => y.department_id === selectedDepartment), [years, selectedDepartment]);
  const filteredSemesters = useMemo(() => semesters.filter(s => s.academic_year_id === selectedYear), [semesters, selectedYear]);
  const filteredClasses = useMemo(() => classes.filter(c => c.semester_id === selectedSemester), [classes, selectedSemester]);
  const filteredTeachers = useMemo(() => teachers.filter(t => t.institute_id === selectedInstitute), [teachers, selectedInstitute]);
  const filteredSubjects = useMemo(() => subjects.filter(s => s.institute_id === selectedInstitute), [subjects, selectedInstitute]);

  // Reset downstream selections when an upstream selection changes
  useEffect(() => { setSelectedDepartment(''); setSelectedTeacher(''); setSelectedSubject(''); }, [selectedInstitute]);
  useEffect(() => { setSelectedYear(''); }, [selectedDepartment]);
  useEffect(() => { setSelectedSemester(''); }, [selectedYear]);
  useEffect(() => { setSelectedClass(''); }, [selectedSemester]);

  // ==========================================
  // 5. SUBMIT HANDLER
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await allocateSubject({
        teacher_id: selectedTeacher,
        subject_id: selectedSubject,
        class_id: selectedClass,
        academic_year_id: selectedYear // Passed to backend for the new unique constraint
      });
      onSuccess("TEACHER ALLOCATED SUCCESSFULLY");
      
      // Reset only the final selections so the admin can easily allocate another subject to the same class
      setSelectedTeacher('');
      setSelectedSubject('');
    } catch (err) { 
      onError("FAILED TO ALLOCATE TEACHER"); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2">Allocate Teacher</h3>
      
      {/* ROW 1: Institute & Department */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold mb-1 uppercase text-gray-600">1. Institute</label>
          <select 
            className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold text-sm" 
            value={selectedInstitute} 
            onChange={e => setSelectedInstitute(e.target.value)} 
            required
          >
            <option value="">SELECT INSTITUTE</option>
            {institutes.map(i => <option key={i.institute_id} value={i.institute_id}>{i.name}</option>)}
          </select>
        </div>
        
        <div className={`transition-opacity ${!selectedInstitute ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-xs font-bold mb-1 uppercase text-gray-600">2. Department</label>
          <select 
            className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold text-sm" 
            value={selectedDepartment} 
            onChange={e => setSelectedDepartment(e.target.value)} 
            required
          >
            <option value="">SELECT DEPARTMENT</option>
            {filteredDepartments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* ROW 2: Academic Year & Semester */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`transition-opacity ${!selectedDepartment ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-xs font-bold mb-1 uppercase text-gray-600">3. Academic Year</label>
          <select 
            className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold text-sm" 
            value={selectedYear} 
            onChange={e => setSelectedYear(e.target.value)} 
            required
          >
            <option value="">SELECT YEAR</option>
            {filteredYears.map(y => <option key={y.academic_year_id} value={y.academic_year_id}>{y.name}</option>)}
          </select>
        </div>

        <div className={`transition-opacity ${!selectedYear ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-xs font-bold mb-1 uppercase text-gray-600">4. Semester</label>
          <select 
            className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold text-sm" 
            value={selectedSemester} 
            onChange={e => setSelectedSemester(e.target.value)} 
            required
          >
            <option value="">SELECT SEMESTER</option>
            {filteredSemesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* ROW 3: Class & Teacher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`transition-opacity ${!selectedSemester ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-xs font-bold mb-1 uppercase text-gray-600">5. Class</label>
          <select 
            className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold text-sm" 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)} 
            required
          >
            <option value="">SELECT CLASS</option>
            {filteredClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
          </select>
        </div>

        <div className={`transition-opacity ${!selectedInstitute ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-xs font-bold mb-1 uppercase text-gray-600">6. Teacher</label>
          <select 
            className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold text-sm" 
            value={selectedTeacher} 
            onChange={e => setSelectedTeacher(e.target.value)} 
            required
          >
            <option value="">SELECT TEACHER</option>
            {filteredTeachers.map(t => <option key={t.user_id} value={t.user_id}>{t.name} ({t.enrollment_number})</option>)}
          </select>
        </div>
      </div>

      {/* ROW 4: Subject */}
      <div className={`transition-opacity ${!selectedInstitute ? 'opacity-50 pointer-events-none' : ''}`}>
        <label className="block text-xs font-bold mb-1 uppercase text-gray-600">7. Subject</label>
        <select 
          className="w-full p-3 border-2 border-black bg-white focus:bg-gray-50 outline-none font-bold text-sm" 
          value={selectedSubject} 
          onChange={e => setSelectedSubject(e.target.value)} 
          required
        >
          <option value="">SELECT SUBJECT</option>
          {filteredSubjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.name} ({s.code})</option>)}
        </select>
      </div>

      <button 
        type="submit"
        className="mt-6 w-full bg-black text-white font-black uppercase tracking-wider py-4 hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(150,150,150,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
      >
        Allocate Subject
      </button>
    </form>
  );
};

export default AllocationForm;