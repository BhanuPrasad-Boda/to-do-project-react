import React from "react";
import { useCompanion } from "./CompanionContext";

export function CompanionSettings({ prefs, onToggle }) {
  const enabled = prefs.companionEnabled !== false;
  const { requestTour } = useCompanion();
  return (
    <div className="pref-group">
      <h4>Productivity assistant</h4>
      <div className="pref-row">
        <div className="pref-copy">
          <strong>Show assistant</strong>
          <span>Small guide in the corner. Turn off to hide it completely.</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Show assistant"
          className={`pref-toggle${enabled ? " is-on" : ""}`}
          onClick={() => onToggle("companionEnabled", !enabled)}
        >
          <span className="pref-toggle-thumb" aria-hidden="true" />
        </button>
      </div>
      <div className="pref-row">
        <div className="pref-copy">
          <strong>Proactive suggestions</strong>
          <span>Occasional tips when you start the day or something needs attention</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.companionProactive !== false}
          aria-label="Proactive suggestions"
          disabled={!enabled}
          className={`pref-toggle${prefs.companionProactive !== false ? " is-on" : ""}`}
          onClick={() => onToggle("companionProactive", prefs.companionProactive === false)}
        >
          <span className="pref-toggle-thumb" aria-hidden="true" />
        </button>
      </div>
      <div className="pref-row">
        <div className="pref-copy">
          <strong>Celebration messages</strong>
          <span>A short note when you complete work</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.companionCelebrations !== false}
          aria-label="Celebration messages"
          disabled={!enabled}
          className={`pref-toggle${prefs.companionCelebrations !== false ? " is-on" : ""}`}
          onClick={() => onToggle("companionCelebrations", prefs.companionCelebrations === false)}
        >
          <span className="pref-toggle-thumb" aria-hidden="true" />
        </button>
      </div>
      <div className="pref-row">
        <div className="pref-copy">
          <strong>Task guidance</strong>
          <span>Help with overdue work, deadlines, and daily planning</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.companionGuidance !== false}
          aria-label="Task guidance"
          disabled={!enabled}
          className={`pref-toggle${prefs.companionGuidance !== false ? " is-on" : ""}`}
          onClick={() => onToggle("companionGuidance", prefs.companionGuidance === false)}
        >
          <span className="pref-toggle-thumb" aria-hidden="true" />
        </button>
      </div>
      <h4>Help &amp; guidance</h4>
      <div className="pref-row">
        <div className="pref-copy">
          <strong>Product tour</strong>
          <span>Replay the walkthrough. This does not reset your tasks or onboarding status.</span>
        </div>
        <button
          type="button"
          className="companion-chip"
          disabled={!enabled}
          onClick={() => requestTour()}
        >
          Replay tour
        </button>
      </div>
    </div>
  );
}
