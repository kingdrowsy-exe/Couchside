export type PopularView = "loading" | "unconfigured" | "error" | "ready";

/** A failed popular-shelf request is not the same as TMDB being disconnected. */
export function popularLoadView(configured: boolean | null, failed: boolean): PopularView {
  if (failed) return "error";
  if (configured === null) return "loading";
  if (!configured) return "unconfigured";
  return "ready";
}
