const CACHE = 'marquisat-v3';
const ASSETS = ['/', '/index.html', '/manifest.json'];
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
  // Démarrer l'écoute ntfy depuis le Service Worker
  demarrerNtfy();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('cloudinary.com') ||
      e.request.url.includes('ntfy.sh')) return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).catch(() => caches.match('/index.html'))
    )
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('agendadumarquisat') && 'focus' in client)
          return client.focus();
      }
      return clients.openWindow('https://agendadumarquisat.netlify.app');
    })
  );
});

// Écoute ntfy en SSE depuis le Service Worker (fonctionne en arrière-plan)
function demarrerNtfy() {
  try {
    const es = new EventSource('https://ntfy.sh/' + NTFY_TOPIC + '/sse');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'message') {
          self.registration.showNotification(data.title || 'Agenda du Marquisat', {
            body: data.message || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: 'https://agendadumarquisat.netlify.app' }
          });
        }
      } catch(err) {}
    };
    es.onerror = () => {
      es.close();
      // Réessayer après 30 secondes si la connexion se coupe
      setTimeout(demarrerNtfy, 30000);
    };
  } catch(err) {}
}
