// Raaghas Admin — Minimal Service Worker for Standalone PWA Support
const CACHE_NAME = 'raaghas-admin-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch request to network cleanly to prevent Safari hangs
  event.respondWith(fetch(event.request));
});
