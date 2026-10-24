# Changelog

## 1.0.0

- Couchside replaces Unified Media Hub. The app id is `com.kingdrowsy.couchside`, the window and shortcuts are named Couchside, and the installer is `Couchside-Setup-1.0.0.exe`.
- The logo is a white couch with a play cutout. The wordmark is "couch" in white and "side" in purple. The accent is `#6A2DFB`.
- The first launch copies an existing Unified Media Hub profile into the Couchside folder when Couchside does not already have a settings file. The old folder is not deleted or overwritten.
- Settings no longer stays on "Loading settings…" when `settings.json` is empty or cut off. Saves are written atomically, and the page shows an error with Try again.
- Xtream live TV stays about eight seconds behind the live edge, does not speed up to catch up, and resumes a stall at the current picture instead of jumping. The repeat-chunk filter stays off.
- The local server listens on 127.0.0.1 only. Saved logins are encrypted with Electron safeStorage when that is available. Stream proxy URLs are signed, and the window does not navigate off to other sites.
