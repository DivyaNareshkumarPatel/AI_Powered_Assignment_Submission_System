// src/components/NotificationSetup.js

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { requestNotificationPermission, subscribeUserToNotifications } from '@/utils/notificationManager';
import { Bell, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationSetup() {
  const { user, loading } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Always check notification status - keep asking if not enabled
      if ('Notification' in window) {
        const timer = setTimeout(() => {
          if (Notification.permission === 'granted') {
            // Already granted - subscribe
            setSubscribed(true);
            subscribeUserToNotifications().catch(err => console.error('Error subscribing:', err));
          } else if (Notification.permission === 'denied') {
            // Permanently denied - don't keep asking
            setShowPrompt(false);
          } else if (Notification.permission === 'default') {
            // Not yet decided - show prompt
            setShowPrompt(true);
          }
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [user, loading]);

  const handleEnableNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        const subscribeSuccess = await subscribeUserToNotifications();
        if (subscribeSuccess) {
          setShowPrompt(false);
          setSubscribed(true);
          toast.success('Notifications enabled! 🎉');
        } else {
          // Service worker registered but subscription pending
          toast.success('Setup in progress - check your permission dialog');
          setShowPrompt(false);
          setSubscribed(true);
        }
      } else {
        // User denied OR browser doesn't support notifications
        console.log('Notification permission not granted');
        setShowPrompt(false);
        toast.error('Please enable notifications in your browser settings to receive updates');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      toast.error('Could not enable notifications');
    }
  };

  const handleDismiss = () => {
    // Show the prompt again later - don't permanently dismiss
    setShowPrompt(false);
    // Re-prompt after 5 minutes if still visited
    setTimeout(() => {
      if (Notification.permission === 'default') {
        setShowPrompt(true);
      }
    }, 5 * 60 * 1000);
  };

  if (!showPrompt && !subscribed) {
    return null;
  }

  return (
    <>
      {showPrompt && (
        <div className="fixed bottom-4 right-4 bg-white border border-blue-200 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-in">
          <div className="flex items-start gap-3">
            <Bell className="text-blue-600 mt-1 flex-shrink-0 animate-bounce" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 mb-1">⚡ Enable Notifications</h3>
              <p className="text-sm text-slate-600 mb-3">
                Stay updated! Get real-time notifications when assignments are uploaded, marks are updated, and more.
              </p>
              <p className="text-xs text-slate-500 mb-3">
                We'll keep asking until you enable notifications - they're important for staying on top of your assignments!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                  Enable Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition"
                >
                  Remind Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0 mt-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {subscribed && (
        <div className="fixed bottom-4 right-4 bg-emerald-50 border border-emerald-200 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-pulse">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle size={20} />
            <span className="text-sm font-medium">Notifications enabled</span>
          </div>
        </div>
      )}
    </>
  );
}
