const CACHE_NAME = 'has-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './js/idb.js',
  './js/vfs.js',
  './js/editor.js',
  './js/templates.js',
  './js/autocomplete.js',
  './js/tools.js',
  './js/toolsCatalog.js',
  './js/validator.js',
  './js/exporter.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js'
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