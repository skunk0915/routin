const CACHE_NAME = 'routine-timer-v3';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.webmanifest',
    './img/favicon/android-chrome-192x192.png',
    './img/favicon/android-chrome-512x512.png',
    './img/favicon/apple-touch-icon.png',
    './img/favicon/favicon-32x32.png',
    './img/favicon/favicon-16x16.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll().then((clientList) => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('./index.html');
        })
    );
});

self.addEventListener('notificationclose', (event) => {
    console.log('通知が閉じられました:', event.notification.title);
});