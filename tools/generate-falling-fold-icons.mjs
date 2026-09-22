import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants as zlibConstants, deflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');
const VIEWBOX = 64;
const SUPERSAMPLE = 4;

const COLORS = Object.freeze({
  background: '#071729',
  base: '#163C78',
  seam: '#E6FCFF',
});

// Orthographic isometric projection of a unit cube, then an 18-degree screen tilt.
// Every projected edge has the same length; opposite edges remain parallel.
const project = (x, y) => {
  const angle = Math.PI / 10;
  return [
    32 + 0.92 * (x * Math.cos(angle) - y * Math.sin(angle)),
    32 + 0.92 * (x * Math.sin(angle) + y * Math.cos(angle)),
  ].map((value) => Number(value.toFixed(4)));
};
const HALF_WIDTH = 14 * Math.sqrt(3);
const TOP = project(0, -28);
const UPPER_RIGHT = project(HALF_WIDTH, -14);
const LOWER_RIGHT = project(HALF_WIDTH, 14);
const BOTTOM = project(0, 28);
const LOWER_LEFT = project(-HALF_WIDTH, 14);
const UPPER_LEFT = project(-HALF_WIDTH, -14);
const CENTER = project(0, 0);
const OUTLINE = Object.freeze([TOP, UPPER_RIGHT, LOWER_RIGHT, BOTTOM, LOWER_LEFT, UPPER_LEFT]);

const FACETS = Object.freeze([
  Object.freeze({
    from: '#DDFEFF', to: '#62DEFA',
    points: Object.freeze([TOP, UPPER_RIGHT, CENTER, UPPER_LEFT]),
  }),
  Object.freeze({
    from: '#35BBF0', to: '#165BD0',
    points: Object.freeze([CENTER, UPPER_RIGHT, LOWER_RIGHT, BOTTOM]),
  }),
  Object.freeze({
    from: '#2479BC', to: '#112D65',
    points: Object.freeze([UPPER_LEFT, CENTER, BOTTOM, LOWER_LEFT]),
  }),
]);

const RIDGES = Object.freeze([
  [UPPER_LEFT, CENTER], [CENTER, UPPER_RIGHT], [CENTER, BOTTOM],
]);
const SEAM_WIDTH = 1.15;

const rgba = (hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff, 0xff];
};

const PALETTE = Object.freeze(Object.fromEntries(
  Object.entries(COLORS).map(([name, hex]) => [name, Object.freeze(rgba(hex))]),
));

function pathData(points, close = true) {
  const [first, ...rest] = points;
  return `M${first[0]} ${first[1]} ${rest.map(([x, y]) => `L${x} ${y}`).join(' ')}${close ? ' Z' : ''}`;
}

function svgBytes() {
  const outline = pathData(OUTLINE);
  const gradients = FACETS.map(({ from, to }, index) => (
    `    <linearGradient id="face-${index}" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="58" color-interpolation="sRGB"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`
  )).join('\n');
  const facets = FACETS.map(({ points }, index) => (
    `    <path data-role="facet" d="${pathData(points)}" fill="url(#face-${index})" />`
  )).join('\n');
  const seam = RIDGES.map((points) => pathData(points, false)).join(' ');
  const source = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">',
    '  <defs>',
    gradients,
    `    <clipPath id="fold-clip"><path d="${outline}" /></clipPath>`,
    '  </defs>',
    `  <path id="cube-body" d="${outline}" fill="${COLORS.base}" />`,
    '  <g clip-path="url(#fold-clip)">',
    facets,
    `  <path id="crystal-ridges" data-role="seam" d="${seam}" stroke="${COLORS.seam}" stroke-width="${SEAM_WIDTH}" stroke-linecap="round" stroke-linejoin="round" />`,
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
  return Buffer.from(source, 'utf8');
}

function pointInsidePolygon(x, y, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previous];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToSegment(x, y, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared));
  const nearestX = start[0] + projection * dx;
  const nearestY = start[1] + projection * dy;
  return Math.hypot(x - nearestX, y - nearestY);
}

