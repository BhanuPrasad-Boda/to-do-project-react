import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "../api/axiosConfig";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";
import {
  requestNotificationPermission,
  setBrowserNotifyEnabled,
} from "../utils/browserNotify";
import { CompanionSettings } from "../companion/CompanionSettings";

const DEFAULT_PREFS = {
  taskReminders: true,
  overdueAlerts: true,
  dailyPlanning: true,
  weeklySummary: true,
  endOfDay: true,
  emailNotifications: false,
  browserNotifications: true,
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
    defaultReminderMinutes: 30,
    autoPilot: true,
    autoRolloverOverdue: true,
    autoAdvanceRecurring: true,
    smartReminders: true,
    companionEnabled: true,
    companionProactive: true,
    companionCelebrations: true,
    companionGuidance: true,
  };

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`pref-toggle${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="pref-toggle-thumb" aria-hidden="true" />
    </button>
  );
}

function PrefRow({ title, hint, checked, onChange, disabled }) {
  return (
    <div className="pref-row">
      <div className="pref-copy">
        <strong>{title}</strong>
        <span>{hint}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

export function NotificationSettings({ preferences = {}, onSaved }) {
  const { theme, toggleTheme } = useTheme();
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS, ...preferences });
  const [saving, setSaving] = useState(false);
  const saveSeq = useRef(0);
  const prefsSnapshot = JSON.stringify({ ...DEFAULT_PREFS, ...preferences });

  useEffect(() => {
    setPrefs(JSON.parse(prefsSnapshot));
  }, [prefsSnapshot]);

  const persist = async (next) => {
    const seq = ++saveSeq.current;
    setSaving(true);
    try {
      const res = await axiosInstance.put("/users/preferences", next);
      if (seq !== saveSeq.current) return;
      const saved = res.data?.notificationPreferences || next;
      setPrefs({ ...DEFAULT_PREFS, ...saved });
      onSaved?.(saved);
    } catch {
      if (seq === saveSeq.current) {
        toast.error("Could not save preferences");
        setPrefs(JSON.parse(prefsSnapshot));
      }
    } finally {
      if (seq === saveSeq.current) setSaving(false);
    }
  };

  const togglePref = async (key, value) => {
    let nextValue = value;
    if (key === "browserNotifications" && value) {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        toast.info("Allow notifications in your browser, then try again.");
        nextValue = false;
      }
    }
    if (key === "browserNotifications") {
      setBrowserNotifyEnabled(nextValue);
    }
    const next = { ...prefs, [key]: nextValue };
    setPrefs(next);
    persist(next);
  };

  return (
    <section className="settings-panel">
      <div className="settings-head">
        <div className="page-kicker">Preferences</div>
        <h2 className="dash-heading">Settings</h2>
        <p>Toggles save as soon as you click them.</p>
      </div>

      <div className="pref-group">
        <h4>Appearance</h4>
        <PrefRow
          title="Dark mode"
          hint="Switch between light and dark theme"
          checked={theme === "dark"}
          onChange={toggleTheme}
        />
      </div>

      <div className="pref-group">
        <h4>Alerts</h4>
        <PrefRow
          title="Task reminders"
          hint="Upcoming due dates and scheduled reminders"
          checked={Boolean(prefs.taskReminders)}
          onChange={(value) => togglePref("taskReminders", value)}
        />
        <PrefRow
          title="Overdue alerts"
          hint="Notify me when a task is past due"
          checked={Boolean(prefs.overdueAlerts)}
          onChange={(value) => togglePref("overdueAlerts", value)}
        />
        <PrefRow
          title="Daily planning"
          hint="Morning summary of today’s work"
          checked={Boolean(prefs.dailyPlanning)}
          onChange={(value) => togglePref("dailyPlanning", value)}
        />
        <PrefRow
          title="Weekly summary"
          hint="End-of-week recap of completed and open tasks"
          checked={Boolean(prefs.weeklySummary)}
          onChange={(value) => togglePref("weeklySummary", value)}
        />
        <PrefRow
          title="End of day"
          hint="Evening wrap-up of what is still open"
          checked={Boolean(prefs.endOfDay)}
          onChange={(value) => togglePref("endOfDay", value)}
        />
      </div>

      <div className="pref-group">
        <h4>Delivery</h4>
        <PrefRow
          title="Email notifications"
          hint="Send reminders to your inbox"
          checked={Boolean(prefs.emailNotifications)}
          onChange={(value) => togglePref("emailNotifications", value)}
        />
        <PrefRow
          title="Browser popups"
          hint="Windows/macOS alerts while TaskFlow is open, even in another tab"
          checked={Boolean(prefs.browserNotifications)}
          onChange={(value) => togglePref("browserNotifications", value)}
        />
      </div>

      <div className="pref-group">
        <h4>Autopilot</h4>
        <p className="pref-lead">
          One flow: leftover work is lined up first, then you get a single next action. Repeating tasks and reminder timing stay in the background.
        </p>
        <PrefRow
          title="Autopilot"
          hint="Line up leftovers, keep repeating work going, and time reminders for you"
          checked={prefs.autoPilot !== false}
          onChange={(value) => togglePref("autoPilot", value)}
        />
        {prefs.autoPilot !== false ? (
          <div className="pref-sub">
            <PrefRow
              title="Line up leftovers each morning"
              hint="Unfinished non-urgent tasks from earlier days slide into the next open slot"
              checked={prefs.autoRolloverOverdue !== false}
              onChange={(value) => togglePref("autoRolloverOverdue", value)}
            />
            <PrefRow
              title="Advance repeating tasks"
              hint="Schedule the next occurrence even if yesterday’s wasn’t checked off"
              checked={prefs.autoAdvanceRecurring !== false}
              onChange={(value) => togglePref("autoAdvanceRecurring", value)}
            />
            <PrefRow
              title="Smarter reminder timing"
              hint="High-priority work reminds you 2 hours ahead; low-priority stays light"
              checked={prefs.smartReminders !== false}
              onChange={(value) => togglePref("smartReminders", value)}
            />
          </div>
        ) : null}
      </div>

      <CompanionSettings prefs={prefs} onToggle={togglePref} />

      <div className="pref-group">
        <h4>Quiet hours</h4>
        <PrefRow
          title="Pause overnight"
          hint="Hold email and desktop popups until morning. The in-app inbox still updates."
          checked={Boolean(prefs.quietHoursEnabled)}
          onChange={(value) => togglePref("quietHoursEnabled", value)}
        />
        {prefs.quietHoursEnabled ? (
          <div className="quiet-grid">
            <label>
              Start
              <input
                type="time"
                className="input-premium"
                value={prefs.quietHoursStart}
                onChange={(e) => {
                  const next = { ...prefs, quietHoursStart: e.target.value };
                  setPrefs(next);
                  persist(next);
                }}
              />
            </label>
            <label>
              End
              <input
                type="time"
                className="input-premium"
                value={prefs.quietHoursEnd}
                onChange={(e) => {
                  const next = { ...prefs, quietHoursEnd: e.target.value };
                  setPrefs(next);
                  persist(next);
                }}
              />
            </label>
          </div>
        ) : null}
      </div>

      <label className="lead-label">
        Default reminder
        <select
          className="input-premium"
          value={prefs.defaultReminderMinutes}
          onChange={(e) => {
            const next = { ...prefs, defaultReminderMinutes: Number(e.target.value) };
            setPrefs(next);
            persist(next);
          }}
        >
          <option value={15}>15 minutes before</option>
          <option value={30}>30 minutes before</option>
          <option value={60}>1 hour before</option>
          <option value={1440}>1 day before</option>
        </select>
      </label>

      {saving ? <p className="settings-save-hint">Saving…</p> : null}
    </section>
  );
}
