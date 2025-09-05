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
    
    if (event.action === 'stop') {
        // 停止アクションが選択された場合
        event.waitUntil(
            clients.matchAll().then((clientList) => {
                if (clientList.length > 0) {
                    clientList[0].postMessage({
                        action: 'stopAllTimers'
                    });
                    return clientList[0].focus();
                }
                return clients.openWindow('./index.html');
            })
        );
    } else {
        // 通常のクリック
        event.waitUntil(
            clients.matchAll().then((clientList) => {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('./index.html');
            })
        );
    }
});

self.addEventListener('notificationclose', (event) => {
    console.log('通知が閉じられました:', event.notification.title);
});