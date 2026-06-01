/**
 * Generates the PWA / favicon PNGs with zero dependencies (Node's built-in
 * zlib only). Draws the brand mark: an accent background with a bold white
 * upward triangle (the "up only" energy). Re-run with: node scripts/generate-icons.mjs
 *
 * Reskin: colors are read from lib/design-tokens via the hex values below
 * (kept literal here so this stays a plain .mjs with no TS import step).
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const ACCENT = [0x7c, 0x5c, 0xff]; // colors.accent #7C5CFF
const WHITE = [0xf5, 0xf7, 0xfa]; // colors.text

const crcTable = (() => {
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size) {
  // Build RGBA pixels.
  const raw = Buffer.alloc(size * (size * 4 + 1)); // +1 filter byte per row
  // Triangle vertices (pointing up), centered, ~56% of canvas.
  const m = size * 0.24; // margin
  const apex = [size / 2, m];
  const bl = [m, size - m];
  const br = [size - m, size - m];

  function inTriangle(px, py) {
    const sign = (ax, ay, bx, by, cx, cy) =>
      (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
    const d1 = sign(px, py, apex[0], apex[1], bl[0], bl[1]);
    const d2 = sign(px, py, bl[0], bl[1], br[0], br[1]);
    const d3 = sign(px, py, br[0], br[1], apex[0], apex[1]);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  }

  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const c = inTriangle(x + 0.5, y + 0.5) ? WHITE : ACCENT;
      raw[o++] = c[0];
      raw[o++] = c[1];
      raw[o++] = c[2];
      raw[o++] = 0xff; // alpha
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });

const targets = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["app/icon.png", 64],
];

for (const [path, size] of targets) {
  writeFileSync(path, makePng(size));
  console.log(`wrote ${path} (${size}x${size})`);
}
