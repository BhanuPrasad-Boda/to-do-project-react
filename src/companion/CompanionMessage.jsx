export function CompanionMessage({ text, items }) {
  if (!text && !items?.length) return null;
  const paragraphs = String(text || "")
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="companion-msg-body">
      {paragraphs.map((part, index) => (
        <p key={index} className="companion-copy">
          {part}
        </p>
      ))}
      {items?.length ? (
        <ul className="companion-checklist">
          {items.map((item, index) => (
            <li key={`${item.title || item}-${index}`}>{item.title || item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
