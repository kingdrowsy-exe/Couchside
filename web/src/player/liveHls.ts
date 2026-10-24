/**
 * Live TV prefers a steady picture over sitting on the live edge.
 * hls.js otherwise starts in low-latency mode and a stall calls startLoad()
 * with no position, which seeks back to the edge and makes the picture jump.
 */
export const LIVE_HLS_CONFIG = {
  lowLatencyMode: false,
  /** Seconds behind the live edge. Inside the 5–10s range that keeps sports watchable. */
  liveSyncDuration: 8,
  /** How far behind the edge the playhead may sit before one resync. Large on purpose. */
  liveMaxLatencyDuration: 45,
  maxLiveSyncPlaybackRate: 1,
  liveDurationInfinity: true,
  liveSyncMode: "buffered" as const,
};

/** Position passed to startLoad after a stall. Never the hls.js "jump to live edge" value of -1. */
export function stallResumePosition(currentTime: number): number {
  if (!Number.isFinite(currentTime) || currentTime < 0) return 0;
  return currentTime;
}
