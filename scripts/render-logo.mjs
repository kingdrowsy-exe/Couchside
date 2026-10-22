import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Same shapes as build/logo.svg, in a 32-unit grid. The play triangle is a hole.
function inside(x, y) {
  const back = x >= 6 && x <= 26 && y >= 6 && y <= 16;
  const armL = x >= 2 && x <= 8 && y >= 12 && y <= 24;
  const armR = x >= 24 && x <= 30 && y >= 12 && y <= 24;
  const seat = x >= 4 && x <= 28 && y >= 16 && y <= 24;
  const footL = x >= 5 && x <= 9 && y >= 26 && y <= 30;
  const footR = x >= 23 && x <= 27 && y >= 26 && y <= 30;
  const body = back || armL || armR || seat || footL || footR;
  if (!body) return false;
  // Play triangle (12.2, 9.2) (19.6, 12.8) (12.2, 16.4), pointing right.
  const ax = 12.2;
  const ay = 9.2;
  const bx = 19.6;
  const by = 12.8;
  const cx = 12.2;
  const cy = 16.4;
  const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const wa = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / d;
  const wb = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / d;
  const wc = 1 - wa - wb;
  const play = wa >= 0 && wb >= 0 && wc >= 0;
  return !play;
}

function png(size, { background = null } = {}) {
  const samples = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = ((x + (sx + 0.5) / samples) / size) * 32;
          const py = ((y + (sy + 0.5) / samples) / size) * 32;
          if (inside(px, py)) cover++;
        }
      }
      const alpha = cover / (samples * samples);
      const o = row + 1 + x * 4;
      if (background) {
        const a = alpha;
        raw[o] = Math.round(background[0] * (1 - a) + 0xff * a);
        raw[o + 1] = Math.round(background[1] * (1 - a) + 0x64 * a);
        raw[o + 2] = Math.round(background[2] * (1 - a) + 0x10 * a);
        raw[o + 3] = 255;
      } else {
        raw[o] = 0xff;
        raw[o + 1] = 0x64;
        raw[o + 2] = 0x10;
        raw[o + 3] = Math.round(alpha * 255);
      }
    }
  }
  return encodePng(size, size, zlib.deflateSync(raw));
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, compressed) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
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

const sizes = [16, 24, 32, 48, 64, 128, 256];
const transparent = sizes.map((size) => ({ size, png: png(size) }));
const icoFile = ico(transparent);

const svg = fs.readFileSync(path.join(root, "build", "logo.svg"));
const targets = {
  "web/public/logo.svg": svg,
  "web/public/logo-mark.png": transparent.find((image) => image.size === 128).png,
  "web/public/logo-mark-light.png": transparent.find((image) => image.size === 128).png,
  "web/public/logo.png": transparent.find((image) => image.size === 256).png,
  "web/public/app-icon.png": transparent.find((image) => image.size === 256).png,
  "web/public/logo-wordmark.png": transparent.find((image) => image.size === 256).png,
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
  fs.writeFileSync(path.join(previewDir, "logo-preview.png"), png(256, { background: [12, 12, 12] }));
  fs.copyFileSync(path.join(root, "build", "logo.svg"), path.join(previewDir, "logo.svg"));
}

console.log("wrote", Object.keys(targets).length, "logo files");
