// src/components/ProtectedRoute.js
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in -> Redirect to login
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Logged in but wrong role -> Redirect to their allowed dashboard
        if (user.role === 'TEACHER') {
          router.push('/dashboard/teacher');
        } else {
          router.push('/dashboard/student');
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  // Show loading spinner while checking auth
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-slate-900" />
      </div>
    );
  }

  // If role validation fails (but user is logged in), return null to prevent flash of content
  // The useEffect above will handle the redirect.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}