export function canShowDevOtp(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function visibleDevCode(devCode, hostname) {
  if (!devCode || !canShowDevOtp(hostname)) return "";
  return String(devCode);
}
