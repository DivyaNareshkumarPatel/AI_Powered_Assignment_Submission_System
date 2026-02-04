'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, Lock, ArrowRight, Loader2, School } from 'lucide-react';
import { lookupUser, registerUser } from '@/utils/api';

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [enrollment, setEnrollment] = useState('');
  const [password, setPassword] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Lookup User
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

  // Step 2: Set Password
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await registerUser(enrollment, password);
      router.push('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl border border-gray-200 shadow-2xl shadow-gray-100 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
            <School className="w-8 h-8 text-slate-900" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Activate Account</h2>
          <p className="text-gray-500 text-sm mt-2">
            {step === 1 ? "Enter your Enrollment ID to verify identity" : `Welcome, ${userData?.name}`}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-gray-50 text-slate-900 text-sm rounded-lg border border-gray-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {error}
          </div>
        )}

        {/* FORM STEP 1: Lookup */}
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition text-slate-900 placeholder-gray-400"
                  required
                />
              </div>
            </div>
            <button 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Verify Identity <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* FORM STEP 2: Set Password */}
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition text-slate-900"
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Complete Registration"}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Already registered?{' '}
          <Link href="/login" className="text-slate-900 font-semibold hover:underline decoration-2 underline-offset-4">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}