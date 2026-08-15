import React, { useEffect, useState } from "react";
import axios from "../api/axiosConfig";
import {
  dismissPermissionPrompt,
  getNotificationPermission,
  notificationSupported,
  requestNotificationPermission,
  setBrowserNotifyEnabled,
  wasPermissionPromptDismissed,
} from "../utils/browserNotify";

export function NotificationPermissionBanner({ enabled, onGranted }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notificationSupported()) return;
    if (wasPermissionPromptDismissed()) return;
    if (getNotificationPermission() === "granted") return;
    if (getNotificationPermission() === "denied") return;
    if (enabled === false) return;
    setVisible(true);
  }, [enabled]);

  if (!visible) return null;

  const enable = async () => {
    const result = await requestNotificationPermission();
    if (result === "granted") {
      setBrowserNotifyEnabled(true);
      try {
        await axios.put("/users/preferences", { browserNotifications: true });
      } catch {
        /* still show popups locally */
      }
      onGranted?.();
      setVisible(false);
      return;
    }
    if (result === "denied") setVisible(false);
  };

  return (
    <div className="notify-banner" role="status">
      <div className="min-width-0">
        <strong>Turn on desktop pop-ups</strong>
        <p className="saas-subtitle mb-0">
          Get reminders even if you switch tabs or lock the screen, as long as TaskFlow is open in the browser.
        </p>
      </div>
      <div className="notify-banner-actions">
        <button type="button" className="btn-new-task border-0" onClick={enable}>Enable</button>
        <button
          type="button"
          className="quiet-link"
          onClick={() => {
            dismissPermissionPrompt();
            setVisible(false);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
