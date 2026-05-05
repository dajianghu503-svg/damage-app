// Service Worker - PWAインストール可能にするための最低限の実装
// このアプリはオンライン前提のためキャッシュは行わない

self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

// ネットワークファーストで動作（キャッシュなし）
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request))
})
