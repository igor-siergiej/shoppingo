/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

// Mirror the previous generateSW runtimeCaching config.
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 2 })
);
registerRoute(({ url }) => url.pathname === '/config.json', new NetworkFirst({ cacheName: 'config-cache' }));

// Preserve the update-prompt flow: the app posts SKIP_WAITING when the user accepts an update.
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        void self.skipWaiting();
    }
});

self.addEventListener('push', (event: PushEvent) => {
    if (!event.data) {
        return;
    }
    let payload: { title?: string; body?: string; data?: { url?: string } };
    try {
        payload = event.data.json();
    } catch {
        payload = { title: 'Shoppingo', body: event.data.text() };
    }

    event.waitUntil(
        self.registration.showNotification(payload.title ?? 'Shoppingo', {
            body: payload.body ?? '',
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            data: payload.data ?? {},
        })
    );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();
    const targetUrl = (event.notification.data as { url?: string })?.url ?? '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    void client.focus();
                    if ('navigate' in client) {
                        void (client as WindowClient).navigate(targetUrl);
                    }
                    return;
                }
            }
            return self.clients.openWindow(targetUrl);
        })
    );
});
