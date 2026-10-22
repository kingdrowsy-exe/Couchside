import fs from "node:fs";
import path from "node:path";

export const LEGACY_PRODUCT_DIR = "Unified Media Hub";

export function legacyUserDataPath(appData) {
  return path.join(appData, LEGACY_PRODUCT_DIR);
}

function hasSettings(dataDir) {
  return fs.existsSync(path.join(dataDir, "settings.json"));
}

/**
 * Copy Unified Media Hub settings into the Couchside profile when the new
 * profile has no settings yet. The old directory is never deleted or modified.
 * Local State is copied too when the new profile doesn't have one, because
 * some systems keep the safeStorage key there.
 */
export function migrateUserData(oldUserData, newUserData) {
  if (!oldUserData || !newUserData) return { copied: false, reason: "missing-path" };
  if (path.resolve(oldUserData) === path.resolve(newUserData)) return { copied: false, reason: "same-path" };
  const oldData = path.join(oldUserData, "data");
  const newData = path.join(newUserData, "data");
  if (!fs.existsSync(oldData) || !hasSettings(oldData)) return { copied: false, reason: "no-legacy-settings" };
  if (hasSettings(newData)) return { copied: false, reason: "new-not-empty" };

  fs.mkdirSync(newData, { recursive: true });
  for (const name of fs.readdirSync(oldData)) {
    const from = path.join(oldData, name);
    const to = path.join(newData, name);
    if (fs.existsSync(to)) continue;
    fs.cpSync(from, to, { recursive: true, errorOnExist: false });
  }

  const oldState = path.join(oldUserData, "Local State");
  const newState = path.join(newUserData, "Local State");
  if (fs.existsSync(oldState) && !fs.existsSync(newState)) {
    fs.copyFileSync(oldState, newState);
  }

  return { copied: true };
}
