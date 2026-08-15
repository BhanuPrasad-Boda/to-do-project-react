import { useEffect, useState } from "react";
import { parseNaturalTask } from "./taskParser";

export function useSmartPreview(text, delay = 280) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const value = String(text || "").trim();
    if (!value || value.length < 3) {
      setPreview(null);
      return undefined;
    }

    const timer = setTimeout(() => {
      const next = parseNaturalTask(value);
      if (next?.title) setPreview(next);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay]);

  return preview;
}
