/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = event.data ? { body: event.data.text() } : {};
  }

  const title = payload.title || 'Notificación';
  const body = payload.body || '';
  const actionUrl = payload.actionUrl || null;
  const notificationId = payload.notificationId || null;
  const notificationType = payload.type || null;
  const notificationData = payload.data || null;

  const notifyPromise = self.registration.showNotification(title, {
    body,
    tag: notificationId || undefined,
    data: { actionUrl, notificationId },
  });

  // Inform the page so it can refresh the header list.
  const syncPromise = (async () => {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    for (const client of clientList) {
      client.postMessage({ type: 'NOTIFICATIONS_UPDATED', notificationId, notificationType, notificationData });
    }
  })();

  event.waitUntil(Promise.all([notifyPromise, syncPromise]));
});

const getNavigationUrlFromAction = (actionUrl) => {
  if (typeof actionUrl !== 'string') return '/';
  const legacyMatch = actionUrl.match(/^\/clients\/([^/?#]+)/);
  if (legacyMatch && legacyMatch[1]) {
    return `/?view=clients&clientId=${encodeURIComponent(legacyMatch[1])}`;
  }
  return actionUrl;
};

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrl = event.notification.data && event.notification.data.actionUrl;

  event.waitUntil(
    (async () => {
      if (actionUrl) {
        return self.clients.openWindow(getNavigationUrlFromAction(actionUrl));
      }
      return self.clients.openWindow('/');
    })()
  );
});

