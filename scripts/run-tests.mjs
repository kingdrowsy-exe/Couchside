import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "release") continue;
      walk(full, out);
    } else if (/\.test\.(mjs|cjs|js|ts)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const tsc = path.join(root, "server", "node_modules", "typescript", "lib", "tsc.js");
const build = spawnSync(process.execPath, [tsc, "-p", path.join(root, "server", "tsconfig.json")], {
  cwd: root,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const files = walk(root).sort();
if (files.length === 0) {
  console.error("No test files found");
  process.exit(1);
}

const run = spawnSync(process.execPath, ["--experimental-strip-types", "--test", ...files], {
  cwd: root,
  stdio: "inherit",
});
process.exit(run.status ?? 1);
