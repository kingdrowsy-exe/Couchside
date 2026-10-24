import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { migrateUserData } from "./migrateUserData.mjs";

safeStorage.setUsePlainTextEncryption(true);

const phase = process.env.PHASE;
const oldDir = process.env.OLD_DIR;
const newDir = process.env.NEW_DIR;

if (phase === "encrypt") {
  app.setPath("userData", oldDir);
  process.env.DATA_DIR = path.join(oldDir, "data");
  app.whenReady().then(async () => {
    const { settingsStore } = await import("../server/dist/settingsStore.js");
    settingsStore.setPlex({ baseUrl: "http://plex.local", token: "plex-token-123", serverName: "Living Room" });
    app.exit(0);
  });
} else {
  migrateUserData(oldDir, newDir);
  app.setPath("userData", newDir);
  process.env.DATA_DIR = path.join(newDir, "data");
  app.whenReady().then(async () => {
    const { settingsStore } = await import("../server/dist/settingsStore.js");
    const plex = settingsStore.getPlex();
    const status = settingsStore.status();
    console.log(
      JSON.stringify({
        token: plex?.token ?? null,
        oldStill: fs.existsSync(path.join(oldDir, "data", "settings.json")),
        readError: status.readError,
      }),
    );
    app.exit(plex?.token === "plex-token-123" && status.readError == null ? 0 : 1);
  });
}
