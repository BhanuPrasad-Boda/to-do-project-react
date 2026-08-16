const DEFAULT_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];
const TIMEOUT_MS = 12000;
const MAX_RETRIES = 1;

function modelName(env = process.env) {
  return String(env.AI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function modelsToTry(env = process.env) {
  const primary = modelName(env);
  return [primary, ...FALLBACK_MODELS.filter((name) => name !== primary)];
}

function classifyGoogleError(status, data) {
  const message = String(data?.error?.message || "").slice(0, 220);
  const billing = /credit|billing|prepayment/i.test(message);
  return {
    status,
    reason: message || `HTTP_${status}`,
    retryable: status >= 500 || (status === 429 && !billing),
  };
}

function isConfigured(env = process.env) {
  return Boolean(String(env.AI_API_KEY || "").trim());
}

function systemPrompt({ allowedTools, allowTaskTools, mode, searchResults }) {
  if (!allowTaskTools) {
    return [
      "You are TaskFlow Assistant. You can answer general questions, explain topics, and help write text.",
      "This request is NOT a TaskFlow action. Do not select a TaskFlow tool.",
      "Return ONLY JSON.",
      "intent must be general_qa, general_writing, general_explanation, current_information, or clarify.",
      "tool must be null unless you need live facts. Then tool=searchWeb and toolArguments.query is the search query.",
      "Never invent current news, weather, prices, scores, or software releases.",
      searchResults
        ? "Answer only from the provided search results. If they are insufficient, say so."
        : "If the user needs current information and you have no search results, request searchWeb instead of guessing.",
      `Response mode: ${mode || "GENERAL_QA"}.`,
      "Be concise and professional. Do not mention API keys or internals.",
    ].join(" ");
  }
  return [
    "You are the understanding layer for TaskFlow, a to-do app.",
    "Return ONLY JSON matching the required schema.",
    "You cannot access the database or run code. You may only choose an approved tool.",
    `Approved tools: ${(allowedTools || []).join(", ")}.`,
    "Never invent task IDs the user did not mention.",
    "Never set confirm=true. The backend decides execution.",
    "Destructive or bulk changes must set requires_confirmation=true.",
    "If the request is ambiguous, use intent clarify and ask which task.",
    "If the user is asking a general or hypothetical question, use a general_* intent and set tool to null.",
    "Keep response short and professional. Do not mention API keys or internals.",
  ].join(" ");
}

async function postGemini({ url, body, signal }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const classified = classifyGoogleError(res.status, data);
    const error = new Error("AI_PROVIDER_ERROR");
    error.status = classified.status;
    error.reason = classified.reason;
    error.retryable = classified.retryable;
    throw error;
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
  return text;
}

function createGeminiProvider(env = process.env) {
  return {
    name: "gemini",
    model: modelName(env),
    isAvailable() {
      return isConfigured(env);
    },
    async interpret({ message, context, history, allowedTools, allowTaskTools = true, mode, searchResults }) {
      if (!isConfigured(env)) {
        const error = new Error("AI_NOT_CONFIGURED");
        error.status = 503;
        throw error;
      }

      const contents = [];
      (history || []).slice(-6).forEach((turn) => {
        if (!turn?.text) return;
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: String(turn.text).slice(0, 400) }],
        });
      });
      contents.push({
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              message,
              context,
              mode: mode || null,
              searchResults: searchResults || [],
              schema: {
                intent: "create_task|complete_task|delete_task|update_task|reschedule_task|set_priority|get_tasks|get_today_tasks|get_overdue_tasks|get_upcoming_tasks|search_tasks|get_productivity|schedule_reminder|create_subtasks|catch_up_overdue|apply_plan|get_daily_summary|get_notifications|mark_notification_read|clarify|chat|open_notifications|logout|general_qa|general_writing|general_explanation|current_information",
                confidence: 0.0,
                requires_confirmation: false,
                entities: {},
                tool: "approved tool, searchWeb, or null",
                toolArguments: {},
                response: "user-facing text",
              },
            }),
          },
        ],
      });

      const body = {
        systemInstruction: {
          parts: [{ text: systemPrompt({ allowedTools: allowedTools || [], allowTaskTools, mode, searchResults }) }],
        },
        contents,
        generationConfig: {
          temperature: allowTaskTools ? 0.2 : 0.4,
          responseMimeType: "application/json",
        },
      };

      let lastError;
      for (const model of modelsToTry(env)) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(env.AI_API_KEY)}`;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
          try {
            return await postGemini({ url, body, signal: controller.signal });
          } catch (error) {
            lastError =
              error.name === "AbortError"
                ? Object.assign(new Error("AI_PROVIDER_ERROR"), { status: 504, retryable: false, reason: "timeout" })
                : error;
            if (!lastError.retryable || attempt === MAX_RETRIES) break;
          } finally {
            clearTimeout(timer);
          }
        }
        if (lastError?.status !== 404) break;
      }
      throw lastError;
    },
  };
}

module.exports = { createGeminiProvider, DEFAULT_MODEL, FALLBACK_MODELS, isConfigured };
