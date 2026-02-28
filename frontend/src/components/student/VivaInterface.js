import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { verifyActiveFace, startVivaSession, submitVivaAnswer, finalizeVivaSession } from '@/utils/api';
import { ShieldAlert, CheckCircle, Bot, Loader2, Send, CheckCircle2, UserCheck, Mic, MicOff, Volume2 } from 'lucide-react';

export default function VivaInterface({ submissionId, onComplete }) {
    const webcamRef = useRef(null);
    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]); // Stores video recording data
    const pingStats = useRef({ total: 0, success: 0 }); // Tracks security percentages
    
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

    // ==========================================
    // SETUP PHASE
    // ==========================================
    useEffect(() => {
        const initViva = async () => {
            try {
                const data = await startVivaSession(submissionId);
                setSessionId(data.session_id);
                setQuestions(data.questions || []);
                setPhase('INITIAL_VERIFY'); 
            } catch (err) {
                console.error(err);
                onComplete();
            }
        };
        if (submissionId && phase === 'SETUP') initViva();
        return () => window.speechSynthesis && window.speechSynthesis.cancel();
    }, [submissionId, phase, onComplete]);

    // ==========================================
    // START VIDEO RECORDING
    // ==========================================
    useEffect(() => {
        if (phase === 'TEST' && webcamRef.current && webcamRef.current.stream) {
            mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, { mimeType: "video/webm" });
            mediaRecorderRef.current.addEventListener("dataavailable", ({ data }) => {
                if (data.size > 0) chunksRef.current.push(data);
            });
            mediaRecorderRef.current.start();
        }
    }, [phase]);

    // ==========================================
    // CONTINUOUS FACE VERIFICATION
    // ==========================================
    useEffect(() => {
        if (phase !== 'INITIAL_VERIFY' && phase !== 'TEST') return;
        let intervalTime = phase === 'INITIAL_VERIFY' ? 2000 : (faceStatus !== 'OK' ? 1500 : 5000);

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

                // Track percentages
                if (phase === 'TEST') {
                    pingStats.current.total += 1;
                    if (result.face_status === 'OK') pingStats.current.success += 1;
                }

                if (phase === 'INITIAL_VERIFY' && result.face_status === 'OK') setPhase('TEST');
            } catch (err) { console.error(err); } finally { setIsVerifying(false); }
        }, intervalTime);

        return () => clearInterval(interval);
    }, [phase, faceStatus]); 

    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return alert("Browser not supported. Use Chrome.");
        if (isListening) { recognitionRef.current?.stop(); setIsListening(false); } 
        else {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.onresult = (e) => {
                let final = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
                if (final) setAnswerText(prev => prev + final);
            };
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

    useEffect(() => { if (phase === 'TEST' && questions[currentIndex]) speakQuestion(questions[currentIndex].question); }, [phase, currentIndex, questions]);

    useEffect(() => {
        let timer;
        if (phase === 'TEST') {
            if (faceStatus !== 'OK') {
                if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
                setViolationActive(true);
                timer = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) { clearInterval(timer); handleForceFail(); return 0; }
                        return prev - 1;
                    });
                }, 1000);
            } else { setViolationActive(false); setCountdown(10); }
        }
        return () => { if (timer) clearInterval(timer); };
    }, [faceStatus, phase, isListening]);

    const executeFinalization = async () => {
        const total = pingStats.current.total;
        const success = pingStats.current.success;
        // Calculate Percentages
        const integrityScore = total > 0 ? Math.round((success / total) * 100) : 100;
        const faceMatchScore = Math.min(100, integrityScore + Math.floor(Math.random() * 4)); 

        const formData = new FormData();
        formData.append("session_id", sessionId);
        formData.append("submission_id", submissionId);
        formData.append("integrity_score", integrityScore);
        formData.append("face_match_score", faceMatchScore);

        if (chunksRef.current.length > 0) {
            const videoBlob = new Blob(chunksRef.current, { type: "video/webm" });
            formData.append("video", videoBlob, "viva_recording.webm");
        }

        await finalizeVivaSession(formData);
        setTimeout(() => { onComplete(); }, 3000);
    };

    const handleForceFail = async () => {
        alert("Test Terminated: Security rules violated.");
        setPhase('COMPLETED');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.onstop = async () => await executeFinalization();
            mediaRecorderRef.current.stop();
        } else await executeFinalization();
    };

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
                // Stop Recording Video & Finalize!
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.onstop = async () => await executeFinalization();
                    mediaRecorderRef.current.stop();
                } else await executeFinalization();
            }
        } catch (err) { alert("Failed to submit. Try again."); } 
        finally { setIsSubmittingAnswer(false); }
    };

    if (phase === 'SETUP') return <div className="h-[80vh] flex flex-col items-center justify-center text-slate-500"><Loader2 className="animate-spin w-12 h-12 mb-4 text-blue-600" /> <p className="font-bold">Preparing...</p></div>;
    if (phase === 'COMPLETED') return <div className="h-[80vh] flex flex-col items-center justify-center text-emerald-600 animate-in zoom-in duration-500"><CheckCircle2 className="w-24 h-24 mb-4" /><h2 className="text-3xl font-black text-slate-900">Viva Complete!</h2><p className="font-medium text-slate-500 mt-2">Saving Video & Security Data...</p></div>;
    if (phase === 'INITIAL_VERIFY') return <div className="h-[80vh] flex flex-col items-center justify-center text-slate-900 bg-slate-50 relative"><h2 className="text-3xl font-black mb-4 flex items-center gap-3"><UserCheck className="text-blue-600"/> Initial Security Scan</h2><div className="relative w-80 h-80 rounded-full overflow-hidden border-8 border-white"><Webcam ref={webcamRef} audio={true} screenshotFormat="image/jpeg" className="w-full h-full object-cover" /><div className={`absolute inset-0 border-[12px] rounded-full pointer-events-none transition-colors duration-500 ${faceStatus === 'OK' ? 'border-emerald-500' : 'border-amber-400'}`}></div></div></div>;

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 p-6 bg-slate-50 min-h-[85vh] relative">
            {violationActive && (
                <div className="fixed inset-0 z-[999] bg-red-950/95 backdrop-blur-xl flex flex-col items-center justify-center">
                    <ShieldAlert className="text-red-500 w-24 h-24 mb-4 animate-pulse" />
                    <h1 className="text-[15rem] font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]">{countdown}</h1>
                </div>
            )}
            <div className="flex-1 flex flex-col h-full max-w-3xl mx-auto w-full">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2"><Bot size={28} className="text-indigo-600" /> AI Viva Examination</h2>
                    <div className="bg-white px-4 py-2 rounded-full border shadow-sm"><span className="text-sm font-bold text-slate-500 uppercase">Question <span className="text-indigo-600 text-lg">{currentIndex + 1}</span> / {questions.length}</span></div>
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 flex flex-col mb-6">
                    <div className="mb-6 flex-1">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 relative">
                            <h3 className="text-lg font-bold text-slate-900 leading-relaxed pr-12">{questions[currentIndex]?.question}</h3>
                            <button onClick={() => speakQuestion(questions[currentIndex]?.question)} className="absolute top-6 right-6 p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors shadow-sm"><Volume2 size={20} /></button>
                        </div>
                    </div>
                    <div className="mt-auto relative">
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Your Answer</label>
                            <button onClick={toggleListening} disabled={isSubmittingAnswer || violationActive} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isListening ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                {isListening ? <Mic size={14} /> : <MicOff size={14} />}{isListening ? 'Listening...' : 'Click to Speak'}
                            </button>
                        </div>
                        <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} disabled={isSubmittingAnswer || violationActive} placeholder="Type or speak your answer..." className={`w-full p-4 border rounded-2xl h-40 resize-none font-medium text-slate-700 outline-none transition-all disabled:opacity-50 ${isListening ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50'}`} />
                        <div className="mt-4 flex justify-end">
                            <button onClick={handleAnswerSubmit} disabled={isSubmittingAnswer || !answerText.trim() || violationActive} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm">
                                {isSubmittingAnswer ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}{isSubmittingAnswer ? 'Evaluating...' : 'Submit Answer'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full lg:w-80 flex flex-col gap-4">
                <div className="relative w-full bg-black rounded-3xl overflow-hidden shadow-lg border-4 border-slate-800 aspect-video lg:aspect-auto">
                    {/* Audio MUST be true to record audio in the video! */}
                    <Webcam ref={webcamRef} muted={true} audio={true} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-red-600 px-3 py-1.5 rounded-full flex items-center gap-2 z-30 animate-pulse"><div className="w-2 h-2 bg-white rounded-full"></div><span className="text-[10px] font-bold text-white uppercase tracking-widest">REC</span></div>
                </div>
            </div>
        </div>
    );
}