const SECRET_QUERY = ["u", "password", "token", "username", "pass", "sig", "access_token", "refresh_token", "x-plex-token"];

/** Loopback only. The port is ignored so tests (localhost:80) and the app (127.0.0.1:4173) both pass. */
export function isLoopbackHost(hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  let host = hostHeader.trim().toLowerCase();
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end < 0) return false;
    host = host.slice(1, end);
  } else {
    host = host.replace(/:\d+$/, "");
  }
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function redactUrl(raw: string): string {
  try {
    const base = raw.startsWith("/") ? "http://127.0.0.1" : undefined;
    const url = new URL(raw, base);
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_QUERY.includes(key.toLowerCase())) url.searchParams.set(key, "redacted");
    }
    url.pathname = url.pathname.replace(/(\/live\/)[^/]+\/[^/]+(?=\/)/i, "$1redacted/redacted");
    if (raw.startsWith("/")) return `${url.pathname}${url.search}`;
    return url.toString();
  } catch {
    return raw.replace(/([?&](?:u|password|token|username|pass|sig)=)[^&\s]*/gi, "$1redacted");
  }
}

export function redactSecrets(text: string): string {
  return redactUrl(text);
}

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' https: data: blob:",
  "media-src 'self' https: blob: data:",
  "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");
