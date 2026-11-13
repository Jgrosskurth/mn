/**
 * Gallery sync — pulls new "Share a photo with Mike" submissions from the Tally → Google Sheet
 * and adds them to gallery/index.json (the gallery block re-renders from that file).
 *
 * Run by .github/workflows/gallery-sync.yaml. No secrets: the sheet is a public view-only link.
 *
 * Env:
 *   SHEET_CSV_URL  CSV export URL of the sheet (required)
 *   GALLERY_DIR    folder holding index.json + photos/ (default: gallery)
 *   CHECK_ONLY     "1" → only count new rows; writes `new=<n>` to $GITHUB_OUTPUT
 *
 * Per new row (keyed by Submission ID): download the photo, convert to an EXIF-stripped
 * (no GPS), auto-oriented JPEG ≤ 1600 px, save gallery/photos/<id>.jpg, append the entry.
 * A row whose photo can't be fetched or converted is skipped and retried on the next run.
 */
/* eslint-disable no-console -- CLI script: its log is the Actions run log */
import { execFileSync } from 'node:child_process';
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { SHEET_CSV_URL, GITHUB_OUTPUT } = process.env;
const GALLERY_DIR = process.env.GALLERY_DIR || 'gallery';
const CHECK_ONLY = process.env.CHECK_ONLY === '1';
const MAX_BYTES = 25 * 1024 * 1024;

// RFC 4180 CSV: quoted fields may hold commas, quotes ("") and newlines
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

const clean = (s, max) => (s || '')
  // eslint-disable-next-line no-control-regex -- intentionally strips control characters
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const safeId = (id) => id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);

function column(header, ...names) {
  const lower = header.map((h) => h.trim().toLowerCase());
  return lower.findIndex((h) => names.includes(h));
}

async function readSheet() {
  if (!SHEET_CSV_URL) throw new Error('SHEET_CSV_URL is not set');
  const resp = await fetch(SHEET_CSV_URL, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`sheet fetch failed: HTTP ${resp.status}`);
  const [header = [], ...rows] = parseCsv(await resp.text());
  const col = {
    id: column(header, 'submission id'),
    at: column(header, 'submitted at'),
    name: column(header, 'your name', 'name'),
    photo: column(header, 'photo'),
    message: column(header, 'your message', 'message'),
  };
  if (col.id < 0 || col.name < 0 || col.photo < 0) {
    throw new Error(`unexpected sheet columns: ${header.join(' | ')}`);
  }
  return rows.map((r) => ({
    id: safeId(r[col.id] || ''),
    at: col.at >= 0 ? r[col.at] : '',
    name: clean(r[col.name], 80),
    comment: col.message >= 0 ? clean(r[col.message], 500) : '',
    photo: ((r[col.photo] || '').match(/https?:\/\/[^\s,]+/) || [])[0],
  })).filter((s) => s.id && s.name && s.photo);
}

async function download(url, file) {
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`photo HTTP ${resp.status}`);
  const len = Number(resp.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error(`photo too large (${len} bytes)`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`photo too large (${buf.length} bytes)`);
  writeFileSync(file, buf);
  return (resp.headers.get('content-type') || '').toLowerCase();
}

function toJpeg(input, type, output) {
  let src = input;
  const heic = /hei[cf]/.test(type) || /^....ftyp(heic|heix|mif1|msf1)/.test(readFileSync(input).subarray(0, 12).toString('latin1'));
  if (heic) {
    src = `${input}.png`;
    execFileSync('heif-convert', [input, src], { stdio: 'pipe' });
  }
  execFileSync('convert', [`${src}[0]`, '-auto-orient', '-resize', '1600x1600>', '-strip',
    '-sampling-factor', '4:2:0', '-quality', '82', '-interlace', 'JPEG', output], { stdio: 'pipe' });
  const [w, h] = execFileSync('identify', ['-format', '%w %h', output])
    .toString()
    .trim()
    .split(' ')
    .map(Number);
  return { width: w, height: h };
}

function isoDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

const indexFile = join(GALLERY_DIR, 'index.json');
const entries = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : [];
const known = new Set(entries.map((e) => e.id).filter(Boolean));
const fresh = (await readSheet()).filter((s) => !known.has(s.id));

console.log(`sheet: ${fresh.length} new submission(s)`);
if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `new=${fresh.length}\n`);

if (!CHECK_ONLY && fresh.length) {
  const photos = join(GALLERY_DIR, 'photos');
  mkdirSync(photos, { recursive: true });
  let added = 0;
  // sequential on purpose: small volumes, keeps memory flat
  // eslint-disable-next-line no-restricted-syntax
  for (const s of fresh) {
    const tmp = join(tmpdir(), `gallery-${s.id}`);
    try {
      // eslint-disable-next-line no-await-in-loop
      const type = await download(s.photo, tmp);
      const file = `${s.id}.jpg`;
      const { width, height } = toJpeg(tmp, type, join(photos, file));
      entries.push({
        id: s.id,
        name: s.name,
        comment: s.comment,
        image: `/${GALLERY_DIR}/photos/${file}`,
        width,
        height,
        date: isoDate(s.at),
      });
      added += 1;
      console.log(`added ${s.id} (${s.name}) ${width}x${height}`);
    } catch (err) {
      console.warn(`skipped ${s.id} (${s.name}): ${err.message} — will retry next run`);
    } finally {
      rmSync(tmp, { force: true });
      rmSync(`${tmp}.png`, { force: true });
    }
  }
  if (added) writeFileSync(indexFile, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`index: ${added} added, ${entries.length} total`);
}
