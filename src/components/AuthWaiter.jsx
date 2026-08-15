import { useEffect, useState } from "react";

const PRESETS = {
  login: ["Checking your details", "Signing you in", "Opening your workspace"],
  verify: ["Checking the code", "Confirming your email", "Finishing up"],
  send: ["Preparing your code", "Sending the email", "Almost there"],
};

export function AuthWaiter({ kind = "login", label }) {
  const steps = PRESETS[kind] || PRESETS.login;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((value) => Math.min(value + 1, steps.length - 1));
    }, 850);
    return () => window.clearInterval(timer);
  }, [steps.length]);

  const message = label || steps[tick];
  const progress = ((tick + 1) / steps.length) * 100;

  return (
    <div className={`auth-wait auth-wait-${kind}`} role="status" aria-live="polite" aria-busy="true">
      {kind === "verify" ? (
        <div className="auth-lock" aria-hidden="true">
          <span className="auth-lock-ring" />
          {Array.from({ length: 6 }, (_, index) => (
            <i key={index} className="auth-lock-tick" style={{ transform: `rotate(${index * 60}deg)` }} />
          ))}
          <span className="auth-lock-core" />
        </div>
      ) : (
        <div className="auth-wait-orbit" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="auth-wait-pip" style={{ animationDelay: `${index * 90}ms` }} />
          ))}
        </div>
      )}
      <p className="auth-wait-copy">{message}</p>
      <div className="auth-wait-bar" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function AuthWaitCover({ active, kind, children }) {
  return (
    <div className={`auth-wait-wrap${active ? " is-busy" : ""}`}>
      {children}
      {active ? (
        <div className="auth-wait-cover">
          <AuthWaiter kind={kind} />
        </div>
      ) : null}
    </div>
  );
}
