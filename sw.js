const CACHE_NAME = 'has-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './js/idb.js',
  './js/vfs.js',
  './js/editor.js',
  './js/tools.js',
  './js/toolsCatalog.js',
  './js/exporter.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});