export function CompanionActions({ actions = [], onAction, onDismiss }) {
  if (!actions.length) return null;
  return (
    <div className="companion-actions">
      {actions.map((action, index) => {
        const quiet = action.id === "dismiss" || action.variant === "quiet";
        const variant = action.variant === "primary" ? " is-primary" : action.variant === "danger" ? " is-danger" : quiet ? " is-quiet" : "";
        return (
          <button
            key={`${action.id}-${index}`}
            type="button"
            className={`companion-chip${variant}`}
            onClick={() => (action.id === "dismiss" ? onDismiss?.() : onAction?.(action))}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
