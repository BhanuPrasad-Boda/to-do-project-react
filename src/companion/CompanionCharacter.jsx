import { CharacterRenderer } from "./CharacterRenderer";
import { resolveCharacterState } from "./characterStates";
import { useCharacterMachine } from "./useCharacterMachine";
import { prefersReducedMotion } from "./guideTour";
import "./characterMotion.css";

export function CompanionCharacter({
  mood = "idle",
  gesture = "idle",
  face = "front",
  hold = null,
  onClick,
  expanded,
  touring = false,
  compact = false,
  walking = false,
  walkDir = "right",
  talking = false,
  thinking = false,
  listening = false,
  burst = null,
  pose = null,
}) {
  const reduced = prefersReducedMotion();
  const desired = resolveCharacterState({
    touring,
    walking,
    gesture,
    hold,
    mood,
    thinking,
    listening,
    talking,
    burst,
    pose,
  });
  const { state, phase } = useCharacterMachine(desired, { reduced });
  const className = [
    "companion-avatar",
    "char-root",
    `is-${state}`,
    `is-face-${face}`,
    `is-dir-${walkDir}`,
    `is-${phase}`,
    touring ? "is-touring" : "",
    compact ? "is-compact" : "",
    talking && state !== "talk" ? "is-talking" : "",
    hold ? `is-holding is-hold-${hold}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = <CharacterRenderer compact={compact || !touring} hold={hold} />;

  if (compact) {
    return (
      <span className={className} aria-hidden="true">
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      tabIndex={touring ? -1 : 0}
      aria-label={touring ? "Product guide" : "Productivity assistant"}
      aria-expanded={expanded}
      aria-controls={touring ? undefined : "companion-panel"}
    >
      {body}
    </button>
  );
}
