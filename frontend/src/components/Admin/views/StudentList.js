import React, { useState, useEffect, useMemo } from 'react';
import { getStudents, getInstitutes, getClasses } from '@/utils/api';
import { Users, Building, Layers, RefreshCw } from 'lucide-react';

const StudentList = () => {
    // Data States
    const [students, setStudents] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [allClasses, setAllClasses] = useState([]); // Stores ALL classes
    
    // Filter States
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Fetch Master Data on Mount (Institutes & All Classes)
    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [instRes, classRes] = await Promise.all([
                    getInstitutes(),
                    getClasses() // Fetches all classes with institute_id included
                ]);
                setInstitutes(instRes);
                setAllClasses(classRes);
            } catch (err) {
                console.error("Failed to load master data", err);
            }
        };
        loadMasterData();
    }, []);

    // 2. Frontend Filtering: Filter Classes based on Selected Institute
    const filteredClasses = useMemo(() => {
        if (!selectedInstitute) return [];
        return allClasses.filter(c => c.institute_id === selectedInstitute);
    }, [allClasses, selectedInstitute]);

    // 3. Reset Class selection when Institute changes
    useEffect(() => {
        setSelectedClass('');
    }, [selectedInstitute]);

    // 4. Fetch Students based on Filters
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await getStudents(selectedInstitute, selectedClass);
            setStudents(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch when filters change
    useEffect(() => {
        fetchStudents();
    }, [selectedInstitute, selectedClass]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-black pb-4">
                <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                    <Users className="w-8 h-8" /> Student Data
                </h2>
                <button onClick={fetchStudents} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* FILTER BAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-100 p-4 border-2 border-black">
                
                {/* Institute Filter */}
                <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                        <Building size={12}/> Select Institute
                    </label>
                    <select 
                        className="w-full p-2 border-2 border-black outline-none font-bold text-sm bg-white"
                        value={selectedInstitute}
                        onChange={(e) => setSelectedInstitute(e.target.value)}
                    >
                        <option value="">-- ALL INSTITUTES --</option>
                        {institutes.map(i => (
                            <option key={i.institute_id} value={i.institute_id}>{i.name}</option>
                        ))}
                    </select>
                </div>

                {/* Class Filter (Filtered Locally) */}
                <div className={`transition-opacity duration-200 ${!selectedInstitute ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                        <Layers size={12}/> Select Class
                    </label>
                    <select 
                        className="w-full p-2 border-2 border-black outline-none font-bold text-sm bg-white"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        disabled={!selectedInstitute}
                    >
                        <option value="">-- ALL CLASSES --</option>
                        {filteredClasses.map(c => (
                            <option key={c.class_id} value={c.class_id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* DATA TABLE */}
            <div className="border-2 border-black bg-white max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black text-white text-xs uppercase sticky top-0">
                        <tr>
                            <th className="p-4">Enrollment No</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Class</th>
                            <th className="p-4">Institute</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium">
                        {loading ? (
                            <tr><td colSpan="5" className="p-12 text-center animate-pulse font-bold">LOADING DATA...</td></tr>
                        ) : students.length > 0 ? (
                            students.map((s, i) => (
                                <tr key={s.user_id} className={`border-b border-gray-200 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="p-4 font-mono font-bold text-blue-600">
                                        {s.enrollment_number}
                                    </td>
                                    <td className="p-4 font-bold">{s.name}</td>
                                    <td className="p-4 text-gray-600">{s.email}</td>
                                    <td className="p-4 text-xs font-bold uppercase border-l border-gray-100">
                                        {s.class_name || <span className="text-red-500">Not Assigned</span>}
                                    </td>
                                    <td className="p-4 text-xs uppercase text-gray-500">
                                        {institutes.find(inst => inst.institute_id === s.institute_id)?.name || '-'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-500 border-dashed">No students found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="text-right text-xs font-bold text-gray-500">
                TOTAL STUDENTS: {students.length}
            </div>
        </div>
    );
};

export default StudentList;