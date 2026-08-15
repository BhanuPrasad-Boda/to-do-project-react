import { useEffect, useState } from "react";
import { CHAR } from "./characterStates";

export function useChoreography(beats, { reduced = false } = {}) {
  const [index, setIndex] = useState(0);
  const key = (beats || []).map((beat) => `${beat.state}:${beat.ms}:${beat.persist ? 1 : 0}`).join("|");

  useEffect(() => {
    setIndex(0);
  }, [key]);

  useEffect(() => {
    const list = beats || [];
    if (!list.length) return undefined;
    if (reduced) {
      setIndex(list.length - 1);
      return undefined;
    }
    const beat = list[Math.min(index, list.length - 1)];
    if (!beat || beat.persist || !beat.ms) return undefined;
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(current + 1, list.length - 1));
    }, beat.ms);
    return () => window.clearTimeout(timer);
  }, [beats, index, key, reduced]);

  const list = beats || [];
  const beat = list[Math.min(index, Math.max(list.length - 1, 0))];
  return beat?.state || CHAR.IDLE;
}
