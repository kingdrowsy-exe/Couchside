import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const secret = randomBytes(32);

/** Sign a playlist or segment URL so the local HLS proxy will not fetch arbitrary targets. */
export function signHlsPath(absolute: string): string {
  const sig = createHmac("sha256", secret).update(absolute).digest("base64url");
  return `/api/hls?u=${encodeURIComponent(absolute)}&sig=${sig}`;
}

export function hlsSignatureValid(absolute: string, sig: string | undefined): boolean {
  if (!sig) return false;
  const expected = createHmac("sha256", secret).update(absolute).digest("base64url");
  const given = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}
