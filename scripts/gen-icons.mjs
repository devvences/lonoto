#!/usr/bin/env node
/**
 * Generates the PWA / apple-touch icons without any native image dependency.
 * Run with: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/icons');

const SS = 4; // supersampling factor

function roundRect(x, y, w, h, r) {
  return (px, py) => {
    const rx = Math.min(r, w / 2);
    const ry = Math.min(r, h / 2);
    if (px < x || py < y || px > x + w || py > y + h) return false;
    const cx = Math.max(x + rx, Math.min(px, x + w - rx));
    const cy = Math.max(y + ry, Math.min(py, y + h - ry));
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= rx * ry;
  };
}

function triangle(ax, ay, bx, by, cx, cy) {
  return (px, py) => {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function drawIcon(size, { maskable = false } = {}) {
  const W = size * SS;
  const px = new Float32Array(W * W * 4);

  const paint = (test, colorAt) => {
    for (let y = 0; y < W; y++) {
      for (let x = 0; x < W; x++) {
        if (!test(x + 0.5, y + 0.5)) continue;
        const [r, g, b, a] = colorAt(x + 0.5, y + 0.5);
        const i = (y * W + x) * 4;
        const srcA = a / 255;
        const dstA = px[i + 3] / 255;
        const outA = srcA + dstA * (1 - srcA);
        if (outA === 0) continue;
        px[i] = (r * srcA + px[i] * dstA * (1 - srcA)) / outA;
        px[i + 1] = (g * srcA + px[i + 1] * dstA * (1 - srcA)) / outA;
        px[i + 2] = (b * srcA + px[i + 2] * dstA * (1 - srcA)) / outA;
        px[i + 3] = outA * 255;
      }
    }
  };

  if (maskable) {
    paint(() => true, (_, y) => {
      const t = y / W;
      return [mix(18, 8, t), mix(35, 19, t), mix(59, 32, t), 255];
    });
  } else {
    paint(roundRect(0, 0, W, W, W * 0.227), (_, y) => {
      const t = y / W;
      return [mix(18, 8, t), mix(35, 19, t), mix(59, 32, t), 255];
    });
  }

  const scale = maskable ? 0.72 : 0.86;
  const nw = W * scale * 0.52;
  const nh = W * scale * 0.64;
  const nx = (W - nw) / 2;
  const ny = (W - nh) / 2;
  const radius = nw * 0.15;

  paint(roundRect(nx, ny, nw, nh, radius), (_, y) => {
    const t = (y - ny) / nh;
    return [mix(255, 255, t), mix(214, 158, t), mix(142, 58, t), 255];
  });

  // Folded corner
  const fold = nw * 0.34;
  paint(triangle(nx + nw - fold, ny, nx + nw, ny, nx + nw, ny + fold), () => [
    255,
    231,
    192,
    255,
  ]);

  // Three text lines
  const lineX = nx + nw * 0.2;
  const lineW = nw * 0.58;
  const lineH = nh * 0.055;
  const lineR = lineH / 2;
  const lineY = ny + nh * 0.42;
  const gap = nh * 0.135;
  const widths = [lineW, lineW * 0.8, lineW * 0.9];
  const alphas = [0.85, 0.65, 0.5];
  widths.forEach((w, idx) => {
    paint(roundRect(lineX, lineY + gap * idx, w, lineH, lineR), () => [
      45,
      31,
      15,
      Math.round(255 * alphas[idx]),
    ]);
  });

  // Box filter downscale
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = (((y * SS + sy) * W) + (x * SS + sx)) * 4;
          r += px[i];
          g += px[i + 1];
          b += px[i + 2];
          a += px[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });

const outputs = [
  ['pwa-192x192.png', 192, {}],
  ['pwa-512x512.png', 512, {}],
  ['maskable-512x512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
];

for (const [name, size, opts] of outputs) {
  const rgba = drawIcon(size, opts);
  writeFileSync(resolve(OUT, name), encodePng(size, rgba));
  console.log(`wrote public/icons/${name}`);
}
