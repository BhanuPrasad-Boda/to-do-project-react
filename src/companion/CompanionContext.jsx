import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchAccountOnboarding } from "./assistantClient";

const CompanionContext = createContext(null);

const EMPTY_SNAPSHOT = {
  pathname: "",
  view: "tasks",
  filter: "all",
  todos: [],
  stats: null,
  prefs: {},
  unread: 0,
};

const EMPTY_ACCOUNT = {
  loaded: false,
  onboardingStatus: "NOT_STARTED",
  currentTourStep: 0,
};

export function CompanionProvider({ children }) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [event, setEvent] = useState(null);
  const [tourNonce, setTourNonce] = useState(0);
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const actionsRef = useRef({});
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const publishSnapshot = useCallback((next) => {
    setSnapshot((prev) => ({
      ...prev,
      ...next,
      prefs: next.prefs && Object.keys(next.prefs).length ? next.prefs : prev.prefs,
    }));
    if (next.onboardingStatus) {
      setAccount((prev) => ({
        ...prev,
        loaded: true,
        onboardingStatus: next.onboardingStatus,
        currentTourStep: next.currentTourStep ?? prev.currentTourStep,
      }));
    }
  }, []);

  const registerActions = useCallback((actions) => {
    actionsRef.current = actions || {};
  }, []);

  const emitEvent = useCallback((name) => {
    setEvent({ name, at: Date.now() });
  }, []);

  const requestTour = useCallback(() => {
    setTourNonce((value) => value + 1);
  }, []);

  const clearEvent = useCallback(() => setEvent(null), []);

  const refreshAccount = useCallback(async () => {
    const auth = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!auth) {
      setAccount(EMPTY_ACCOUNT);
      return;
    }
    try {
      const data = await fetchAccountOnboarding();
      setAccount({
        loaded: true,
        onboardingStatus: data.onboardingStatus || "COMPLETED",
        currentTourStep: Number(data.currentTourStep) || 0,
      });
    } catch {
      setAccount({ loaded: true, onboardingStatus: "COMPLETED", currentTourStep: 0 });
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setAccount(EMPTY_ACCOUNT);
      return;
    }
    refreshAccount();
  }, [token, refreshAccount]);

  const setOnboarding = useCallback((next) => {
    setAccount((prev) => ({ ...prev, loaded: true, ...next }));
  }, []);

  const value = useMemo(
    () => ({
      snapshot,
      event,
      account,
      publishSnapshot,
      registerActions,
      getActions: () => actionsRef.current,
      emitEvent,
      requestTour,
      tourNonce,
      clearEvent,
      refreshAccount,
      setOnboarding,
    }),
    [snapshot, event, account, tourNonce, publishSnapshot, registerActions, emitEvent, requestTour, clearEvent, refreshAccount, setOnboarding]
  );

  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>;
}

export function useCompanion() {
  const ctx = useContext(CompanionContext);
  if (!ctx) {
    return {
      snapshot: EMPTY_SNAPSHOT,
      event: null,
      account: EMPTY_ACCOUNT,
      publishSnapshot: () => {},
      registerActions: () => {},
      getActions: () => ({}),
      emitEvent: () => {},
      requestTour: () => {},
      tourNonce: 0,
      clearEvent: () => {},
      refreshAccount: () => {},
      setOnboarding: () => {},
    };
  }
  return ctx;
}
