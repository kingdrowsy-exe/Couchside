import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function locations() {
  // The packaged Electron app points this at Electron's per-user app-data folder
  // (writable regardless of where the app itself is installed); running the server
  // standalone falls back to a data/ folder next to the compiled server code.
  const dataDir = process.env.DATA_DIR ?? path.join(__dirname, "..", "data");
  return { dataDir, settingsPath: path.join(dataDir, "settings.json") };
}

export interface PlexSettings {
  baseUrl: string;
  token: string;
  serverName: string;
}

export interface SiloSettings {
  baseUrl: string;
  username: string;
  password: string;
}

export interface EmbySettings {
  baseUrl: string;
  username: string;
  password: string;
}

export interface XtreamSettings {
  baseUrl: string;
  username: string;
  password: string;
}

export interface TmdbSettings {
  accessToken: string;
}

export interface TraktSettings {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface Settings {
  plex?: PlexSettings;
  silo?: SiloSettings;
  emby?: EmbySettings;
  xtream?: XtreamSettings;
  tmdb?: TmdbSettings;
  trakt?: TraktSettings;
}

let cache: Settings | null = null;
let readError: string | null = null;

export class SettingsReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsReadError";
  }
}

/** Drop the in-memory copy so the next read hits disk. Used by tests. */
export function clearSettingsCache() {
  cache = null;
  readError = null;
}

function parseSettings(raw: Buffer): Settings {
  const text = raw.toString("utf8").replace(/^\uFEFF/, "");
  if (!text.trim()) throw new SettingsReadError("Saved settings file is empty.");
  try {
    return JSON.parse(text) as Settings;
  } catch {
    throw new SettingsReadError("Saved settings couldn't be read. They were left in place.");
  }
}

function readFromDisk(): Settings {
  const { settingsPath } = locations();
  if (!fs.existsSync(settingsPath)) return {};
  return parseSettings(fs.readFileSync(settingsPath));
}

function load(): Settings {
  if (cache) return cache;
  try {
    cache = readFromDisk();
    readError = null;
  } catch (err) {
    // Don't cache a failed read. A later save starts fresh; until then every
    // status check reports the error and the damaged file stays on disk.
    readError = err instanceof Error ? err.message : "Saved settings couldn't be read.";
    return {};
  }
  return cache;
}

function writeAtomic(file: string, body: Buffer) {
  const tmp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeSync(fd, body);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

/** Cached settings for a write. A damaged file is replaced only when the user saves. */
function edit(): Settings {
  if (cache) return cache;
  try {
    cache = readFromDisk();
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  const { dataDir, settingsPath } = locations();
  fs.mkdirSync(dataDir, { recursive: true });
  writeAtomic(settingsPath, Buffer.from(JSON.stringify(cache ?? {}, null, 2), "utf8"));
  readError = null;
}

export const settingsStore = {
  getPlex(): PlexSettings | undefined {
    return load().plex;
  },
  setPlex(plex: PlexSettings) {
    edit().plex = plex;
    persist();
  },
  clearPlex() {
    delete edit().plex;
    persist();
  },
  getSilo(): SiloSettings | undefined {
    return load().silo;
  },
  setSilo(silo: SiloSettings) {
    edit().silo = silo;
    persist();
  },
  clearSilo() {
    delete edit().silo;
    persist();
  },
  getEmby(): EmbySettings | undefined {
    return load().emby;
  },
  setEmby(emby: EmbySettings) {
    edit().emby = emby;
    persist();
  },
  clearEmby() {
    delete edit().emby;
    persist();
  },
  getXtream(): XtreamSettings | undefined {
    return load().xtream;
  },
  setXtream(xtream: XtreamSettings) {
    edit().xtream = xtream;
    persist();
  },
  clearXtream() {
    delete edit().xtream;
    persist();
  },
  getTmdb(): TmdbSettings | undefined {
    return load().tmdb;
  },
  setTmdb(tmdb: TmdbSettings) {
    edit().tmdb = tmdb;
    persist();
  },
  clearTmdb() {
    delete edit().tmdb;
    persist();
  },
  getTrakt(): TraktSettings | undefined {
    return load().trakt;
  },
  setTrakt(trakt: TraktSettings) {
    edit().trakt = trakt;
    persist();
  },
  updateTrakt(patch: Partial<TraktSettings>) {
    const existing = edit().trakt;
    if (!existing) return;
    edit().trakt = { ...existing, ...patch };
    persist();
  },
  clearTrakt() {
    delete edit().trakt;
    persist();
  },
  status() {
    const s = load();
    return {
      plex: Boolean(s.plex),
      silo: Boolean(s.silo),
      emby: Boolean(s.emby),
      xtream: Boolean(s.xtream),
      tmdb: Boolean(s.tmdb),
      trakt: Boolean(s.trakt?.accessToken),
      traktConfigured: Boolean(s.trakt),
      plexServerName: s.plex?.serverName,
      siloBaseUrl: s.silo?.baseUrl,
      embyBaseUrl: s.emby?.baseUrl,
      xtreamBaseUrl: s.xtream?.baseUrl,
      readError,
    };
  },
};

export class NotConfiguredError extends Error {
  constructor(public service: "plex" | "silo" | "emby" | "xtream" | "tmdb" | "trakt") {
    super(`${service} is not configured yet`);
  }
}
