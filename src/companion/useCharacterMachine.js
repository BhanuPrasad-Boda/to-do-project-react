import { useEffect, useRef, useState } from "react";
import { CHAR, SETTLE_MS, TRANSITION_MS } from "./characterStates";

export function useCharacterMachine(desired, { reduced = false } = {}) {
  const [state, setState] = useState(desired || CHAR.IDLE);
  const [phase, setPhase] = useState("hold");
  const currentRef = useRef(desired || CHAR.IDLE);

  useEffect(() => {
    const next = desired || CHAR.IDLE;
    if (next === currentRef.current) {
      setPhase("hold");
      return undefined;
    }
    if (reduced) {
      currentRef.current = next;
      setState(next);
      setPhase("hold");
      return undefined;
    }
    const leavingWalk = currentRef.current === CHAR.WALK && next !== CHAR.WALK;
    setPhase(leavingWalk ? "settle" : "anticipate");
    const timer = window.setTimeout(() => {
      currentRef.current = next;
      setState(next);
      setPhase("hold");
    }, leavingWalk ? SETTLE_MS : TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [desired, reduced]);

  return { state, phase };
}
