import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "couchside-settings-"));
process.env.DATA_DIR = dataDir;

const { settingsStore, clearSettingsCache } = await import("../dist/settingsStore.js");
const { createApp } = await import("../dist/index.js");

const settingsPath = path.join(dataDir, "settings.json");

function writeRaw(body) {
  fs.writeFileSync(settingsPath, body);
  clearSettingsCache();
}

test("missing settings file reports every service disconnected", async () => {
  fs.rmSync(settingsPath, { force: true });
  clearSettingsCache();
  const status = settingsStore.status();
  assert.equal(status.plex, false);
  assert.equal(status.readError, null);
});

test("empty settings file is a readable error and the file is kept", async () => {
  writeRaw("");
  const before = fs.readFileSync(settingsPath);
  const status = settingsStore.status();
  assert.equal(status.plex, false);
  assert.match(status.readError, /empty/i);
  assert.deepEqual(fs.readFileSync(settingsPath), before);
});

test("truncated settings file is a readable error and the file is kept", async () => {
  writeRaw("{");
  const status = settingsStore.status();
  assert.match(status.readError, /couldn't be read/i);
  assert.equal(fs.readFileSync(settingsPath, "utf8"), "{");
});

test("a UTF-8 BOM does not make valid settings unreadable", async () => {
  writeRaw("\uFEFF" + JSON.stringify({ plex: { baseUrl: "http://plex", token: "t", serverName: "Living Room" } }));
  const status = settingsStore.status();
  assert.equal(status.readError, null);
  assert.equal(status.plex, true);
  assert.equal(status.plexServerName, "Living Room");
});

test("saving settings replaces the file atomically with complete JSON", async () => {
  writeRaw("{");
  settingsStore.setXtream({ baseUrl: "http://tv.example", username: "u", password: "p" });
  const files = fs.readdirSync(dataDir);
  assert.equal(files.some((name) => name.endsWith(".tmp")), false);
  const saved = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  assert.equal(saved.xtream.username, "u");
  clearSettingsCache();
  assert.equal(settingsStore.status().readError, null);
  assert.equal(settingsStore.status().xtream, true);
});

test("GET /api/settings/status returns JSON instead of 500 when settings are damaged", async () => {
  writeRaw("");
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/api/settings/status" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"]?.includes("application/json"), true);
  const body = res.json();
  assert.match(body.readError, /empty/i);
  await app.close();
});
