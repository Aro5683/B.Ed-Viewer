const CACHE_NAME = 'bed-guru-cache-v1.1'; // 💡 Bumped version to force update

// Add the exact relative paths to the files you want to load offline
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
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

// 3. Fetch Event - NOW NETWORK-FIRST FOR PAGES
self.addEventListener('fetch', event => {
  // Let Google Drive links or external WhatsApp groups pass through untouched
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // If the user is navigating to a page (HTML request), use Network-First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Save a fresh copy to cache for offline use
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // If internet is down, load the page from cache
          return caches.match(event.request);
        })
    );
  } else {
    // For images, CSS, and structural files, keep the fast Cache-First strategy
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          console.log('Asset asset fetch failed offline.');
        });
      })
    );
  }
});
