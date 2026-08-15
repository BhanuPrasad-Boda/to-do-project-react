import React, { useEffect, useRef, useState } from "react";

export function OtpInput({ value, onChange, disabled, error }) {
  const digits = (value || "").padEnd(6, " ").slice(0, 6).split("");
  const refs = useRef([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [burstIndex, setBurstIndex] = useState(-1);
  const filledCount = digits.filter((digit) => digit.trim()).length;
  const prevFilled = useRef(0);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (filledCount > prevFilled.current) {
      setBurstIndex(filledCount - 1);
      const timer = window.setTimeout(() => setBurstIndex(-1), 420);
      prevFilled.current = filledCount;
      return () => window.clearTimeout(timer);
    }
    prevFilled.current = filledCount;
    return undefined;
  }, [filledCount]);

  const setDigit = (index, char) => {
    const next = digits.map((d) => (d === " " ? "" : d));
    next[index] = char;
    onChange(next.join("").replace(/\s/g, "").slice(0, 6));
  };

  const handleChange = (index, raw) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      setDigit(index, "");
      return;
    }
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split("");
      const next = Array.from({ length: 6 }, (_, i) => pasted[i] || "");
      onChange(next.join(""));
      const focusAt = Math.min(pasted.length, 5);
      refs.current[focusAt]?.focus();
      return;
    }
    setDigit(index, cleaned);
    if (index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index].trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  };

  const stateClass = [
    "otp-pin",
    error ? "is-invalid" : "",
    disabled ? "is-checking" : "",
    filledCount === 6 && !error ? "is-complete" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={stateClass} style={{ "--otp-step": filledCount }}>
      <div className="otp-group" role="group" aria-label="6-digit verification code">
        <span className="otp-spark" aria-hidden="true" />
        {digits.map((digit, index) => {
          const filled = Boolean(digit.trim());
          const active = !disabled && index === focusIndex;
          return (
            <label
              key={index}
              className={`otp-key${filled ? " is-filled" : ""}${active ? " is-active" : ""}${burstIndex === index ? " is-burst" : ""}`}
            >
              <span className="otp-ink" aria-hidden="true" />
              <span className="otp-ripple" aria-hidden="true" />
              <input
                ref={(el) => {
                  refs.current[index] = el;
                }}
                className="otp-cell"
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                aria-label={`Digit ${index + 1}`}
                value={digit.trim()}
                disabled={disabled}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onFocus={(e) => {
                  setFocusIndex(index);
                  e.target.select();
                }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
