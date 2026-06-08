// Genera los iconos de la extensión (16/32/48/128/512) sin dependencias externas.
// Diseño: cuadrado redondeado con gradiente indigo→violeta + mini gráfico de
// barras blanco (alude al registro/resumen de horas de Trinity).
// Uso: node bin/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SS = 4; // supersampling para antialiasing

// --- helpers de color ---
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

// Paleta marca Trinity
const TOP = [0x7c, 0x5cff & 0xff, 0xff]; // placeholder, redefinido abajo
const GRAD_TOP = [0x70, 0x5c, 0xff]; // #705CFF
const GRAD_BOT = [0x4f, 0x46, 0xe5]; // #4F46E5 (indigo-600)
const BAR = [0xff, 0xff, 0xff];

function insideRoundRect(x, y, w, h, r) {
  // x,y en [0,1]; coordenadas a px
  const px = x * w, py = y * h;
  const cx = Math.min(Math.max(px, r), w - r);
  const cy = Math.min(Math.max(py, r), h - r);
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function renderSize(size) {
  const W = size * SS;
  const hi = new Float32Array(W * W * 4);
  const r = W * 0.22; // radio esquinas

  // Layout de barras (en fracción del lienzo)
  const bars = [
    { x: 0.255, top: 0.60 },
    { x: 0.45, top: 0.40 },
    { x: 0.645, top: 0.235 },
  ];
  const barW = W * 0.135;
  const barBottom = W * 0.78;
  const barRad = barW * 0.32;

  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const idx = (j * W + i) * 4;
      const fx = (i + 0.5) / W, fy = (j + 0.5) / W;
      if (!insideRoundRect(fx, fy, W, W, r)) continue; // fuera del cuadrado → transparente
      // fondo con gradiente vertical
      let col = mix(GRAD_TOP, GRAD_BOT, fy);
      // barras (rect redondeado vertical)
      for (const b of bars) {
        const bx = b.x * W;
        const left = bx, right = bx + barW;
        const top = b.top * W;
        const px = i + 0.5, py = j + 0.5;
        if (px >= left && px <= right && py >= top && py <= barBottom) {
          // esquinas superiores redondeadas
          const cx = Math.min(Math.max(px, left + barRad), right - barRad);
          const cyTop = top + barRad;
          let inside = true;
          if (py < cyTop) {
            const dx = px - cx, dy = py - cyTop;
            inside = dx * dx + dy * dy <= barRad * barRad;
          }
          if (inside) col = BAR;
        }
      }
      hi[idx] = col[0]; hi[idx + 1] = col[1]; hi[idx + 2] = col[2]; hi[idx + 3] = 255;
    }
  }

  // downsample box filter SS×SS → size
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let R = 0, G = 0, B = 0, A = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const si = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          const a = hi[si + 3];
          R += hi[si] * a; G += hi[si + 1] * a; B += hi[si + 2] * a; A += a;
        }
      }
      const o = (y * size + x) * 4;
      const aAvg = A / (SS * SS);
      if (A > 0) { out[o] = Math.round(R / A); out[o + 1] = Math.round(G / A); out[o + 2] = Math.round(B / A); }
      out[o + 3] = Math.round(aAvg);
    }
  }
  return out;
}

// --- encoder PNG (RGBA, color type 6) ---
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
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filtro none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

void TOP;
for (const s of [16, 32, 48, 128, 512]) {
  const rgba = renderSize(s);
  const png = encodePng(rgba, s);
  const name = s === 512 ? 'icon.png' : `icon${s}.png`;
  writeFileSync(join(OUT, name), png);
  console.log('escrito', name, png.length, 'bytes');
}