function isOnSeam(x, y) {
  for (const [start, end] of RIDGES) {
    if (distanceToSegment(x, y, start, end) <= SEAM_WIDTH / 2) return true;
  }
  return false;
}

function sampleView(x, y, opaqueBackground) {
  if (!pointInsidePolygon(x, y, OUTLINE)) {
    return opaqueBackground ? PALETTE.background : [0, 0, 0, 0];
  }
  let color = PALETTE.base;
  for (const facet of FACETS) {
    if (pointInsidePolygon(x, y, facet.points)) {
      const start = rgba(facet.from);
      const end = rgba(facet.to);
      const progress = Math.max(0, Math.min(1, (y - 6) / 52));
      color = start.map((value, channel) => Math.round(value + (end[channel] - value) * progress));
    }
  }
  if (isOnSeam(x, y)) color = PALETTE.seam;
  return color;
}

function rasterRgba(size, { opaqueBackground = false, scale = size / VIEWBOX, offset = 0 } = {}) {
  const highSize = size * SUPERSAMPLE;
  const high = new Uint8Array(highSize * highSize * 4);
  for (let y = 0; y < highSize; y += 1) {
    for (let x = 0; x < highSize; x += 1) {
      const canvasX = (x + 0.5) / SUPERSAMPLE;
      const canvasY = (y + 0.5) / SUPERSAMPLE;
      const viewX = (canvasX - offset) / scale;
      const viewY = (canvasY - offset) / scale;
      const color = sampleView(viewX, viewY, opaqueBackground);
      const offsetIndex = (y * highSize + x) * 4;
      high.set(color, offsetIndex);
    }
  }

  const output = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sumAlpha = 0;
      let sumRed = 0;
      let sumGreen = 0;
      let sumBlue = 0;
      for (let sampleY = 0; sampleY < SUPERSAMPLE; sampleY += 1) {
        for (let sampleX = 0; sampleX < SUPERSAMPLE; sampleX += 1) {
          const highIndex = (((y * SUPERSAMPLE + sampleY) * highSize)
            + x * SUPERSAMPLE + sampleX) * 4;
          const alpha = high[highIndex + 3];
          sumAlpha += alpha;
          sumRed += high[highIndex] * alpha;
          sumGreen += high[highIndex + 1] * alpha;
          sumBlue += high[highIndex + 2] * alpha;
        }
      }
      const samples = SUPERSAMPLE * SUPERSAMPLE;
      const outputIndex = (y * size + x) * 4;
      output[outputIndex] = sumAlpha === 0 ? 0 : Math.round(sumRed / sumAlpha);
      output[outputIndex + 1] = sumAlpha === 0 ? 0 : Math.round(sumGreen / sumAlpha);
      output[outputIndex + 2] = sumAlpha === 0 ? 0 : Math.round(sumBlue / sumAlpha);
      output[outputIndex + 3] = Math.round(sumAlpha / samples);
    }
  }
  return output;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function pngBytes(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0;
    pixels.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = deflateSync(scanlines, {
    level: 9,
    strategy: zlibConstants.Z_FIXED,
  });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

mkdirSync(PUBLIC, { recursive: true });
const outputs = new Map();
outputs.set('favicon.svg', svgBytes());
for (const size of [16, 32, 64]) {
  outputs.set(`favicon-${size}x${size}.png`, pngBytes(size, size, rasterRgba(size)));
}
outputs.set('apple-touch-icon.png', pngBytes(180, 180, rasterRgba(180, {
  opaqueBackground: true,
  scale: 2.65,
  offset: 5.2,
})));

for (const [name, bytes] of outputs) writeFileSync(resolve(PUBLIC, name), bytes);
process.stdout.write(`${JSON.stringify(Object.fromEntries(
  [...outputs].map(([name, bytes]) => [name, { bytes: bytes.length, sha256: sha256(bytes) }]),
), null, 2)}\n`);
