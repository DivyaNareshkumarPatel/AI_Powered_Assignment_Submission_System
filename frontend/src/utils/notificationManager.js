// src/utils/notificationManager.js

const subscribeUserToNotifications = async () => {
  try {
    // Check if browser supports Service Workers and Push API
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Browser does not support push notifications');
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered successfully');

    // Get VAPID public key from backend - with error handling
    let publicKey = '';
    try {
      const keyResponse = await fetch('/api/notifications/vapid-key');
      if (keyResponse.ok) {
        const { publicKey: key } = await keyResponse.json();
        publicKey = key;
      } else {
        console.warn('Backend API not ready yet, notification subscription will be retried');
        return false;
      }
    } catch (err) {
      console.warn('Cannot connect to backend for VAPID key. Make sure backend is running and `/api/notifications` routes are added.');
      return false;
    }

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      console.log('User subscribed to push notifications');
    } else {
      console.log('User already subscribed to push notifications');
    }

    // Send subscription to backend
    try {
      const subResponse = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subscription })
      });

      if (!subResponse.ok) {
        throw new Error('Failed to save subscription to backend');
      }

      console.log('Subscription saved to backend');
      return true;
    } catch (err) {
      console.warn('Could not save subscription to backend (API may not be ready):', err.message);
      // Still return true because Service Worker is registered
      return true;
    }
  } catch (err) {
    console.error('Error subscribing to push notifications:', err.message);
    return false;
  }
};

const unsubscribeUserFromNotifications = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify backend
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      console.log('User unsubscribed from push notifications');
    }

    return true;
  } catch (err) {
    console.error('Error unsubscribing from push notifications:', err);
    return false;
  }
};

const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
};

// Helper function to convert VAPID key
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export {
  subscribeUserToNotifications,
  unsubscribeUserFromNotifications,
  requestNotificationPermission
};
