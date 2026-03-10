'use client';

import React, { useState, useEffect } from 'react';
import { fetchTeacherRequests, resolveTeacherRequest } from '@/utils/api';
import { Bell, CheckCircle, XCircle, Trash2, BookOpen, AlertCircle } from 'lucide-react';

export default function RequestsView() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        const loadRequests = async () => {
            try {
                const data = await fetchTeacherRequests();
                setRequests(data || []);
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        loadRequests();
    }, []);

    const handleAction = async (id, action) => {
        setProcessingId(id);
        try {
            await resolveTeacherRequest(id, { action });
            setRequests(prev => prev.filter(r => r.submission_id !== id));
        } catch (err) {
            alert("Failed to resolve request.");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Bell size={28} className="text-blue-600" /> Student Requests
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Review pending resubmission and recheck requests.</p>
            </div>

            {requests.length === 0 ? (
                <div className="py-20 bg-white border border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center">
                    <CheckCircle size={48} className="text-emerald-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">All Caught Up!</h3>
                    <p className="text-sm font-medium text-slate-400 mt-1">No pending student requests.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {requests.map(req => {
                        const isResub = req.resubmission_requested;
                        return (
                            <div key={req.submission_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${isResub ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                            {isResub ? 'Resubmission Request' : 'Recheck Request'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">{new Date(req.submitted_at).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">{req.student_name} <span className="text-sm font-medium text-slate-500">({req.enrollment_number})</span></h3>
                                    <p className="text-sm font-semibold text-slate-600 mt-1 flex items-center gap-1"><BookOpen size={14}/> {req.assignment_title} • {req.subject_name}</p>
                                    
                                    <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle size={12}/> Student Reason:</p>
                                        <p className="text-sm font-medium text-slate-700 italic">"{req.request_reason}"</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    {isResub ? (
                                        <>
                                            <button disabled={processingId === req.submission_id} onClick={() => handleAction(req.submission_id, 'APPROVE_RESUBMISSION')} className="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2">
                                                <Trash2 size={16}/> Approve & Delete File
                                            </button>
                                            <button disabled={processingId === req.submission_id} onClick={() => handleAction(req.submission_id, 'REJECT_RESUBMISSION')} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2">
                                                <XCircle size={16}/> Reject
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-slate-500 font-medium max-w-[200px] text-center mb-1">To recheck, go to the <strong>Review Work</strong> tab and update their grade. Or clear this notification below.</p>
                                            <button disabled={processingId === req.submission_id} onClick={() => handleAction(req.submission_id, 'RESOLVE_RECHECK')} className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
                                                <CheckCircle size={16}/> Mark as Resolved
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}