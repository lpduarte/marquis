const CACHE = 'marquis-v3';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './favicon.svg',
  './favicon-light.png',
  './favicon-dark.png',
  './apple-touch-icon.png',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Literata:ital,wght@0,400;0,600;0,700;1,400&display=swap',
  'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // addAll is atomic; any 404 fails the install. Use individual puts
      // so a transient CDN hiccup doesn't brick the whole install.
      return Promise.all(ASSETS.map(function (url) {
        return fetch(url, { mode: 'no-cors' })
          .then(function (response) { return cache.put(url, response); })
          .catch(function () { /* skip assets that can't be fetched */ });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        // Runtime cache for any asset we fetch successfully
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () { return cached; });
    })
  );
});
