// Build script for the gloss MV3 extension.
// 1) type-check (zero TS errors enforced), 2) bundle with esbuild,
// 3) copy static assets + vendored PDF.js worker, 4) generate icons.
// Output: ./dist  (load this dir via chrome://extensions -> Load unpacked)

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const src = path.join(root, "src");

function log(msg) {
  console.log(`[build] ${msg}`);
}

// --- 1. Type-check -----------------------------------------------------------
log("type-checking (tsc --noEmit)…");
execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--noEmit"], {
  cwd: root,
  stdio: "inherit",
});

// --- 2. Clean + bundle -------------------------------------------------------
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const common = {
  bundle: true,
  minify: true,
  sourcemap: false,
  target: "es2022",
  logLevel: "info",
};

// Content scripts must be classic scripts (IIFE); pages/worker use ESM.
const iifeEntries = [
  ["src/content/content-script.ts", "content/content-script.js"],
  ["src/options/options.ts", "options/options.js"],
  ["src/popup/popup.ts", "popup/popup.js"],
];
const esmEntries = [
  ["src/background/service-worker.ts", "background/service-worker.js"],
  ["src/reader/reader.ts", "reader/reader.js"],
];

log("bundling…");
for (const [entry, out] of iifeEntries) {
  await build({
    ...common,
    entryPoints: [path.join(root, entry)],
    outfile: path.join(dist, out),
    format: "iife",
    platform: "browser",
  });
}
for (const [entry, out] of esmEntries) {
  await build({
    ...common,
    entryPoints: [path.join(root, entry)],
    outfile: path.join(dist, out),
    format: "esm",
    platform: "browser",
  });
}

// --- 3. Static assets --------------------------------------------------------
log("copying static assets…");
const staticFiles = [
  ["src/manifest.json", "manifest.json"],
  ["src/content/content.css", "content/content.css"],
  ["src/options/options.html", "options/options.html"],
  ["src/options/options.css", "options/options.css"],
  ["src/popup/popup.html", "popup/popup.html"],
  ["src/popup/popup.css", "popup/popup.css"],
  ["src/reader/reader.html", "reader/reader.html"],
  ["src/reader/reader.css", "reader/reader.css"],
];
for (const [from, to] of staticFiles) {
  const dest = path.join(dist, to);
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(path.join(root, from), dest);
}

// Vendored PDF.js worker (regenerated from node_modules on each build).
log("vendoring PDF.js worker…");
const workerSrc = path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
if (!existsSync(workerSrc)) {
  throw new Error("pdfjs-dist worker not found. Run `npm install` first.");
}
mkdirSync(path.join(dist, "pdfjs"), { recursive: true });
cpSync(workerSrc, path.join(dist, "pdfjs/pdf.worker.min.mjs"));

// --- 4. Icons (generated solid-color PNGs) -----------------------------------
log("generating icons…");
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function png(size, [r, g, b]) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
mkdirSync(path.join(dist, "icons"), { recursive: true });
const INDIGO = [79, 70, 229];
for (const size of [16, 48, 128]) {
  writeFileSync(path.join(dist, `icons/icon${size}.png`), png(size, INDIGO));
}

// --- Done --------------------------------------------------------------------
// Validate manifest JSON references exist on disk.
log("validating manifest references…");
const manifest = require(path.join(dist, "manifest.json"));
const refs = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  ...manifest.content_scripts.flatMap((c) => [...c.js, ...c.css]),
  ...Object.values(manifest.icons),
  "reader/reader.html",
  "pdfjs/pdf.worker.min.mjs",
];
for (const ref of refs) {
  if (!existsSync(path.join(dist, ref))) {
    throw new Error(`manifest references missing file: ${ref}`);
  }
}

void src;
log("done. Load ./dist via chrome://extensions -> Load unpacked.");
