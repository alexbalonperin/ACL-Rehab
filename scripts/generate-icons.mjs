// Generates PWA icons as PNGs using only Node built-ins (zlib).
// Draws a stylized bent-knee "leg" glyph in white on a teal background.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

// ── tiny PNG encoder ─────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── drawing ──────────────────────────────────────────────────────────────────
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const teal = [13, 148, 136];
  const tealDark = [15, 118, 110];
  const white = [255, 255, 255];

  const corner = maskable ? 0 : size * 0.2;
  // glyph scale: shrink for maskable safe zone
  const s = maskable ? 0.7 : 1;
  const cx0 = size / 2;
  const cy0 = size / 2;
  const map = (nx, ny) => [
    cx0 + (nx - 0.5) * size * s,
    cy0 + (ny - 0.5) * size * s,
  ];
  const [hipX, hipY] = map(0.34, 0.24);
  const [kneeX, kneeY] = map(0.66, 0.5);
  const [footX, footY] = map(0.42, 0.8);
  const thick = size * 0.1 * s;
  const kneeR = size * 0.105 * s;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // rounded-corner transparency for non-maskable
      let inside = true;
      if (corner > 0) {
        const rx = Math.min(x, size - 1 - x);
        const ry = Math.min(y, size - 1 - y);
        if (rx < corner && ry < corner) {
          if (Math.hypot(corner - rx, corner - ry) > corner) inside = false;
        }
      }
      if (!inside) {
        rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0;
        continue;
      }

      // subtle vertical gradient background
      const g = y / size;
      const bg = [
        Math.round(teal[0] * (1 - g) + tealDark[0] * g),
        Math.round(teal[1] * (1 - g) + tealDark[1] * g),
        Math.round(teal[2] * (1 - g) + tealDark[2] * g),
      ];

      const dThigh = distToSegment(x, y, hipX, hipY, kneeX, kneeY);
      const dShin = distToSegment(x, y, kneeX, kneeY, footX, footY);
      const dKnee = Math.hypot(x - kneeX, y - kneeY);
      const isGlyph = dThigh < thick / 2 || dShin < thick / 2 || dKnee < kneeR;

      const col = isGlyph ? white : bg;
      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function write(name, size, opts) {
  const png = encodePNG(size, size, drawIcon(size, opts));
  writeFileSync(join(OUT, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}

write("icon-192.png", 192);
write("icon-512.png", 512);
write("maskable-512.png", 512, { maskable: true });
write("apple-touch-icon.png", 180);
