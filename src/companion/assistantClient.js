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

export async function fetchAccountOnboarding() {
  const res = await axios.get("/users/me");
  return res.data;
}
