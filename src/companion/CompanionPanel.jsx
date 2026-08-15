import { useEffect, useMemo, useRef, useState } from "react";
import { panelGreeting, thinkingPhrase } from "./assistantVoice";
import { ASSISTANT_SHORTCUTS, interpretCompanionQuery } from "./companionIntents";
import { CompanionMessage } from "./CompanionMessage";
import { CompanionActions } from "./CompanionActions";
import { CompanionCharacter } from "./CompanionCharacter";
import { runAssistantTool } from "./assistantClient";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function seedMessage(ctx) {
  return {
    id: "greet",
    role: "assistant",
    text: panelGreeting(ctx),
    mood: "helping",
  };
}

function shortcutQuery(id) {
  if (id === "today-tasks") return "What should I work on today?";
  if (id === "productivity") return "How productive was I this week?";
  if (id === "help") return "help";
  if (id === "show-overdue") return "What's overdue?";
  if (id === "plan") return "Plan my day.";
  if (id === "create") return "";
  return "";
}

function thinkDelay(text) {
  return Math.min(720, 280 + String(text || "").length * 6);
}

export function CompanionPanel({ ctx, mood, burst, onAction, onClose, onClear }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState(() => [seedMessage(ctx)]);
  const [thinking, setThinking] = useState(false);
  const [thinkLabel, setThinkLabel] = useState("Thinking…");
  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const pendingTool = useRef(null);

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((item) => item.role === "assistant"),
    [messages]
  );
  const showSuggestions = messages.filter((item) => item.role === "user").length === 0 && !thinking;

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pushAssistant = (reply) => {
    pendingTool.current = reply.tool || null;
    setMessages((prev) => [...prev, { id: uid(), role: "assistant", ...reply }]);
  };

  const interpretAndReply = async (text) => {
    setThinkLabel(thinkingPhrase(text));
    setThinking(true);
    await new Promise((resolve) => setTimeout(resolve, thinkDelay(text)));
    try {
      const reply = interpretCompanionQuery(text, ctx);
      pushAssistant(reply);
    } finally {
      setThinking(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value || thinking) return;
    setQuery("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", text: value }]);
    interpretAndReply(value);
  };

  const executeTool = async (tool) => {
    if (!tool?.name) return;
    setThinkLabel("Applying that to your workspace…");
    setThinking(true);
    try {
      const result = await runAssistantTool(tool.name, { ...tool.payload, confirm: true });
      pendingTool.current = null;
      pushAssistant({
        text: result.message || "Done. Your workspace is updated.",
        mood: result.ok === false ? "warning" : "happy",
        items: (result.tasks || []).slice(0, 6).map((task) => ({
          title: task.Title,
        })),
        actions: result.ok === false ? [] : [{ id: "view-tasks", label: "View tasks" }],
      });
      if (result.ok !== false) onAction?.({ id: "refresh" }, lastAssistant);
    } catch (error) {
      pushAssistant({
        text: error.response?.data?.message || "I couldn't complete that. Nothing in your list was changed.",
        mood: "warning",
      });
    } finally {
      setThinking(false);
    }
  };

  const handleAction = async (action) => {
    if (action.id === "confirm-tool") {
      const tool = lastAssistant?.tool || pendingTool.current;
      if (tool) await executeTool(tool);
      return;
    }
    if (action.id === "explain" || action.id === "help") {
      setMessages((prev) => [...prev, { id: uid(), role: "user", text: action.label }]);
      interpretAndReply("help");
      return;
    }
    if (action.id === "today-tasks" || action.id === "productivity" || action.id === "show-overdue" || action.id === "plan") {
      const text = shortcutQuery(action.id) || action.label;
      setMessages((prev) => [...prev, { id: uid(), role: "user", text: action.label }]);
      interpretAndReply(text);
      if (action.id === "plan" || action.id === "show-overdue") onAction?.(action, lastAssistant);
      return;
    }
    if (action.id === "create" && lastAssistant?.tool?.name === "createTask") {
      onAction?.(action, lastAssistant);
      return;
    }
    if (action.id === "create") {
      setMessages((prev) => [...prev, { id: uid(), role: "user", text: action.label }]);
      interpretAndReply("create a task");
      return;
    }
    onAction?.(action, lastAssistant);
  };

  const clear = () => {
    pendingTool.current = null;
    setMessages([seedMessage(ctx)]);
    onClear?.();
  };

  return (
    <section id="companion-panel" className="companion-panel" aria-label="TaskFlow AI">
      <div className="companion-panel-head">
        <div className="companion-panel-identity">
          <CompanionCharacter
            compact
            mood={mood || "helping"}
            thinking={thinking}
            listening={Boolean(query) && !thinking}
            talking={!thinking && !query}
            burst={burst}
          />
          <div>
            <strong>TaskFlow AI</strong>
            <span>
              <i className="companion-status-dot" aria-hidden="true" />
              Online · using your tasks
            </span>
          </div>
        </div>
        <div className="companion-head-actions">
          <button type="button" className="companion-text-btn" onClick={clear}>
            New chat
          </button>
          <button type="button" className="companion-close" onClick={onClose} aria-label="Close assistant">
            ×
          </button>
        </div>
      </div>
      <div className="companion-thread" ref={threadRef}>
        {messages.map((item) => (
          <div key={item.id} className={`companion-msg is-${item.role}`}>
            {item.role === "assistant" ? <span className="companion-ai-tag">AI</span> : null}
            <CompanionMessage text={item.text} items={item.items} />
            {item.role === "assistant" && item.id === lastAssistant?.id ? (
              <CompanionActions
                actions={item.actions}
                onAction={handleAction}
                onDismiss={() => {
                  pendingTool.current = null;
                }}
              />
            ) : null}
          </div>
        ))}
        {thinking ? (
          <div className="companion-msg is-assistant is-thinking" aria-live="polite" aria-label={thinkLabel}>
            <span className="companion-ai-tag">AI</span>
            <div className="companion-think">
              <div className="companion-typing" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p className="companion-think-label">{thinkLabel}</p>
            </div>
          </div>
        ) : null}
      </div>
      {showSuggestions ? (
        <div className="companion-suggest" aria-label="Suggested prompts">
          {ASSISTANT_SHORTCUTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="companion-chip"
              onClick={() => handleAction(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <form className="companion-ask companion-composer" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="companion-ask-input">
          Message TaskFlow AI
        </label>
        <input
          ref={inputRef}
          id="companion-ask-input"
          type="text"
          value={query}
          maxLength={240}
          placeholder="Message TaskFlow AI…"
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          disabled={thinking}
        />
        <button type="submit" className="companion-send" disabled={thinking || !query.trim()} aria-label="Send message">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="M3.2 10.2 16.5 3.8c.5-.2.9.3.7.8L12.4 16c-.2.5-.8.5-1.1.1L9 13.2l-2.8.9c-.5.2-.9-.3-.7-.8l.7-2.1-3-1z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </section>
  );
}
