// Minimal service worker for PWA offline shell (extend later)
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  self.clients.claim()
})

self.addEventListener('fetch', () => {
  // No caching strategy yet; placeholder
})
