self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "NOTIFY") return;
  const payload = data.payload || {};
  event.waitUntil(
    self.registration.showNotification(payload.title || "TaskFlow", {
      body: payload.body || "",
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: payload.tag || "taskflow",
      renotify: true,
      requireInteraction: true,
      data: {
        url: payload.url || "/user-dashboard",
        taskId: payload.taskId || null,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/user-dashboard";
  const taskId = event.notification.data?.taskId || null;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          client.postMessage({ type: "NOTIFICATION_CLICK", url: target, taskId });
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
