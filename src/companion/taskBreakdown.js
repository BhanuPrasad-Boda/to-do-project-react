const TEMPLATES = [
  {
    test: /launch|website|web app|site\b/i,
    items: [
      "Finalize design",
      "Prepare content",
      "Configure hosting",
      "Test responsive layouts",
      "Deploy website",
    ],
  },
  {
    test: /report|presentation/i,
    items: ["Gather data", "Write first draft", "Review and edit", "Submit"],
  },
  {
    test: /meeting/i,
    items: ["Set agenda", "Prepare materials", "Send invites", "Follow up after the meeting"],
  },
  {
    test: /hire|recruit|interview/i,
    items: ["Write the role description", "Source candidates", "Schedule interviews", "Make a decision"],
  },
];

export function breakdownTask(text) {
  const source = String(text || "").trim();
  const match = TEMPLATES.find((item) => item.test.test(source));
  const items = match
    ? match.items
    : ["Define the outcome", "List required materials", "Do the core work", "Review and finish"];
  return {
    title: source || "this work",
    items: items.map((title) => ({ title })),
  };
}
