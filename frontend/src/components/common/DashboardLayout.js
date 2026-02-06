'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children, role }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      
      if (role && user.role !== role.toUpperCase()) {
        if (user.role === 'TEACHER') router.push('/dashboard/teacher');
        else router.push('/dashboard/student');
        return;
      }
      
      setAuthorized(true);
    } catch (err) {
      localStorage.clear();
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
            <Loader2 className="animate-spin text-slate-900 w-10 h-10 mx-auto mb-4" />
            <p className="text-slate-500">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}