import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import {
  notifyNewItems,
  registerNotificationWorker,
  rememberExistingNotifications,
  getNotificationPermission,
} from "../utils/browserNotify";

const POLL_MS = 20000;

export function BrowserNotificationWatcher() {
  const navigate = useNavigate();
  const primed = useRef(false);

  useEffect(() => {
    registerNotificationWorker();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const onMessage = (event) => {
      if (event.data?.type !== "NOTIFICATION_CLICK") return;
      if (event.data.taskId) {
        navigate(`/edit-appointment/${event.data.taskId}`);
        return;
      }
      navigate(event.data.url || "/user-dashboard");
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

  useEffect(() => {
    const poll = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        primed.current = false;
        return;
      }
      try {
        const res = await axios.get("/notifications", { params: { unread: "true" } });
        const items = res.data.items || [];
        window.dispatchEvent(
          new CustomEvent("tf-unread", { detail: { unread: res.data.unread || items.length, items } })
        );
        if (!primed.current) {
          rememberExistingNotifications(items);
          primed.current = true;
          return;
        }
        if (getNotificationPermission() === "granted" && localStorage.getItem("tf_browser_notify") !== "0") {
          await notifyNewItems(items);
        }
      } catch {
        /* stay quiet while logged out or offline */
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
