import assert from "node:assert/strict";
import test from "node:test";
import { externalOpenAction, isAppNavigation } from "./navigation.mjs";

const origin = "http://127.0.0.1:4173";

test("the window stays on the embedded app and http links open outside it", () => {
  assert.equal(isAppNavigation("http://127.0.0.1:4173/settings", origin), true);
  assert.equal(isAppNavigation("http://127.0.0.1:4173/", origin), true);
  assert.equal(isAppNavigation("http://localhost:4173/", origin), false);
  assert.equal(isAppNavigation("https://evil.example/", origin), false);
  assert.equal(isAppNavigation("not a url", origin), false);
  assert.equal(externalOpenAction("https://plex.tv/link"), "external");
  assert.equal(externalOpenAction("http://192.168.1.20:32400"), "external");
  assert.equal(externalOpenAction("file:///etc/passwd"), "deny");
  assert.equal(externalOpenAction("javascript:alert(1)"), "deny");
});
