const CACHE_NAME = 'attendance-tracker-v4';
const urlsToCache = [
  '/office-attendance-tracker/',
  '/office-attendance-tracker/index.html',
  '/office-attendance-tracker/styles.css',
  '/office-attendance-tracker/script.js'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Network first, fallback to cache (ensures you always get latest files)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache the new version
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // If network fails, use cache
        return caches.match(event.request);
      })
  );
});

// Clean up old caches and take control immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

