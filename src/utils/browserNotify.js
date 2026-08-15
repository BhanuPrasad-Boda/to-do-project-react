const SEEN_KEY = "tf_notified_ids";
const PERMISSION_DISMISS_KEY = "tf_notify_prompt_dismissed";

export function notificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission() {
  if (!notificationSupported()) return "denied";
  return Notification.permission;
}

export async function registerNotificationWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(`${process.env.PUBLIC_URL || ""}/sw.js`);
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!notificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function readSeenIds() {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeenIds(ids) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200)));
}

export function rememberExistingNotifications(items = []) {
  const seen = readSeenIds();
  items.forEach((item) => {
    if (item?._id) seen.add(String(item._id));
  });
  writeSeenIds(seen);
  return seen;
}

export async function showBrowserPopup(item) {
  if (!item || getNotificationPermission() !== "granted") return;
  const title = item.title || "TaskFlow";
  const body = item.body || "";
  const tag = String(item._id || item.taskId || title);
  const url = item.taskId ? `/edit-appointment/${item.taskId}` : "/user-dashboard";

  const registration = await registerNotificationWorker();
  if (registration?.showNotification) {
    try {
      await registration.showNotification(title, {
        body,
        icon: "/logo192.png",
        badge: "/logo192.png",
        tag,
        renotify: true,
        requireInteraction: true,
        data: { url, taskId: item.taskId || null },
      });
      return;
    } catch {
      /* fall through to page Notification */
    }
  }

  try {
    const popup = new Notification(title, {
      body,
      icon: "/logo192.png",
      tag,
      requireInteraction: true,
    });
    popup.onclick = () => {
      window.focus();
      window.location.assign(url);
      popup.close();
    };
  } catch {
    /* ignore */
  }
}

export async function notifyNewItems(items = []) {
  const seen = readSeenIds();
  const fresh = items.filter((item) => item?._id && !seen.has(String(item._id)));
  fresh.forEach((item) => seen.add(String(item._id)));
  writeSeenIds(seen);
  for (const item of fresh) {
    await showBrowserPopup(item);
  }
  return fresh.length;
}

export function setBrowserNotifyEnabled(on) {
  localStorage.setItem("tf_browser_notify", on ? "1" : "0");
}

export function isBrowserNotifyEnabled() {
  return localStorage.getItem("tf_browser_notify") !== "0";
}

export function wasPermissionPromptDismissed() {
  return sessionStorage.getItem(PERMISSION_DISMISS_KEY) === "1";
}

export function dismissPermissionPrompt() {
  sessionStorage.setItem(PERMISSION_DISMISS_KEY, "1");
}
