import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CompanionCharacter } from "./CompanionCharacter";
import { CompanionBubble } from "./CompanionBubble";
import { CompanionPanel } from "./CompanionPanel";
import { GuideBubble } from "./GuideBubble";
import { GuideHighlight } from "./GuideHighlight";
import { useCompanion } from "./CompanionContext";
import {
  buildCompanionContext,
  companionPrefs,
  isAuthRoute,
  isWithinQuietHours,
  moodFromMessage,
  selectProactiveMessage,
} from "./companionEngine";
import { isCoolingDown, loadCompanionMemory, markShown, rememberCounts } from "./companionStorage";
import {
  TOUR_STEPS,
  findGuideTarget,
  prefersReducedMotion,
  tourBubbleSize,
  tourCharSize,
  viewportSafeInsets,
} from "./guideTour";
import { placeGuide } from "./guidePositioner";
import { persistOnboarding } from "./assistantClient";
import { ONBOARDING, isAssistantMode, resumeStep, shouldAutoStartTour, shouldOfferResume } from "./onboarding";
import { CHAR, EVENT_TO_BURST, WALK_MS, shouldWalk, walkDirection } from "./characterStates";
import { buildTourBeats, holdForPose, talkingForPose } from "./tourChoreography";
import { useChoreography } from "./useChoreography";
import "./companion.css";

function actorFallback() {
  return { left: 12, top: Math.max(12, (typeof window !== "undefined" ? window.innerHeight : 800) - 140) };
}

function measureStep(step) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const char = tourCharSize(vw);
  const bubble = tourBubbleSize(vw);
  const safe = viewportSafeInsets(vw);
  const el = step.target
    ? findGuideTarget(step.target) || (step.fallback ? findGuideTarget(step.fallback) : null)
    : null;
  const placed = placeGuide({
    targetRect: el ? el.getBoundingClientRect() : null,
    viewport: { width: vw, height: vh },
    char,
    bubble,
    safe,
  });
  const gesture = step.gesture === "point" ? placed.gesture : step.gesture || placed.gesture;
  return { ...placed, gesture, hold: step.hold || null, charSize: char, stepId: step.id };
}

