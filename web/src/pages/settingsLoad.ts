/** What the Settings page should show. A failed load is its own state, not an endless spinner. */
export function settingsLoadView(status: unknown, loadError: string | null): "loading" | "error" | "ready" {
  if (status) return "ready";
  if (loadError) return "error";
  return "loading";
}
