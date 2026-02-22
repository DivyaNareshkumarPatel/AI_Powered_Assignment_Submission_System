import React, { useState, useEffect, useMemo } from 'react';
import { 
    bulkUploadUsers, getInstitutes, getDepartments, getYears, getSemesters, getClasses 
} from '@/utils/api';
import { Upload, Users, Building, Layers } from 'lucide-react';

const BulkUploadForm = ({ onSuccess, onError }) => {
  const [file, setFile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cascading Filter Data
  const [institutes, setInstitutes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);

  // Form Selections
  const [role, setRole] = useState('STUDENT');
  const [selectedInstitute, setSelectedInstitute] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const fetchMasterData = async () => {
        try {
            const [instRes, deptRes, yearRes, semRes, classRes] = await Promise.all([
                getInstitutes(), getDepartments(), getYears(), getSemesters(), getClasses()
            ]);
            setInstitutes(instRes || []);
            setDepartments(deptRes || []);
            setAcademicYears(yearRes || []);
            setSemesters(semRes || []);
            setClasses(classRes || []);
        } catch (err) {
            console.error("Failed to load master data", err);
        }
    };
    fetchMasterData();
  }, []);

  // Cascading Logic
  const filteredDepartments = useMemo(() => departments.filter(d => d.institute_id === selectedInstitute), [departments, selectedInstitute]);
  const filteredYears = useMemo(() => academicYears.filter(y => y.department_id === selectedDepartment), [academicYears, selectedDepartment]);
  const filteredSemesters = useMemo(() => semesters.filter(s => s.academic_year_id === selectedYear), [semesters, selectedYear]);
  const filteredClasses = useMemo(() => classes.filter(c => c.semester_id === selectedSemester), [classes, selectedSemester]);

  // Reset downstream selections when an upstream selection changes
  useEffect(() => { setSelectedDepartment(''); }, [selectedInstitute]);
  useEffect(() => { setSelectedYear(''); }, [selectedDepartment]);
  useEffect(() => { setSelectedSemester(''); }, [selectedYear]);
  useEffect(() => { setSelectedClass(''); }, [selectedSemester]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return onError("SELECT A FILE FIRST");
    if (!selectedInstitute) return onError("SELECT AN INSTITUTE");
    if (role === 'STUDENT' && !selectedClass) return onError("SELECT A CLASS FOR STUDENTS");
    
    setLoading(true);
    setStats(null);

    try {
      const res = await bulkUploadUsers(file, {
          role,
          institute_id: selectedInstitute,
          class_id: selectedClass
      }); 
      setStats(res);
      onSuccess("UPLOAD COMPLETE");
      setFile(null);
    } catch (err) { 
      onError(err.response?.data?.error || "UPLOAD FAILED"); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-xl font-bold uppercase border-b-2 border-black pb-2 flex items-center gap-2">
            <Users/> Bulk Upload Users
        </h3>
        
        <div className="p-4 border-2 border-black bg-yellow-50 text-sm">
          <p className="font-bold mb-2 uppercase text-black">Excel File Instructions:</p>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-gray-800">
            <li>File Format must be <b>.xlsx</b></li>
            <li>Your Excel file ONLY needs 3 columns: <b className="text-black bg-yellow-200 px-1">name</b>, <b className="text-black bg-yellow-200 px-1">email</b>, <b className="text-black bg-yellow-200 px-1">enrollment_number</b></li>
            <li>Do NOT include Class or Institute names in the Excel file. Use the filters below.</li>
            <li>Default passwords will be set to the user's Enrollment Number.</li>
          </ul>
        </div>

        {/* UPLOAD SETTINGS */}
        <div className="p-4 border-2 border-black bg-gray-50 space-y-4">
            <h4 className="font-black uppercase text-sm border-b-2 border-black pb-1">Upload Destination</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold uppercase mb-1">Role</label>
                    <select className="w-full p-2 border-2 border-black bg-white font-bold" value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="STUDENT">STUDENT</option>
                        <option value="TEACHER">TEACHER</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-xs font-bold uppercase mb-1 flex items-center gap-1"><Building size={12}/> Institute (Mandatory)</label>
                    <select className="w-full p-2 border-2 border-black bg-white font-bold text-xs" value={selectedInstitute} onChange={(e) => setSelectedInstitute(e.target.value)} required>
                        <option value="">-- SELECT INSTITUTE --</option>
                        {institutes.map(i => <option key={i.institute_id} value={i.institute_id}>{i.name}</option>)}
                    </select>
                </div>
            </div>

            {/* CASCADING FILTERS - ONLY SHOW FOR STUDENTS */}
            {role === 'STUDENT' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t-2 border-gray-300">
                    <div>
                        <label className="text-[10px] font-bold uppercase mb-1">Department</label>
                        <select className="w-full p-2 border-2 border-black bg-white font-bold text-[10px]" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} disabled={!selectedInstitute}>
                            <option value="">-- SELECT DEPT --</option>
                            {filteredDepartments.map(d => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase mb-1">Academic Year</label>
                        <select className="w-full p-2 border-2 border-black bg-white font-bold text-[10px]" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} disabled={!selectedDepartment}>
                            <option value="">-- SELECT YEAR --</option>
                            {filteredYears.map(y => <option key={y.academic_year_id} value={y.academic_year_id}>{y.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase mb-1">Semester</label>
                        <select className="w-full p-2 border-2 border-black bg-white font-bold text-[10px]" value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} disabled={!selectedYear}>
                            <option value="">-- SELECT SEM --</option>
                            {filteredSemesters.map(s => <option key={s.semester_id} value={s.semester_id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase mb-1 text-blue-600 flex items-center gap-1"><Layers size={10}/> Target Class *</label>
                        <select className="w-full p-2 border-2 border-blue-600 bg-white font-bold text-[10px]" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={!selectedSemester} required>
                            <option value="">-- SELECT CLASS --</option>
                            {filteredClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            )}
        </div>

        <div>
          <label className="block text-sm font-black uppercase mb-1">Select Excel File</label>
          <input type="file" accept=".xlsx, .xls" className="w-full p-3 border-4 border-black bg-white font-bold" 
            onChange={e => setFile(e.target.files[0])} required />
        </div>

        <button disabled={loading} className={`mt-4 w-full text-white font-black uppercase tracking-widest py-4 transition-all flex justify-center items-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1
          ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}>
           <Upload className="mr-2" size={20}/> {loading ? "PROCESSING FILE..." : `UPLOAD AS ${role}S`}
        </button>
      </form>

      {/* RESULTS SUMMARY */}
      {stats && (
        <div className="mt-8 p-6 border-4 border-black bg-green-50">
          <h3 className="font-black text-xl mb-4 border-b-2 border-black pb-2 uppercase text-green-800">Upload Summary</h3>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="p-4 bg-white border-4 border-black text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-sm font-bold uppercase text-gray-500">Successfully Processed</p>
              <p className="text-4xl font-black text-green-600">{stats.users_processed}</p>
            </div>
          </div>
          {stats.errors && stats.errors.length > 0 && (
            <div className="mt-6">
              <p className="font-black text-sm mb-2 text-red-600 uppercase">Errors / Conflicts Skipped:</p>
              <ul className="text-xs font-mono bg-red-50 text-red-900 p-4 space-y-2 max-h-60 overflow-y-auto border-2 border-red-600">
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