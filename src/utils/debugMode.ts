function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const isLocalhost = window.location.hostname === "localhost" && window.location.port === "3000";
  const hasDebugParam = new URLSearchParams(window.location.search).get("debug") === "true";
  return isLocalhost && hasDebugParam;
}

export const DEBUG_MODE = isDebugMode();
