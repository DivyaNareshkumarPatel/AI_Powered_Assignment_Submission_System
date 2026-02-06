'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, Lock, ArrowRight, Loader2, School, Camera, RefreshCcw, Check } from 'lucide-react';
import { lookupUser, registerUser, uploadFace } from '@/utils/api';

export default function SignupPage() {
  const router = useRouter();

  // Steps: 1=Lookup, 2=Password, 3=FaceUpload
  const [step, setStep] = useState(1);
  const [enrollment, setEnrollment] = useState('');
  const [password, setPassword] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Camera State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);

  // --- Step 1: Lookup User ---
  const handleLookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await lookupUser(enrollment);
      setUserData(data); 
      setStep(2); 
    } catch (err) {
      setError(err.response?.data?.error || 'User not found. Contact Admin.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Set Password ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await registerUser(enrollment, password);
      // Instead of redirecting to login, move to Face Upload step
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Face Capture Functions ---
  const startCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraOn(true);
        }
    } catch (err) {
        setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        // Match canvas size to video size
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(videoRef.current, 0, 0);
        
        // Convert to Blob for upload and DataURL for preview
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);

        canvasRef.current.toBlob((blob) => {
            setImageBlob(blob);
        }, 'image/jpeg');

        // Stop camera stream
        const stream = videoRef.current.srcObject;
        const tracks = stream?.getTracks();
        tracks?.forEach(track => track.stop());
        setIsCameraOn(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setImageBlob(null);
    startCamera();
  };

  const handleFaceUpload = async () => {
    if (!imageBlob) return;
    setLoading(true);
    try {
        await uploadFace(enrollment, imageBlob);
        router.push('/login?registered=true');
    } catch (err) {
        setError("Face upload failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  // Auto-start camera when entering Step 3
  useEffect(() => {
    if (step === 3) startCamera();
    // Cleanup on unmount
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    };
  }, [step]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-2xl shadow-gray-100 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
            {step === 3 ? <Camera className="w-8 h-8 text-slate-900" /> : <School className="w-8 h-8 text-slate-900" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
             {step === 3 ? "Register Face ID" : "Activate Account"}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            {step === 1 ? "Enter your Enrollment ID to verify identity" : 
             step === 2 ? `Welcome, ${userData?.name}` : 
             "Capture a clear photo for exam verification"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-gray-50 text-slate-900 text-sm rounded-lg border border-gray-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {error}
          </div>
        )}

        {/* --- STEP 1: Lookup --- */}
        {step === 1 && (
          <form onSubmit={handleLookup} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Enrollment Number</label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  value={enrollment}
                  onChange={(e) => setEnrollment(e.target.value)}
                  placeholder="e.g. 22012011010"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>
            <button disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-gray-200">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Verify Identity <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* --- STEP 2: Set Password --- */}
        {step === 2 && (
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="p-4 bg-gray-50 rounded-lg text-sm text-slate-700 border border-gray-100 space-y-1">
              <p><span className="font-semibold text-slate-900">Role:</span> {userData.role}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {userData.email}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-900"
                  required
                />
              </div>
            </div>
            <button disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-gray-200">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Next Step <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* --- STEP 3: Face Capture --- */}
        {step === 3 && (
            <div className="space-y-5">
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-300">
                    {/* Live Video */}
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        className={`w-full h-full object-cover ${!isCameraOn || capturedImage ? 'hidden' : 'block'}`} 
                    />
                    
                    {/* Captured Image Preview */}
                    {capturedImage && (
                        <img 
                            src={capturedImage} 
                            alt="Captured" 
                            className="w-full h-full object-cover" 
                        />
                    )}

                    {/* Hidden Canvas */}
                    <canvas ref={canvasRef} className="hidden" />

                    {!isCameraOn && !capturedImage && (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                            <p>Starting Camera...</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    {!capturedImage ? (
                        <button 
                            onClick={capturePhoto} 
                            className="flex-1 bg-slate-900 hover:bg-black text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                        >
                            <Camera size={20} /> Capture Photo
                        </button>
                    ) : (
                        <button 
                            onClick={retakePhoto} 
                            className="flex-1 bg-white border border-gray-300 text-slate-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                        >
                            <RefreshCcw size={20} /> Retake
                        </button>
                    )}
                </div>

                {capturedImage && (
                    <button 
                        onClick={handleFaceUpload} 
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Finish Registration <Check className="w-4 h-4" /></>}
                    </button>
                )}
            </div>
        )}

        {/* Footer Link */}
        {step === 1 && (
            <div className="mt-8 text-center text-sm text-gray-500">
            Already registered?{' '}
            <Link href="/login" className="text-slate-900 font-semibold hover:underline decoration-2 underline-offset-4">
                Login here
            </Link>
            </div>
        )}
      </div>
    </div>
  );
}