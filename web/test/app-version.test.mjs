import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findAppRoot, readAppVersion } from "../../scripts/app-version.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("the UI version is read from package.json", () => {
  const version = readAppVersion(findAppRoot(path.join(root, "web")));
  assert.equal(version, "1.0.0");
  assert.equal(JSON.parse(readFileSync(path.join(root, "server/package.json"), "utf8")).version, version);
  assert.equal(JSON.parse(readFileSync(path.join(root, "web/package.json"), "utf8")).version, version);
});
