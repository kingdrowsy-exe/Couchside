import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markSvg = path.join(root, "build", "logo.svg");
const iconSvg = path.join(root, "build", "logo-icon.svg");
const lockupSvg = path.join(root, "build", "logo-lockup.svg");

function raster(svg, width, height, out) {
  const result = spawnSync("rsvg-convert", ["-w", String(width), "-h", String(height), svg, "-o", out], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("rsvg-convert failed. Install librsvg (rsvg-convert) to regenerate the icons.");
  }
  return fs.readFileSync(out);
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
}

function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = Buffer.alloc(16 * pngs.length);
  let offset = 6 + entries.length;
  const blobs = [];
  pngs.forEach((image, i) => {
    const at = i * 16;
    entries[at] = image.size === 256 ? 0 : image.size;
    entries[at + 1] = image.size === 256 ? 0 : image.size;
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(image.png.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += image.png.length;
    blobs.push(image.png);
  });
  return Buffer.concat([header, entries, ...blobs]);
}

fs.mkdirSync(path.join(root, ".cache"), { recursive: true });
const tmp = fs.mkdtempSync(path.join(root, ".cache", "logo-"));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const iconPngs = sizes.map((size) => ({ size, png: raster(iconSvg, size, size, path.join(tmp, `icon-${size}.png`)) }));
const icoFile = ico(iconPngs);
const mark = fs.readFileSync(markSvg);
const lockupPng = raster(lockupSvg, 1120, 720, path.join(tmp, "lockup.png"));

const targets = {
  "web/public/logo.svg": mark,
  "web/public/logo-mark.png": iconPngs.find((image) => image.size === 128).png,
  "web/public/logo-mark-light.png": iconPngs.find((image) => image.size === 128).png,
  "web/public/logo.png": iconPngs.find((image) => image.size === 256).png,
  "web/public/app-icon.png": iconPngs.find((image) => image.size === 256).png,
  "web/public/logo-wordmark.png": lockupPng,
  "web/public/logo.ico": icoFile,
  "build/icon.ico": icoFile,
};

for (const [rel, body] of Object.entries(targets)) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

const previewDir = process.env.LOGO_PREVIEW_DIR;
if (previewDir) {
  fs.mkdirSync(previewDir, { recursive: true });
  fs.copyFileSync(markSvg, path.join(previewDir, "logo.svg"));
  fs.copyFileSync(lockupSvg, path.join(previewDir, "logo-lockup.svg"));
  fs.writeFileSync(path.join(previewDir, "logo-mark.png"), raster(markSvg, 256, 155, path.join(tmp, "mark-256.png")));
  fs.writeFileSync(path.join(previewDir, "logo-lockup.png"), lockupPng);
  fs.writeFileSync(path.join(previewDir, "logo-32.png"), raster(iconSvg, 32, 32, path.join(tmp, "icon-32-copy.png")));
  fs.writeFileSync(path.join(previewDir, "logo-16.png"), raster(iconSvg, 16, 16, path.join(tmp, "icon-16-copy.png")));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log("wrote", Object.keys(targets).length, "logo files");
