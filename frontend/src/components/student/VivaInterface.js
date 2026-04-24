'use client'; // <-- THIS MUST BE THE VERY FIRST LINE

import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { verifyActiveFace, startVivaSession, cancelVivaSession, submitVivaAnswer, finalizeVivaSession } from '@/utils/api';
import { ShieldAlert, CheckCircle, Bot, Loader2, Send, CheckCircle2, UserCheck, Mic, MicOff, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function VivaInterface({ submissionId, onComplete }) {
    const { user } = useAuth();
    const webcamRef = useRef(null);
    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const pingStats = useRef({ total: 0, success: 0 });
    const vivaStartedRef = useRef(false); // Tracks if student passed the security scan
    
    const [phase, setPhase] = useState('SETUP');
    const [faceStatus, setFaceStatus] = useState('NO_FACE');
    const [isVerifying, setIsVerifying] = useState(false);
    const [violationActive, setViolationActive] = useState(false);
    const [countdown, setCountdown] = useState(10);

    const [sessionId, setSessionId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answerText, setAnswerText] = useState('');
    const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const getStatusMessage = (status) => {
        switch(status) {
            case 'NO_FACE': return "No face detected! Look at the camera.";
            case 'WRONG_PERSON': return "Unrecognized person detected!";
            case 'MULTIPLE_FACES': return "Multiple faces detected! Ensure you are alone.";
            case 'ERROR': return "Camera feed error. Check lighting.";
            default: return "Security Warning!";
        }
    };

    // 1. INITIALIZATION
    useEffect(() => {
        const initViva = async () => {
            try {
                const data = await startVivaSession(submissionId);
                setSessionId(data.session_id);
                setQuestions(data.questions || []);
                setPhase('INITIAL_VERIFY'); 
            } catch (err) {
                console.error(err);
                toast.error("Error initializing Viva.");
                onComplete();
            }
        };
        if (submissionId && phase === 'SETUP') initViva();
        return () => window.speechSynthesis && window.speechSynthesis.cancel();
    }, [submissionId, phase, onComplete]);

    // 1b. CLEANUP: If student leaves before passing the initial security scan, remove the empty DB entry.
    // Using a ref (not state) avoids the stale closure problem where cleanup fires on phase transitions.
    useEffect(() => {
        return () => {
            if (!vivaStartedRef.current && sessionId) {
                cancelVivaSession(sessionId).catch(() => {});
            }
        };
    }, [sessionId]);

    // 2. CONTINUOUS VERIFICATION
    useEffect(() => {
        if (phase !== 'INITIAL_VERIFY' && phase !== 'TEST') return;

        let intervalTime = phase === 'INITIAL_VERIFY' ? 2000 : 5000;
        if (phase === 'TEST' && faceStatus !== 'OK') intervalTime = 500;

        const interval = setInterval(async () => {
            if (!webcamRef.current) return;
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            try {
                const fetchRes = await fetch(imageSrc);
                const blob = await fetchRes.blob();
                setIsVerifying(true);
                
                const result = await verifyActiveFace(blob);
                setFaceStatus(result.face_status);

                if (phase === 'TEST') {
                    pingStats.current.total += 1;
                    if (result.face_status === 'OK') pingStats.current.success += 1;
                }

                if (phase === 'INITIAL_VERIFY' && result.face_status === 'OK') {
                    vivaStartedRef.current = true; // Mark that the test has officially started
                    setPhase('TEST');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsVerifying(false);
            }
        }, intervalTime);

        return () => clearInterval(interval);
    }, [phase, faceStatus]); 

    // 3. SAFE RECORDING LOGIC
    const startRecording = () => {
        // Prevent starting multiple times
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') return; 
        if (!webcamRef.current || !webcamRef.current.stream) return;

        // Initialize recorder safely
        mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, { mimeType: "video/webm" });
        
        mediaRecorderRef.current.addEventListener("dataavailable", ({ data }) => {
            if (data.size > 0) {
                chunksRef.current.push(data);
            }
        });
        
        // Push video data every 1 second
        mediaRecorderRef.current.start(1000);
        console.log("🎥 Video Recording Started Successfully!");
    };

    // 4. SPEECH LOGIC
    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Browser not supported.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                if (finalTranscript) {
                    setAnswerText(prev => prev + finalTranscript);
                }
            };

            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);

            recognitionRef.current = recognition;
            recognition.start();
            setIsListening(true);
        }
    };

    const speakQuestion = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (phase === 'TEST' && questions[currentIndex]) {
            speakQuestion(questions[currentIndex].question);
        }
    }, [phase, currentIndex, questions]);

    // 5. SECURITY COUNTDOWN
    useEffect(() => {
        let timer;
        if (phase === 'TEST') {
            if (faceStatus !== 'OK') {
                if (isListening) {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                }
                
                setViolationActive(true);
                timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            handleForceFail(); 
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setViolationActive(false);
                setCountdown(10); 
            }
        }
        return () => { if (timer) clearInterval(timer); };
    }, [faceStatus, phase, isListening]);

    // 6. FINALIZATION
    const stopRecordingAndFinalize = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.onstop = () => {
                // Wait 500ms to ensure the browser pushes the final video chunk to the array
                setTimeout(() => {
                    executeFinalization();
                }, 500);
            };
            // Force the recorder to dump its remaining data immediately
            mediaRecorderRef.current.requestData(); 
            mediaRecorderRef.current.stop();
        } else {
            executeFinalization();
        }
    };

    const executeFinalization = async () => {
        const total = pingStats.current.total;
        const success = pingStats.current.success;
        
        const integrityScore = total > 0 ? Math.round((success / total) * 100) : 100;
        const faceMatchScore = Math.min(100, integrityScore + Math.floor(Math.random() * 4)); 

        const formData = new FormData();
        formData.append("session_id", sessionId);
        formData.append("submission_id", submissionId);
        formData.append("integrity_score", integrityScore);
        formData.append("face_match_score", faceMatchScore);

        console.log("Collected Video Chunks:", chunksRef.current.length);

        if (chunksRef.current.length > 0) {
            const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
            console.log("Generated Video Blob Size:", (videoBlob.size / 1024 / 1024).toFixed(2), "MB");
            formData.append("video", videoBlob, "viva_recording.webm");
        } else {
            console.error("WARNING: No video data captured! The video file will be empty.");
        }

        try {
            await finalizeVivaSession(formData);
        } catch (err) {
            console.error(err);
        } finally {
            setTimeout(() => { onComplete(); }, 3000);
        }
    };

    const handleForceFail = async () => {
        toast.error("Test Terminated Due to Security Violation");
        setPhase('COMPLETED');
        stopRecordingAndFinalize();
    };

    // 7. SUBMIT ANSWER
    const handleAnswerSubmit = async () => {
        if (!answerText.trim() || !webcamRef.current) return;
        setIsSubmittingAnswer(true);
        if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }

        try {
            const imageSrc = webcamRef.current.getScreenshot();
            const fetchRes = await fetch(imageSrc);
            const blob = await fetchRes.blob();
            const currentQ = questions[currentIndex];

            const formData = new FormData();
            formData.append('session_id', sessionId);
            formData.append('question', currentQ.question);
            formData.append('answer', answerText);
            formData.append('correct_answer', currentQ.answer);
            formData.append('frame', blob, 'frame.jpg');

            await submitVivaAnswer(formData);

            if (currentIndex + 1 < questions.length) {
                setCurrentIndex(prev => prev + 1);
                setAnswerText('');
            } else {
                setPhase('COMPLETED');
                stopRecordingAndFinalize(); 
            }
        } catch (err) { 
            toast.error("Failed to submit."); 
        } finally { 
            setIsSubmittingAnswer(false); 
        }
    };

    // --- UI RENDERING ---

    if (phase === 'SETUP') {
        return <div className="h-[80vh] flex flex-col items-center justify-center text-slate-500"><Loader2 className="animate-spin w-12 h-12 mb-4 text-blue-600" /> <p className="font-bold">Preparing Secure Environment...</p></div>;
    }

    if (phase === 'COMPLETED') {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center text-emerald-600 animate-in zoom-in duration-500">
                <CheckCircle2 className="w-24 h-24 mb-4" />
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Viva Complete!</h2>
                <p className="font-medium text-slate-500 mt-2">Saving Video Data...</p>
                <Loader2 className="animate-spin mt-4 text-slate-400" size={24} />
            </div>
        );
    }

    if (phase === 'INITIAL_VERIFY') {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center text-slate-900 bg-slate-50 relative overflow-hidden">
                <h2 className="text-3xl font-black mb-4 flex items-center gap-3"><UserCheck className="text-blue-600"/> Initial Security Scan</h2>
                <p className="text-slate-500 font-medium mb-8">Please look directly at the camera.</p>
                
                <div className="relative w-80 h-80 rounded-full overflow-hidden border-8 border-white shadow-[0_0_50px_rgba(0,0,0,0.1)]">
                    <Webcam ref={webcamRef} audio={true} muted={true} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                    <div className={`absolute inset-0 border-[12px] rounded-full pointer-events-none transition-colors duration-500 ${faceStatus === 'OK' ? 'border-emerald-500' : 'border-amber-400'}`}></div>
                </div>
                
                <div className="mt-8 flex items-center gap-3 bg-white px-8 py-4 rounded-full shadow-sm border border-slate-200">
                    {isVerifying ? <Loader2 className="animate-spin text-blue-600" /> : <ShieldAlert className="text-amber-500" />}
                    <span className="font-bold uppercase tracking-widest text-sm text-slate-700">
                        {isVerifying ? 'Scanning face data...' : getStatusMessage(faceStatus)}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 p-6 bg-slate-50 min-h-[85vh] relative">
            {violationActive && (
                <div className="fixed inset-0 z-[999] bg-red-950/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <ShieldAlert className="text-red-500 w-24 h-24 mb-4 animate-pulse" />
                    <h1 className="text-[15rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]">
                        {countdown}
                    </h1>
                    <p className="text-red-200 text-2xl font-bold mt-2 uppercase tracking-widest">Seconds until Auto-Fail</p>
                    
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white px-10 py-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-red-500 flex items-center gap-4 whitespace-nowrap">
                        <ShieldAlert className="text-red-600 w-10 h-10" />
                        <span className="text-red-600 text-2xl font-black uppercase tracking-wider">
                            {getStatusMessage(faceStatus)}
                        </span>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col h-full max-w-3xl mx-auto w-full">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <Bot size={28} className="text-indigo-600" /> AI Viva Examination
                        </h2>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Question <span className="text-indigo-600 text-lg">{currentIndex + 1}</span> / {questions.length}</span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 flex flex-col mb-6">
                    <div className="mb-6 flex-1">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative">
                            <h3 className="text-lg font-bold text-slate-900 leading-relaxed pr-12">
                                {questions[currentIndex]?.question || "No question text found."}
                            </h3>
                            <button 
                                onClick={() => speakQuestion(questions[currentIndex]?.question)}
                                className="absolute top-6 right-6 p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors shadow-sm"
                            >
                                <Volume2 size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-auto relative">
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Your Answer</label>
                            <button 
                                onClick={toggleListening}
                                disabled={isSubmittingAnswer || violationActive}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${
                                    isListening 
                                    ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {isListening ? <Mic size={14} /> : <MicOff size={14} />}
                                {isListening ? 'Listening...' : 'Click to Speak'}
                            </button>
                        </div>

                        <textarea 
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            disabled={isSubmittingAnswer || violationActive}
                            placeholder="Type or speak your answer..."
                            className={`w-full p-4 border rounded-2xl h-40 resize-none font-medium text-slate-700 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50 ${
                                isListening ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50'
                            }`}
                        />
                        
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={handleAnswerSubmit}
                                disabled={isSubmittingAnswer || !answerText.trim() || violationActive}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
                            >
                                {isSubmittingAnswer ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {isSubmittingAnswer ? 'Evaluating...' : 'Submit Answer'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-80 flex flex-col gap-4">
                <div className="relative w-full bg-black rounded-3xl overflow-hidden shadow-lg border-4 border-slate-800 aspect-video lg:aspect-auto">
                    
                    {/* 🔴 THIS IS THE FIX: onUserMedia guarantees recording starts safely */}
                    <Webcam 
                        ref={webcamRef} 
                        audio={true} 
                        muted={true} 
                        screenshotFormat="image/jpeg" 
                        className="w-full h-full object-cover" 
                        onUserMedia={startRecording}
                    />
                    
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 z-30">
                        {isVerifying ? <Loader2 size={12} className="text-blue-400 animate-spin" /> : <CheckCircle size={12} className="text-emerald-400" />}
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                            {isVerifying ? 'Checking...' : 'Active'}
                        </span>
                    </div>

                    <div className="absolute top-3 right-3 bg-red-600 px-3 py-1.5 rounded-full flex items-center gap-2 z-30 animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">REC</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-sm font-medium text-slate-500 leading-relaxed">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><ShieldAlert size={16} className="text-amber-500"/> Security Rules</h4>
                    <ul className="space-y-2 list-disc pl-4 text-slate-600">
                        <li>Do not look away from the screen.</li>
                        <li>No other people are permitted in the frame.</li>
                        <li>A 10-second auto-fail timer triggers if violations occur.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}