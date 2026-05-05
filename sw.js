const CACHE = 'marquisat-v4';
const BASE = '/agenda-marquisat';
const ASSETS = [BASE + '/', BASE + '/index.html', BASE + '/manifest.json'];
const NTFY_TOPIC = 'agendadumarquisat';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
  demarrerNtfy();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('cloudinary.com') ||
      e.request.url.includes('ntfy.sh') ||
      e.request.url.includes('docs.google.com')) return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).catch(() => caches.match(BASE + '/index.html'))
    )
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('diway65000.github.io') && 'focus' in client)
          return client.focus();
      }
      return clients.openWindow('https://diway65000.github.io/agenda-marquisat');
    })
  );
});

function demarrerNtfy() {
  try {
    const es = new EventSource('https://ntfy.sh/' + NTFY_TOPIC + '/sse');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'message') {
          self.registration.showNotification(data.title || 'Agenda du Marquisat', {
            body: data.message || '',
            icon: BASE + '/icon-192.png',
            badge: BASE + '/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: 'https://diway65000.github.io/agenda-marquisat' }
          });
        }
      } catch(err) {}
    };
    es.onerror = () => { es.close(); setTimeout(demarrerNtfy, 30000); };
  } catch(err) {}
}
