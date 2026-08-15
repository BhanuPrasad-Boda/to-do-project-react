import { useMemo, useState } from "react";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import { parseNaturalTask } from "../utils/taskParser";
import { useSmartPreview } from "../utils/useSmartPreview";
import { generateAiSuggestions, ghostSuffix } from "../utils/aiSuggestions";
import { GhostInput, SmartSuggestion } from "./SmartSuggestion";

export function QuickCapture({ onCreated }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const preview = useSmartPreview(text);
  const suggestions = useMemo(
    () => (picked || dismissed ? [] : generateAiSuggestions(preview)),
    [preview, picked, dismissed]
  );
  const ghost = !picked ? ghostSuffix(text, suggestions[0]?.title) : "";

  const applySuggestion = (item) => {
    if (!item) return;
    setPicked(item);
    setText(item.title);
    setActive(0);
    setDismissed(false);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      setDismissed(true);
      return;
    }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(suggestions.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Tab") {
      event.preventDefault();
      applySuggestion(suggestions[active] || suggestions[0]);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    try {
      if (picked) {
        await axios.post("/appointments", {
          Appointment_Id: Date.now(),
          Title: picked.title,
          Date: picked.dueDate,
          Priority: picked.priority,
          category: picked.category,
          recurrence: picked.recurrence || "none",
          reminderOffsetMinutes: picked.reminderOffsetMinutes,
          completed: false,
        });
        toast.success(`Added “${picked.title}”`);
      } else {
        await axios.post("/appointments/quick", { text: value });
        toast.success(`Added “${parseNaturalTask(value).title}”`);
      }
      setText("");
      setPicked(null);
      setDismissed(false);
      onCreated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="quick-capture-block" onSubmit={submit} data-guide="guide-capture">
      <div className="quick-capture">
        <i className="bi bi-stars" aria-hidden="true" />
        <div className="quick-capture-field">
          <GhostInput
            value={text}
            ghost={ghost}
            inputProps={{
              id: "quick-capture",
              type: "text",
              maxLength: 200,
              placeholder: "Add anything… “Call client tomorrow at 3”",
              onChange: (e) => {
                setPicked(null);
                setDismissed(false);
                setActive(0);
                setText(e.target.value);
              },
              onKeyDown,
              autoComplete: "off",
            }}
          />
        </div>
        <button type="submit" className="btn-new-task border-0" disabled={busy || !text.trim()}>
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      <SmartSuggestion
        suggestions={suggestions}
        activeIndex={active}
        onHover={setActive}
        onSelect={applySuggestion}
      />
    </form>
  );
}
