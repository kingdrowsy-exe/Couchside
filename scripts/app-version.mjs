import { readFileSync } from "node:fs";
import path from "node:path";

/** Walk up from a file or directory until the Couchside package.json is found. */
export function findAppRoot(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
      if (pkg.name === "couchside" && typeof pkg.version === "string" && pkg.version.length > 0) return dir;
    } catch {
      // keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find the Couchside package.json");
}

/** Product version from the root package.json, shared by the UI build and tests. */
export function readAppVersion(root) {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (pkg.name !== "couchside" || typeof pkg.version !== "string" || pkg.version.length === 0) {
    throw new Error("package.json is missing the Couchside version");
  }
  return pkg.version;
}
