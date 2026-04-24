// Service Worker for push notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: 'Notification',
      body: event.data ? event.data.text() : 'New notification'
    };
  }

  const options = {
    body: payload.body || 'New notification',
    tag: payload.type || 'notification',
    requireInteraction: false,
    data: payload.data || {}
  };
  
  if (payload.icon) options.icon = payload.icon;
  if (payload.badge) options.badge = payload.badge;

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Notification', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === url && 'focus' in client) {
        return client.focus();
      }
    }

    if (clients.openWindow) {
      return clients.openWindow(url);
    }
  })());
});

self.addEventListener('notificationclose', () => {
});