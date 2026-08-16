import axios from "../api/axiosConfig";

export async function persistOnboarding({ status, currentTourStep }) {
  const res = await axios.put("/users/onboarding", { status, currentTourStep });
  return res.data;
}

export async function runAssistantTool(name, payload = {}) {
  const res = await axios.post("/appointments/assistant/act", {
    tool: name,
    payload,
  });
  return res.data;
}

export async function sendAssistantChat(message, context = {}) {
  const res = await axios.post("/appointments/assistant/chat", {
    message,
    context: {
      route: context.route || "dashboard",
      selectedTaskId:
        context.selectedTaskId ||
        context.firstOverdue?.Appointment_Id ||
        context.nextDueSoon?.Appointment_Id ||
        null,
      counts: context.counts || {},
      tasks: (context.todos || context.tasks || []).slice(0, 16).map((task) => ({
        Appointment_Id: task.Appointment_Id,
        Title: task.Title,
        Date: task.Date,
        Priority: task.Priority,
        completed: Boolean(task.completed),
        status: task.status || null,
      })),
    },
  });
  return res.data;
}

export async function resetAssistantChat() {
  const res = await axios.post("/appointments/assistant/chat", { reset: true });
  return res.data;
}

export async function fetchAccountOnboarding() {
  const res = await axios.get("/users/me");
  return res.data;
}
