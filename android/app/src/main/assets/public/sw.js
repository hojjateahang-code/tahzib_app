self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'پیام جدید';
  const options = {
    body: data.body || 'شما یک پیام جدید دارید.',
    icon: '/vite.svg',
    badge: '/vite.svg'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
