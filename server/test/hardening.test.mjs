import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeOutboundUrl, assertServerBaseUrl, resolveRedirect, UnsafeUrlError } from "../dist/outboundUrl.js";
import { hlsSignatureValid, signHlsPath } from "../dist/hlsAuth.js";
import { CONTENT_SECURITY_POLICY, isLoopbackHost, redactUrl } from "../dist/requestGuards.js";
import { createApp } from "../dist/index.js";

function rejects(url) {
  assert.throws(() => assertSafeOutboundUrl(url), UnsafeUrlError);
}

test("outbound URLs allow a home server and reject metadata and non-http", () => {
  assert.equal(assertSafeOutboundUrl("http://192.168.1.20:8080/live/a.m3u8").hostname, "192.168.1.20");
  assert.equal(assertSafeOutboundUrl("https://cdn.example.com/seg.ts").protocol, "https:");
  assert.equal(assertServerBaseUrl("http://10.0.0.5:8096/"), "http://10.0.0.5:8096");
  rejects("file:///etc/passwd");
  rejects("http://169.254.169.254/latest/meta-data");
  rejects("http://169.254.1.1/");
  rejects("http://2852039166/");
  rejects("http://metadata.google.internal/computeMetadata/v1/");
  rejects("http://[fd00:ec2::254]/");
  rejects("http://[fe80::1]/");
  rejects("http://[::ffff:169.254.169.254]/");
  assert.throws(() => assertServerBaseUrl("http://user:secret@192.168.1.20"), UnsafeUrlError);
});

test("a redirect onto the metadata address is rejected", () => {
  assert.equal(resolveRedirect("http://example.com/a.m3u8", "seg.ts"), "http://example.com/seg.ts");
  assert.throws(() => resolveRedirect("http://example.com/a.m3u8", "http://169.254.169.254/"), UnsafeUrlError);
});

test("loopback host check ignores the port", () => {
  assert.equal(isLoopbackHost("localhost:80"), true);
  assert.equal(isLoopbackHost("127.0.0.1:4173"), true);
  assert.equal(isLoopbackHost("[::1]:4173"), true);
  assert.equal(isLoopbackHost("evil.example"), false);
  assert.equal(isLoopbackHost("localhost.evil.example"), false);
  assert.equal(isLoopbackHost(undefined), false);
});

test("logged URLs do not keep stream targets or passwords", () => {
  const redacted = redactUrl("/api/hls?u=http%3A%2F%2Fuser%3Apass%40cdn%2Fa.ts&sig=abc");
  assert.match(redacted, /u=redacted/);
  assert.match(redacted, /sig=redacted/);
  assert.equal(redacted.includes("pass"), false);
  const live = redactUrl("http://panel.example/live/alice/s3cret/12.m3u8?password=s3cret");
  assert.match(live, /\/live\/redacted\/redacted\//);
  assert.match(live, /password=redacted/);
  assert.equal(live.includes("s3cret"), false);
});

test("hls proxy signatures do not accept a different target", () => {
  const path = signHlsPath("http://cdn.example/a.ts");
  const url = new URL(path, "http://127.0.0.1");
  assert.equal(hlsSignatureValid("http://cdn.example/a.ts", url.searchParams.get("sig")), true);
  assert.equal(hlsSignatureValid("http://cdn.example/b.ts", url.searchParams.get("sig")), false);
  assert.equal(hlsSignatureValid("http://cdn.example/a.ts", undefined), false);
});

test("the local API rejects other hosts, unsigned proxy URLs, and metadata targets", async () => {
  const app = await createApp();
  const foreign = await app.inject({
    method: "GET",
    url: "/api/settings/status",
    headers: { host: "evil.example" },
  });
  assert.equal(foreign.statusCode, 403);

  const status = await app.inject({ method: "GET", url: "/api/settings/status" });
  assert.equal(status.statusCode, 200);
  assert.equal(status.headers["content-security-policy"], CONTENT_SECURITY_POLICY);
  assert.equal(JSON.parse(status.body).error, undefined);

  const unsigned = await app.inject({
    method: "GET",
    url: "/api/hls?u=" + encodeURIComponent("http://cdn.example/a.m3u8"),
  });
  assert.equal(unsigned.statusCode, 403);

  const metadata = await app.inject({ method: "GET", url: signHlsPath("http://169.254.169.254/latest/meta-data") });
  assert.equal(metadata.statusCode, 400);

  const tampered = signHlsPath("http://cdn.example/a.m3u8").replace(/sig=[^&]+/, "sig=aaaa");
  const badSig = await app.inject({ method: "GET", url: tampered });
  assert.equal(badSig.statusCode, 403);

  await app.close();
});
