import assert from "node:assert/strict";
import test from "node:test";
import { LIVE_HLS_CONFIG, stallResumePosition } from "../src/player/liveHls.ts";

test("live playback stays a few seconds behind the edge and does not catch up by speeding up", () => {
  assert.equal(LIVE_HLS_CONFIG.lowLatencyMode, false);
  assert.ok(LIVE_HLS_CONFIG.liveSyncDuration >= 5 && LIVE_HLS_CONFIG.liveSyncDuration <= 10);
  assert.ok(LIVE_HLS_CONFIG.liveMaxLatencyDuration >= 30);
  assert.equal(LIVE_HLS_CONFIG.maxLiveSyncPlaybackRate, 1);
  assert.equal(LIVE_HLS_CONFIG.liveDurationInfinity, true);
  assert.equal(LIVE_HLS_CONFIG.liveSyncMode, "buffered");
});

test("stall recovery never asks hls.js to jump to the live edge", () => {
  assert.equal(stallResumePosition(12.5), 12.5);
  assert.equal(stallResumePosition(0), 0);
  assert.equal(stallResumePosition(-1), 0);
  assert.equal(stallResumePosition(Number.NaN), 0);
  assert.equal(stallResumePosition(Number.POSITIVE_INFINITY), 0);
  assert.notEqual(stallResumePosition(-1), -1);
});
