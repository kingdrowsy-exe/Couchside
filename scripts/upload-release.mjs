import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const tag = process.env.RELEASE_TAG ?? "";
if (!/^v\d/.test(tag)) {
  console.error("RELEASE_TAG must look like v1.0.0");
  process.exit(1);
}

const files = readdirSync("release").filter((name) => name.startsWith("Couchside-Setup-") && name.endsWith(".exe"));
if (files.length !== 1) {
  console.error(`Expected one Couchside-Setup exe in release/, found ${files.length}: ${files.join(", ")}`);
  process.exit(1);
}
const file = `release/${files[0]}`;

const view = spawnSync("gh", ["release", "view", tag], { stdio: "inherit" });
if (view.status !== 0) {
  const created = spawnSync("gh", ["release", "create", tag, file, "--title", tag, "--generate-notes"], {
    stdio: "inherit",
  });
  process.exit(created.status ?? 1);
}

const uploaded = spawnSync("gh", ["release", "upload", tag, file, "--clobber"], { stdio: "inherit" });
process.exit(uploaded.status ?? 1);
