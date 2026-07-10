import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './paths.mjs';

export async function ensureDirs() {
  for (const dir of [
    PATHS.draftsReview,
    PATHS.draftsScheduled,
    PATHS.draftsPublished,
    PATHS.imagesPosts
  ]) {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function readJson(file, fallback = null) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (fallback !== null && err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function listDrafts(dir) {
  await fs.mkdir(dir, { recursive: true });
  const files = await fs.readdir(dir);
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const full = path.join(dir, f);
    const data = await readJson(full);
    out.push({ file: f, path: full, data });
  }
  return out.sort((a, b) =>
    String(a.data.publishAt || a.data.generatedAt || '').localeCompare(
      String(b.data.publishAt || b.data.generatedAt || '')
    )
  );
}

export function slugify(text) {
  return String(text || 'post')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function loadPosts() {
  return readJson(PATHS.postsJson);
}

export async function savePosts(data) {
  await writeJson(PATHS.postsJson, data);
}

export async function loadQueue() {
  return readJson(PATHS.queueJson, { items: [], publishSlots: ['09:00', '15:00', '19:00'] });
}

export async function saveQueue(data) {
  await writeJson(PATHS.queueJson, data);
}