export default function ProductivityCompanion() {
  const location = useLocation();
  const navigate = useNavigate();
  const { snapshot, event, clearEvent, getActions, tourNonce, account, setOnboarding, requestTour } = useCompanion();
  const accountLoaded = account.loaded;
  const onboardingStatus = account.onboardingStatus;
  const [panelOpen, setPanelOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [tick, setTick] = useState(0);
  const [tourIndex, setTourIndex] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [walking, setWalking] = useState(false);
  const [walkDir, setWalkDir] = useState("right");
  const [burst, setBurst] = useState(null);
  const visibleRef = useRef(null);
  const autoStarted = useRef(false);
  const replayRef = useRef(false);
  const persistTimer = useRef(null);
  const lastCharPos = useRef(null);
  const walkTimer = useRef(null);
  const skipWalkRef = useRef(false);
  const [notice, setNotice] = useState(false);
  const [speechOpen, setSpeechOpen] = useState(false);
  const [shownIndex, setShownIndex] = useState(0);
  const speechPlacement = useRef(null);
  const speechBusyRef = useRef(false);

  const prefs = companionPrefs(snapshot.prefs);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const hidden = !token || isAuthRoute(location.pathname) || !prefs.companionEnabled;
  const touring = tourIndex != null;
  const reducedMotion = prefersReducedMotion();
  const stepReady = Boolean(touring && placement?.stepId && placement.stepId === TOUR_STEPS[tourIndex]?.id);
  const tourBeats = useMemo(() => {
    if (!touring || tourIndex == null) return [{ state: CHAR.IDLE, ms: 0, persist: true }];
    if (walking) return [{ state: CHAR.WALK, ms: 0, persist: true }];
    if (!stepReady) return [{ state: CHAR.IDLE, ms: 0, persist: true }];
    return buildTourBeats(TOUR_STEPS[tourIndex], {
      face: placement?.face,
      pointGesture: placement?.gesture,
    });
  }, [touring, walking, tourIndex, stepReady, placement?.face, placement?.gesture]);
  const tourPose = useChoreography(tourBeats, { reduced: reducedMotion });
  speechBusyRef.current = touring && (walking || !speechOpen);
  visibleRef.current = message;

  const ctx = useMemo(
    () =>
      buildCompanionContext({
        pathname: location.pathname,
        view: snapshot.view,
        filter: snapshot.filter,
        todos: snapshot.todos,
        stats: snapshot.stats,
        prefs: snapshot.prefs,
        unread: snapshot.unread,
        onboardingStatus: account.onboardingStatus,
        now: new Date(Date.now() + tick * 0),
      }),
    [location.pathname, snapshot, tick, account.onboardingStatus]
  );

  const quiet = isWithinQuietHours(prefs);
  const mood = moodFromMessage(message, {
    panelOpen,
    quiet,
    enabled: prefs.companionEnabled,
  });

  const saveAccountOnboarding = useCallback(
    async (status, step) => {
      if (replayRef.current) return;
      try {
        const data = await persistOnboarding({ status, currentTourStep: step });
        setOnboarding({
          onboardingStatus: data.onboardingStatus,
          currentTourStep: data.currentTourStep,
        });
      } catch {
        setOnboarding({ onboardingStatus: status, currentTourStep: step || 0 });
      }
    },
    [setOnboarding]
  );

  useEffect(() => {
    document.body.classList.toggle("companion-on", !hidden && !touring);
    document.body.classList.toggle("guide-tour-on", Boolean(touring));
    return () => {
      document.body.classList.remove("companion-on");
      document.body.classList.remove("guide-tour-on");
    };
  }, [hidden, touring]);

  useEffect(() => {
    if (hidden) {
      setPanelOpen(false);
      setMessage(null);
      setTourIndex(null);
      setResumePrompt(false);
    }
  }, [hidden]);

  useEffect(() => {
    rememberCounts({
      total: ctx.counts.total,
      completedToday: ctx.counts.completedToday,
    });
  }, [ctx.counts.total, ctx.counts.completedToday]);

  useEffect(() => {
    if (!event?.name) return;
    const nextBurst = EVENT_TO_BURST[event.name];
    if (nextBurst) setBurst(nextBurst);
    const timer = window.setTimeout(() => setBurst(null), 1600);
    return () => window.clearTimeout(timer);
  }, [event]);

  useEffect(() => {
    if (!panelOpen) {
      setNotice(false);
      return undefined;
    }
    setNotice(true);
    const timer = window.setTimeout(() => setNotice(false), 720);
    return () => window.clearTimeout(timer);
  }, [panelOpen]);

  useEffect(() => {
    if (tourIndex == null) {
      lastCharPos.current = null;
      speechPlacement.current = null;
      setWalking(false);
      setSpeechOpen(false);
      return;
    }
    setSpeechOpen(false);
    if (lastCharPos.current == null) lastCharPos.current = actorFallback();
  }, [tourIndex]);

  useEffect(() => {
    if (tourIndex == null || walking || !stepReady || !placement) return undefined;
    const delay = reducedMotion ? 20 : 120;
    const timer = window.setTimeout(() => {
      speechPlacement.current = placement;
      setShownIndex(tourIndex);
      setSpeechOpen(true);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [tourIndex, walking, stepReady, placement, reducedMotion]);

  useEffect(() => {
    if (!placement?.char) return undefined;
    const next = placement.char;
    const prev = lastCharPos.current || actorFallback();
    lastCharPos.current = next;
    if (skipWalkRef.current) {
      skipWalkRef.current = false;
      setWalking(false);
      return undefined;
    }
    if (prefersReducedMotion()) return undefined;
    const dx = next.left - prev.left;
    const dy = next.top - prev.top;
    if (!shouldWalk(dx, dy)) {
      setWalking(false);
      return undefined;
    }
    setWalkDir((dir) => walkDirection(dx, dy, dir));
    setWalking(true);
    window.clearTimeout(walkTimer.current);
    walkTimer.current = window.setTimeout(() => setWalking(false), WALK_MS);
    return () => window.clearTimeout(walkTimer.current);
  }, [placement]);

  useEffect(() => {
    if (hidden || panelOpen || touring) return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), 60000);
    return () => clearInterval(timer);
  }, [hidden, panelOpen, touring]);

  useEffect(() => {
    if (hidden || !accountLoaded || autoStarted.current) return;
    if (!location.pathname.includes("user-dashboard")) return;
    if (shouldOfferResume(onboardingStatus, account.currentTourStep)) {
      autoStarted.current = true;
      setResumePrompt(true);
      return;
    }
    if (shouldAutoStartTour(onboardingStatus, false)) {
      autoStarted.current = true;
      replayRef.current = false;
      saveAccountOnboarding(ONBOARDING.IN_PROGRESS, 0);
      setTourIndex(0);
    }
  }, [hidden, account, accountLoaded, onboardingStatus, location.pathname, saveAccountOnboarding]);

  useEffect(() => {
    if (!tourNonce) return;
    replayRef.current = true;
    autoStarted.current = true;
    setPanelOpen(false);
    setMessage(null);
    setResumePrompt(false);
    if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
    setTourIndex(0);
  }, [tourNonce, location.pathname, navigate]);

  useEffect(() => {
    if (tourIndex == null) {
      setPlacement(null);
      return undefined;
    }
    const step = TOUR_STEPS[tourIndex];
    const actions = getActions();
    if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
    if (step.view === "plan") actions.goPlan?.();
    else actions.showTasks?.("all");

    if (!replayRef.current) {
      window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        saveAccountOnboarding(ONBOARDING.IN_PROGRESS, tourIndex);
      }, 400);
    }

    let cancelled = false;
    const reduced = prefersReducedMotion();
    const run = async () => {
      await new Promise((resolve) => setTimeout(resolve, reduced ? 40 : 160));
      if (cancelled) return;
      const el = step.target
        ? findGuideTarget(step.target) || (step.fallback ? findGuideTarget(step.fallback) : null)
        : null;
      if (el) {
        el.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
      await new Promise((resolve) => setTimeout(resolve, el && !reduced ? 280 : 40));
      if (!cancelled) setPlacement(measureStep(step));
    };
    run();
    const onResize = () => {
      skipWalkRef.current = true;
      setPlacement(measureStep(TOUR_STEPS[tourIndex]));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.clearTimeout(persistTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourIndex, snapshot.view, location.pathname, navigate]);

  useEffect(() => {
    if (hidden || panelOpen || touring || resumePrompt || visibleRef.current) return;
    if (!accountLoaded) return;
    if (!isAssistantMode(onboardingStatus) && !replayRef.current) return;
    const memory = {
      ...loadCompanionMemory(),
      onboardingCompleted: onboardingStatus === ONBOARDING.COMPLETED,
      onboardingSkipped: onboardingStatus === ONBOARDING.SKIPPED,
    };
    const eventName = event?.name || null;
    const skipCooldown = eventName === "completed" || eventName === "created";
    if (!skipCooldown && isCoolingDown()) {
      if (eventName) clearEvent();
      return;
    }
    const next = selectProactiveMessage(ctx, memory, eventName);
    if (eventName) clearEvent();
    if (!next) return;
    setMessage(next);
    markShown(next.id);
  }, [ctx, event, hidden, panelOpen, touring, resumePrompt, accountLoaded, onboardingStatus, clearEvent]);

  const endTour = useCallback(
    (skipped) => {
      const wasReplay = replayRef.current;
      replayRef.current = false;
      setTourIndex(null);
      setPlacement(null);
      setResumePrompt(false);
      getActions().showTasks?.("all");
      if (!wasReplay) {
        saveAccountOnboarding(skipped ? ONBOARDING.SKIPPED : ONBOARDING.COMPLETED, 0);
      }
    },
    [getActions, saveAccountOnboarding]
  );

  const nextTour = useCallback(() => {
    if (speechBusyRef.current) return;
    setTourIndex((index) => {
      if (index == null) return index;
      if (index >= TOUR_STEPS.length - 1) {
        endTour(false);
        return null;
      }
      return index + 1;
    });
  }, [endTour]);

  const backTour = useCallback(() => {
    if (speechBusyRef.current) return;
    setTourIndex((index) => (index == null ? index : Math.max(0, index - 1)));
  }, []);

  useEffect(() => {
    if (tourIndex == null) return undefined;
    const onKey = (event) => {
      if (event.target.matches?.("input, textarea, select")) return;
      if (event.key === "Escape") endTour(!replayRef.current);
      if (event.key === "ArrowRight") nextTour();
      if (event.key === "ArrowLeft") backTour();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourIndex, endTour, nextTour, backTour]);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const dismiss = useCallback(() => setMessage(null), []);

  const runAction = useCallback(
    (action, source) => {
      const actions = getActions();
      const taskId = source?.taskId;
      switch (action.id) {
        case "continue-tour":
          setResumePrompt(false);
          setTourIndex(resumeStep(account.currentTourStep, TOUR_STEPS.length));
          return;
        case "skip-tour":
          setResumePrompt(false);
          saveAccountOnboarding(ONBOARDING.SKIPPED, 0);
          return;
        case "plan":
          actions.goPlan?.();
          if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
          break;
        case "show-overdue":
          actions.showTasks?.("overdue");
          if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
          break;
        case "view-tasks":
        case "view-soon":
        case "today-tasks":
          actions.showTasks?.("all");
          if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
          break;
        case "filter-high":
          actions.filterHigh?.();
          if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
          break;
        case "view-productivity":
          actions.showTasks?.("all");
          if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
          break;
        case "show-notifications":
          actions.showNotifications?.();
          if (location.pathname !== "/user-dashboard") navigate("/user-dashboard");
          break;
        case "create":
          navigate("/add-appointment");
          setPanelOpen(false);
          break;
        case "catch-up":
          actions.catchUp?.();
          break;
        case "reschedule":
          actions.openOverdue?.(taskId);
          break;
        case "complete-overdue":
        case "complete-soon":
          if (taskId) actions.complete?.(taskId);
          break;
        case "refresh":
          actions.refresh?.();
          return;
        case "replay-tour":
          requestTour();
          setPanelOpen(false);
          return;
        default:
          break;
      }
      setMessage(null);
    },
    [getActions, location.pathname, navigate, account.currentTourStep, saveAccountOnboarding, requestTour]
  );

  const formPage = ctx.route === "create" || ctx.route === "edit" || ctx.route === "delete";

  useEffect(() => {
    if (formPage) setPanelOpen(false);
  }, [formPage]);

  if (hidden) return null;

  if (touring) {
    const step = TOUR_STEPS[tourIndex];
    const shownStep = TOUR_STEPS[shownIndex] || step;
    const fallbackChar = tourCharSize(typeof window !== "undefined" ? window.innerWidth : 1280);
    const start = actorFallback();
    const charStyle = placement
      ? { left: placement.char.left, top: placement.char.top, width: placement.charSize.w, height: placement.charSize.h }
      : { left: start.left, top: start.top, width: fallbackChar.w, height: fallbackChar.h };
    const bubbleBox = (speechOpen ? placement : speechPlacement.current)?.bubble;
    const speechStyle = bubbleBox
      ? { left: bubbleBox.left, top: bubbleBox.top, width: bubbleBox.width }
      : { left: 12, top: 12, width: Math.min(280, window.innerWidth - 24) };
    const hold = holdForPose(step.hold, tourPose);
    const speechBusy = walking || !speechOpen;

    return (
      <>
        <GuideHighlight rect={speechOpen ? placement?.highlight : null} ready={speechOpen} />
        <div
          className={`guide-speech${speechOpen ? " is-ready" : ""}${reducedMotion ? " is-static" : ""}`}
          style={speechStyle}
        >
          <GuideBubble
            step={shownStep}
            index={shownIndex}
            total={TOUR_STEPS.length}
            busy={speechBusy}
            onNext={nextTour}
            onBack={backTour}
            onSkip={() => endTour(true)}
            onClose={() => endTour(!replayRef.current)}
          />
        </div>
        <div className={`guide-actor${reducedMotion ? " is-static" : ""}`} style={charStyle}>
          <CompanionCharacter
            touring
            walking={walking}
            walkDir={walkDir}
            pose={tourPose}
            talking={talkingForPose(step, tourPose, walking)}
            gesture={placement?.gesture || step.gesture}
            face={placement?.face || "front"}
            hold={hold}
          />
        </div>
      </>
    );
  }

  if (resumePrompt) {
    return (
      <div className={`companion-root${formPage ? " is-form" : ""}`}>
        <CompanionBubble
          message={{
            text: "You left the product tour unfinished. Continue from where you stopped?",
            actions: [
              { id: "continue-tour", label: "Continue" },
              { id: "skip-tour", label: "Skip tour" },
            ],
          }}
          onAction={runAction}
          onDismiss={() => setResumePrompt(false)}
        />
        <CompanionCharacter mood="helping" talking />
      </div>
    );
  }

  return (
    <div className={`companion-root${panelOpen ? " is-open" : ""}${formPage ? " is-form" : ""}`}>
      {panelOpen ? (
        <CompanionPanel
          ctx={ctx}
          mood={mood}
          burst={burst || (notice ? CHAR.WAVE : null)}
          onAction={runAction}
          onClose={() => setPanelOpen(false)}
        />
      ) : (
        <>
          <CompanionBubble message={message} onAction={runAction} onDismiss={dismiss} />
          <CompanionCharacter
            mood={mood}
            burst={burst}
            talking={Boolean(message)}
            expanded={false}
            onClick={() => {
              setMessage(null);
              markShown("panel-open");
              setPanelOpen(true);
            }}
          />
        </>
      )}
    </div>
  );
}
