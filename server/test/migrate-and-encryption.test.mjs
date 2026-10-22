import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { migrateUserData } from "../../electron/migrateUserData.mjs";

test("a copied plaintext file is encrypted and still decrypts from the copy", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "couchside-box-"));
  const copyDir = fs.mkdtempSync(path.join(os.tmpdir(), "couchside-box-copy-"));
  process.env.DATA_DIR = dir;
  const { settingsStore, clearSettingsCache } = await import("../dist/settingsStore.js");
  const { setSecretBox } = await import("../dist/secretBox.js");
  setSecretBox({
    encrypt(plain) {
      return Buffer.from(plain.split("").reverse().join(""), "utf8");
    },
    decrypt(data) {
      return Buffer.from(data).toString("utf8").split("").reverse().join("");
    },
  });
  fs.writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify({ plex: { baseUrl: "http://plex.local", token: "tok", serverName: "Living Room" } }),
  );
  clearSettingsCache();
  assert.equal(settingsStore.status().plexServerName, "Living Room");
  const stored = fs.readFileSync(path.join(dir, "settings.json"));
  assert.equal(stored.subarray(0, 6).toString(), "CSDH1\n");
  fs.copyFileSync(path.join(dir, "settings.json"), path.join(copyDir, "settings.json"));
  process.env.DATA_DIR = copyDir;
  clearSettingsCache();
  assert.equal(settingsStore.getPlex()?.token, "tok");
  assert.equal(settingsStore.status().readError, null);
});

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("migration copies legacy settings and does not delete or overwrite them", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "couchside-migrate-"));
  const oldDir = path.join(base, "Unified Media Hub");
  const newDir = path.join(base, "Couchside");
  fs.mkdirSync(path.join(oldDir, "data"), { recursive: true });
  fs.writeFileSync(path.join(oldDir, "data", "settings.json"), '{"plex":{"token":"keep-me"}}');
  fs.writeFileSync(path.join(oldDir, "data", "plex-client-id"), "client-id");
  fs.writeFileSync(path.join(oldDir, "Local State"), '{"os_crypt":{"encrypted_key":"abc"}}');

  const first = migrateUserData(oldDir, newDir);
  assert.equal(first.copied, true);
  assert.equal(fs.readFileSync(path.join(newDir, "data", "settings.json"), "utf8"), '{"plex":{"token":"keep-me"}}');
  assert.equal(fs.readFileSync(path.join(newDir, "data", "plex-client-id"), "utf8"), "client-id");
  assert.equal(fs.readFileSync(path.join(newDir, "Local State"), "utf8"), '{"os_crypt":{"encrypted_key":"abc"}}');
  assert.equal(fs.readFileSync(path.join(oldDir, "data", "settings.json"), "utf8"), '{"plex":{"token":"keep-me"}}');

  fs.writeFileSync(path.join(oldDir, "data", "settings.json"), '{"plex":{"token":"newer"}}');
  const second = migrateUserData(oldDir, newDir);
  assert.equal(second.copied, false);
  assert.equal(second.reason, "new-not-empty");
  assert.equal(fs.readFileSync(path.join(newDir, "data", "settings.json"), "utf8"), '{"plex":{"token":"keep-me"}}');
  assert.equal(fs.existsSync(path.join(oldDir, "data", "settings.json")), true);
});

test("encrypted settings still decrypt after they are copied to an empty profile", () => {
  let electronPath;
  try {
    electronPath = require("electron");
  } catch {
    electronPath = null;
  }
  if (typeof electronPath !== "string" || !fs.existsSync(electronPath)) {
    return;
  }

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "couchside-safestorage-"));
  const oldDir = path.join(base, "old");
  const newDir = path.join(base, "new");
  fs.mkdirSync(oldDir, { recursive: true });
  const script = path.join(root, "electron", "settings-roundtrip.mjs");
  const run = (phase) =>
    spawnSync(electronPath, [script, "--no-sandbox"], {
      cwd: root,
      env: { ...process.env, PHASE: phase, OLD_DIR: oldDir, NEW_DIR: newDir },
      encoding: "utf8",
    });

  const encrypted = run("encrypt");
  assert.equal(encrypted.status, 0, encrypted.stderr || encrypted.stdout);
  const copied = fs.readFileSync(path.join(oldDir, "data", "settings.json"));
  assert.equal(copied.subarray(0, 6).toString(), "CSDH1\n");

  const decrypted = run("decrypt");
  assert.equal(decrypted.status, 0, decrypted.stderr || decrypted.stdout);
  const line = decrypted.stdout.trim().split("\n").filter((row) => row.startsWith("{")).pop();
  const body = JSON.parse(line);
  assert.equal(body.token, "plex-token-123");
  assert.equal(body.oldStill, true);
  assert.equal(body.readError, null);
  assert.equal(fs.readFileSync(path.join(oldDir, "data", "settings.json")).equals(copied), true);
});
