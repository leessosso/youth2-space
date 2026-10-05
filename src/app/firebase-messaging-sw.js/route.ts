import { getClientFirebaseConfig } from "@/lib/firebase-client";

const FIREBASE_VERSION = "11.6.0";

function buildServiceWorkerSource(): string {
  const config = getClientFirebaseConfig();
  if (!config) {
    return "// Web push is not configured (missing NEXT_PUBLIC_FIREBASE_* env vars).\n";
  }

  const configJson = JSON.stringify(config);

  return `importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js');

firebase.initializeApp(${configJson});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || '2청년회';
  const body = payload.notification?.body || payload.data?.body || '';
  const url = payload.fcmOptions?.link || payload.data?.url || '/dashboard';
  const tag = payload.notification?.tag || payload.data?.tag;
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    data: { url },
    ...(tag ? { tag } : {}),
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
`;
}

export async function GET() {
  return new Response(buildServiceWorkerSource(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
