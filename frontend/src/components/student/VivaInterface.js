import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { verifyActiveFace } from '@/utils/api';
import { ShieldAlert, CheckCircle, Video, Bot, Loader2 } from 'lucide-react';

export default function VivaInterface({ submissionId, onComplete }) {
    const webcamRef = useRef(null);
    const [faceStatus, setFaceStatus] = useState('OK'); // 'OK', 'NO_FACE', 'WRONG_PERSON'
    const [isVerifying, setIsVerifying] = useState(false);

    // ==========================================
    // CONTINUOUS FACE VERIFICATION LOOP
    // ==========================================
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!webcamRef.current) return;
            
            // Capture the frame
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            // Convert base64 to Blob
            const fetchRes = await fetch(imageSrc);
            const blob = await fetchRes.blob();

            setIsVerifying(true);
            try {
                // Send to backend
                const result = await verifyActiveFace(blob);
                setFaceStatus(result.face_status); // Update status
            } catch (err) {
                console.error("Verification ping failed", err);
            } finally {
                setIsVerifying(false);
            }

        }, 5000); // Check every 5 seconds!

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 relative bg-slate-50 min-h-[80vh]">
            
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
                    <Bot size={36} className="text-indigo-600" /> AI Viva Examination
                </h2>
                <p className="text-slate-500 font-medium mt-2">Your camera is active. Do not look away from the screen.</p>
            </div>

            {/* Webcam & Status Container */}
            <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
                <Webcam
                    ref={webcamRef}
                    audio={true} // Needs audio for the Viva!
                    screenshotFormat="image/jpeg"
                    className="w-full h-auto"
                />

                {/* Status Indicator Overlay */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
                    {isVerifying ? <Loader2 size={14} className="text-blue-400 animate-spin" /> : 
                     faceStatus === 'OK' ? <CheckCircle size={14} className="text-emerald-400" /> : 
                     <ShieldAlert size={14} className="text-red-500" />}
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {isVerifying ? 'Analyzing Frame...' : faceStatus === 'OK' ? 'Identity Verified' : 'Security Warning'}
                    </span>
                </div>

                {/* RED LOCKDOWN OVERLAY (Triggers if Face Verification Fails) */}
                {faceStatus !== 'OK' && (
                    <div className="absolute inset-0 bg-red-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-50">
                        <ShieldAlert size={64} className="text-red-400 mb-4 animate-bounce" />
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
                            {faceStatus === 'NO_FACE' ? 'Face Not Detected!' : 'Unauthorized Person!'}
                        </h3>
                        <p className="text-red-200 font-medium text-sm">
                            {faceStatus === 'NO_FACE' 
                                ? 'Please look directly at the camera. The test is paused.' 
                                : 'The system detected an unrecognized face. Return to the frame immediately.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Placeholder for actual Viva Chat interface */}
            <div className="mt-8 w-full max-w-2xl bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center">
                <p className="text-slate-400 font-medium italic">Chat interface goes here in the next step...</p>
                <button onClick={() => onComplete()} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition">
                    [Debug] End Test Manually
                </button>
            </div>
        </div>
    );
}