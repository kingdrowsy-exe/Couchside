import assert from "node:assert/strict";
import test from "node:test";
import { popularLoadView } from "../src/pages/popularLoad.ts";

test("a failed On Demand load is not shown as TMDB being disconnected", () => {
  assert.equal(popularLoadView(null, false), "loading");
  assert.equal(popularLoadView(null, true), "error");
  assert.equal(popularLoadView(false, false), "unconfigured");
  assert.equal(popularLoadView(true, false), "ready");
  assert.equal(popularLoadView(false, true), "error");
});
