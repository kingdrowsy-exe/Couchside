/** True when a main-frame navigation stays on the embedded app. */
export function isAppNavigation(url, appOrigin) {
  try {
    return new URL(url).origin === appOrigin;
  } catch {
    return false;
  }
}

/** http(s) links open in the system browser. Everything else is dropped. */
export function externalOpenAction(url) {
  try {
    const protocol = new URL(url).protocol;
    if (protocol === "https:" || protocol === "http:") return "external";
  } catch {
    // deny
  }
  return "deny";
}
