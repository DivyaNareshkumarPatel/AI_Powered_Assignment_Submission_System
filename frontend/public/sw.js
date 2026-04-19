// Service Worker for push notifications

console.log('Service Worker loaded');

self.addEventListener('install', () => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service Worker activated');
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('Push received');
  let payload = {};
  
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Error parsing payload:', e);
    payload = {
      title: 'Notification',
      body: event.data ? event.data.text() : 'New notification'
    };
  }

  const options = {
    body: payload.body || 'New notification',
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/badge-72x72.png',
    tag: payload.type || 'notification',
    requireInteraction: false,
    data: payload.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Notification', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].url === url && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', () => {
  console.log('Notification closed');
});

