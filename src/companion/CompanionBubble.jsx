import { CompanionMessage } from "./CompanionMessage";
import { CompanionActions } from "./CompanionActions";

export function CompanionBubble({ message, onAction, onDismiss }) {
  if (!message?.text) return null;
  return (
    <div className="companion-bubble" role="status">
      <CompanionMessage text={message.text} />
      {message.actions?.length ? (
        <CompanionActions
          actions={message.actions}
          onAction={(action) => onAction?.(action, message)}
          onDismiss={onDismiss}
        />
      ) : (
        <button type="button" className="companion-chip is-quiet" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}
