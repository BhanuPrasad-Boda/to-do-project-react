function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function thinkingPhrase(text = "") {
  const q = String(text).toLowerCase();
  if (/overdue|late/.test(q)) return "Checking overdue work…";
  if (/plan|today|should i/.test(q)) return "Reviewing today’s priorities…";
  if (/productiv|week|month|streak/.test(q)) return "Reading your productivity data…";
  if (/create|add|remind/.test(q)) return "Drafting the task…";
  if (/delete|complete|move|reschedule/.test(q)) return "Verifying the task…";
  return "Thinking…";
}

export function panelGreeting(ctx = {}) {
  const counts = ctx.counts || {};
  const next = ctx.firstOverdue || ctx.nextDueSoon || ctx.today?.[0];
  const title = next?.Title ? `“${next.Title}”` : null;

  if (ctx.route === "create" || ctx.route === "edit") {
    return "I can infer date, priority, and category from plain language. High should be reserved for work that cannot slip.";
  }
  if (ctx.route === "notifications") {
    return ctx.unread
      ? `You have ${plural(ctx.unread, "unread reminder")}. I can explain why one fired or adjust lead time.`
      : "No unread reminders. I can still change how far in advance I notify you.";
  }
  if (counts.overdue > 0) {
    return `I've reviewed your workspace. ${plural(counts.overdue, "task")} ${
      counts.overdue === 1 ? "is" : "are"
    } overdue${title ? ` — ${title} should go first` : ""}. I can reschedule or you can tell me what to finish.`;
  }
  if (counts.today > 0) {
    return `You have ${plural(counts.today, "task")} on today's list${
      title ? `. I'd start with ${title}` : ""
    }. Ask in plain language — I'll use your live TaskFlow data.`;
  }
  if (ctx.route === "plan") {
    return "Your calendar is open. I can build a sequence for the day or add something that belongs here.";
  }
  if ((ctx.weekly || 0) >= 60 && counts.completedToday > 0) {
    return "Your completion rate is up versus last week. I can keep you on that pace, or we can plan what's next.";
  }
  return "I'm TaskFlow AI. I can plan, prioritize, create, and reschedule using your actual tasks — not generic advice. What should we handle?";
}

export function formatTaskPreview(parsed, formatDue) {
  const bits = [`“${parsed.title}”`];
  if (parsed.dueDate) bits.push(formatDue(parsed.dueDate));
  if (parsed.priority) bits.push(`${parsed.priority} priority`);
  if (parsed.category && parsed.category !== "General") bits.push(parsed.category);
  return bits.join(" · ");
}
