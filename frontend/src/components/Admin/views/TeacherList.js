import React, { useState, useEffect } from 'react';
import { getTeachers, getInstitutes } from '@/utils/api';
import { UserCheck, Building, Mail, Hash, RefreshCw, Filter } from 'lucide-react';

const TeacherList = () => {
    const [teachers, setTeachers] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [selectedInstitute, setSelectedInstitute] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Fetch Institutes on Mount
    useEffect(() => {
        const loadInstitutes = async () => {
            try {
                const data = await getInstitutes();
                setInstitutes(data);
            } catch (err) {
                console.error("Failed to load institutes", err);
            }
        };
        loadInstitutes();
    }, []);

    // 2. Fetch Teachers (Triggered on Mount & When Filter Changes)
    const fetchTeachers = async () => {
        setLoading(true);
        try {
            // Pass selectedInstitute to API (Backend handles filtering)
            const data = await getTeachers(selectedInstitute);
            setTeachers(data);
        } catch (err) {
            console.error("Failed to load teachers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, [selectedInstitute]);

    // Helper to get Institute Name
    const getInstituteName = (id) => {
        const inst = institutes.find(i => i.institute_id === id);
        return inst ? inst.name : '-';
    };

    return (
        <div className="space-y-6">
            {/* HEADER & CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-black pb-4">
                <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                    <UserCheck className="w-8 h-8" /> Teacher Data
                </h2>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                     {/* FILTER */}
                    <div className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black flex-1">
                        <Filter size={18} />
                        <select 
                            className="bg-transparent font-bold text-sm outline-none w-full min-w-[200px]"
                            value={selectedInstitute}
                            onChange={(e) => setSelectedInstitute(e.target.value)}
                        >
                            <option value="">SHOW ALL INSTITUTES</option>
                            {institutes.map(i => (
                                <option key={i.institute_id} value={i.institute_id}>{i.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* REFRESH BUTTON */}
                    <button 
                        onClick={fetchTeachers} 
                        className="p-3 bg-black text-white hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                        title="Refresh List"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="border-2 border-black bg-white max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black text-white text-xs uppercase sticky top-0 z-10">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Enrollment / ID</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Institute</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-medium">
                        {loading ? (
                             <tr><td colSpan="4" className="p-12 text-center animate-pulse font-bold">LOADING DATA...</td></tr>
                        ) : teachers.length > 0 ? (
                            teachers.map((t, i) => (
                                <tr key={t.user_id} className={`border-b border-gray-200 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <td className="p-4 font-bold text-base">{t.name}</td>
                                    <td className="p-4 font-mono text-blue-600 flex items-center gap-2">
                                        <Hash size={14}/> {t.enrollment_number}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} /> {t.email}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs uppercase font-bold text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Building size={14} />
                                            {getInstituteName(t.institute_id)}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="p-12 text-center text-gray-500 border-dashed">No teachers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="text-right text-xs font-bold text-gray-500">
                TOTAL TEACHERS: {teachers.length}
            </div>
        </div>
    );
};

export default TeacherList;