const CACHE_NAME = 'bed-guru-cache-v1.0';

// Add the exact relative paths to the files you want to load offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // 💡 Add your CSS and main JS files here (e.g., '/style.css', '/app.js')
];

// 1. Install Event - Saves the layout files locally
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching App Shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Cleans up old cache versions if you update the app
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Removing old cache store:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetch Event - Serves files from cache if network fails
self.addEventListener('fetch', event => {
  // Let Google Drive links or external WhatsApp groups pass through untouched
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return the cached layout file immediately
        return cachedResponse;
      }

      // If it's not cached, fetch it from the internet
      return fetch(event.request).catch(() => {
        // Fallback behavior if network completely fails
        console.log('User is completely offline.');
      });
    })
  );
});

