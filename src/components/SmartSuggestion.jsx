import { formatSuggestionMeta } from "../utils/aiSuggestions";

export function SmartSuggestion({
  suggestions = [],
  activeIndex = 0,
  onHover,
  onSelect,
}) {
  if (!suggestions.length) return null;

  const featured = suggestions[0];
  const rest = suggestions.slice(1);

  return (
    <div className="ai-generated" aria-label="AI generated task">
      <div className="ai-generated-kicker">
        <span>
          <i className="bi bi-stars" aria-hidden="true" /> AI generated
        </span>
        <span>Tab to use</span>
      </div>

      <button
        type="button"
        className={`ai-generated-main${activeIndex === 0 ? " is-active" : ""}`}
        onMouseEnter={() => onHover?.(0)}
        onClick={() => onSelect?.(featured)}
      >
        <strong>{featured.title}</strong>
        <span>{formatSuggestionMeta(featured) || "Ready to add as a task"}</span>
      </button>

      {rest.length > 0 ? (
        <div className="ai-generated-more">
          {rest.map((item, index) => {
            const optionIndex = index + 1;
            return (
              <button
                key={`${item.title}-${optionIndex}`}
                type="button"
                className={`ai-generated-alt${activeIndex === optionIndex ? " is-active" : ""}`}
                onMouseEnter={() => onHover?.(optionIndex)}
                onClick={() => onSelect?.(item)}
              >
                <strong>{item.title}</strong>
                <small>{formatSuggestionMeta(item)}</small>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function GhostInput({ value, ghost, inputProps, className = "" }) {
  return (
    <div className={`ai-input-shell ${className}`.trim()}>
      {ghost ? (
        <div className="ai-ghost" aria-hidden="true">
          <span className="ai-ghost-typed">{value}</span>
          <span className="ai-ghost-rest">{ghost}</span>
        </div>
      ) : null}
      <input {...inputProps} value={value} />
    </div>
  );
}
