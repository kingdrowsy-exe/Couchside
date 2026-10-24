import assert from "node:assert/strict";
import test from "node:test";
import { settingsLoadView } from "../src/pages/settingsLoad.ts";

test("a failed settings request leaves the loading state", () => {
  assert.equal(settingsLoadView(null, null), "loading");
  assert.equal(settingsLoadView(null, "Saved settings file is empty."), "error");
  assert.equal(settingsLoadView({ plex: false }, null), "ready");
  assert.equal(settingsLoadView({ plex: false }, "Saved settings couldn't be read."), "ready");
});
