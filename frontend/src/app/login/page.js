// src/app/login/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, LogIn, Loader2 } from 'lucide-react';
import { loginUser } from '@/utils/api';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth(); // Destructure login from context
  
  const [enrollment, setEnrollment] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check if redirected from signup
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMsg('Account activated successfully! Please login.');
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await loginUser(enrollment, password);
      
      // 1. Update Auth Context (Handles localStorage internally)
      login({ name: data.name, role: data.role }, data.token);

      // 2. Redirect based on Role
      if (data.role === 'TEACHER') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-slate-100">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to access your dashboard</p>
        </div>

        {/* Success / Error Messages */}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100 text-center">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment Number</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={enrollment}
                onChange={(e) => setEnrollment(e.target.value)}
                placeholder="22012011010"
                className="text-slate-600 w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="text-slate-600 w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                required
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Sign In <LogIn className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          First time here?{' '}
          <Link href="/signup" className="text-blue-600 font-medium hover:underline">
            Activate your account
          </Link>
        </div>
      </div>
    </div>
  );
}