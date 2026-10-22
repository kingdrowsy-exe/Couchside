/** Thrown when a user-supplied or playlist URL must not be fetched. */
export class UnsafeUrlError extends Error {
  constructor(message = "That URL is not allowed") {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTS = new Set(["metadata.google.internal", "metadata.google.com"]);

function ipv4Parts(host: string): number[] | null {
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return null;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return null;
  return match.slice(1).map((part) => {
    if (part.length > 1 && part.startsWith("0")) return -1;
    return Number(part);
  });
}

function mappedIPv4(host: string): number[] | null {
  const dotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(host);
  if (dotted) return ipv4Parts(dotted[1]);
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(host);
  if (!hex) return null;
  const hi = Number.parseInt(hex[1], 16);
  const lo = Number.parseInt(hex[2], 16);
  return [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255];
}

function isBlockedAddress(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host)) return true;

  const v4 = ipv4Parts(host) ?? mappedIPv4(host);
  if (v4) {
    if (v4.some((n) => n < 0 || n > 255)) return true;
    if (v4[0] === 169 && v4[1] === 254) return true;
    return false;
  }

  if (!host.includes(":")) return false;
  if (host === "fd00:ec2::254") return true;
  // fe80::/10 is fe80:: through febf::.
  return /^fe[89ab][0-9a-f]:/.test(host);
}

/**
 * http(s) URLs only. Link-local and cloud metadata addresses are rejected.
 * Private LAN addresses are allowed: Plex, Emby, and Xtream often run there.
 * Hostnames are not resolved; a DNS name that points at a metadata address is not detected here.
 *
 * A server address typed into Settings is the same check, plus no embedded username or password.
 */
export function assertServerBaseUrl(raw: string): string {
  const clean = raw.trim().replace(/\/+$/, "");
  const url = assertSafeOutboundUrl(clean);
  if (url.username || url.password) throw new UnsafeUrlError("That URL is not allowed");
  return clean;
}

export function assertSafeOutboundUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That URL is not allowed");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("That URL is not allowed");
  }
  if (!url.hostname || isBlockedAddress(url.hostname)) {
    throw new UnsafeUrlError("That URL is not allowed");
  }
  return url;
}

export function resolveRedirect(current: string, location: string): string {
  return assertSafeOutboundUrl(new URL(location, current).toString()).toString();
}

const REDIRECT = new Set([301, 302, 303, 307, 308]);

/** Follow redirects only while each hop stays on an allowed URL. */
export async function fetchOutbound(raw: string, init: RequestInit = {}): Promise<{ response: Response; url: string }> {
  let current = assertSafeOutboundUrl(raw).toString();
  for (let hop = 0; hop < 5; hop++) {
    const response = await fetch(current, { ...init, redirect: "manual" });
    if (!REDIRECT.has(response.status)) return { response, url: current };
    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => {});
    if (!location) throw new UnsafeUrlError("That URL is not allowed");
    current = resolveRedirect(current, location);
  }
  throw new UnsafeUrlError("That URL is not allowed");
}
