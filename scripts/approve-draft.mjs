#!/usr/bin/env node
/**
 * Move rascunho de review → scheduled e atribui horário 9h / 15h / 19h (BRT).
 *
 * Após aprovar, a publicação é automática no horário (GitHub Action).
 *
 * Uso:
 *   npm run approve -- --slug meu-post
 *   npm run approve -- --all
 *   npm run approve -- --slug meu-post --slot 2026-07-20T15:00:00-03:00
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './lib/paths.mjs';
import { ensureDirs, listDrafts, writeJson } from './lib/draft-io.mjs';
import { nextFreeSlot } from './lib/slots.mjs';

function args() {
  const a = process.argv.slice(2);
  const out = { all: false, slug: null, slot: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--all') out.all = true;
    else if (a[i] === '--slug') out.slug = a[++i];
    else if (a[i] === '--slot') out.slot = a[++i];
  }
  return out;
}

async function occupiedSlots() {
  const scheduled = await listDrafts(PATHS.draftsScheduled);
  return scheduled.map((d) => d.data.publishAt).filter(Boolean);
}

async function approveOne(filePath, draft, forcedSlot, occupied) {
  let publishAt = forcedSlot;
  let date = draft.date;
  if (!publishAt) {
    const slot = nextFreeSlot(new Date(), occupied);
    publishAt = slot.publishAt;
    date = slot.date;
    occupied.push(publishAt);
  } else {
    occupied.push(publishAt);
    const m = publishAt.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) date = m[1];
  }

  const next = {
    ...draft,
    status: 'scheduled',
    publishAt,
    date,
    approvedAt: new Date().toISOString()
  };

  const dest = path.join(PATHS.draftsScheduled, path.basename(filePath));
  await writeJson(dest, next);
  await fs.unlink(filePath);
  console.log(`✅ Agendado: ${next.slug}`);
  console.log(`   publishAt: ${publishAt}`);
  return next;
}

async function main() {
  await ensureDirs();
  const opts = args();
  const review = await listDrafts(PATHS.draftsReview);

  if (!review.length) {
    console.log('Nenhum rascunho em data/drafts/review/');
    return;
  }

  const occupied = await occupiedSlots();
  let targets = [];

  if (opts.all) {
    targets = review;
  } else if (opts.slug) {
    const found = review.find(
      (d) => d.data.slug === opts.slug || d.file === `${opts.slug}.json`
    );
    if (!found) {
      console.error('Slug não encontrado em review:', opts.slug);
      process.exit(1);
    }
    targets = [found];
  } else {
    console.log('Rascunhos em review:');
    review.forEach((d, i) => {
      console.log(`  ${i + 1}. ${d.data.slug} — ${d.data.title}`);
    });
    console.log('\nUse: npm run approve -- --slug <slug>');
    console.log('  ou: npm run approve -- --all');
    return;
  }

  for (const t of targets) {
    await approveOne(t.path, t.data, opts.slot, occupied);
  }

  console.log('\n📅 Publicação automática nos horários 09:00 / 15:00 / 19:00 (America/Sao_Paulo).');
  console.log('   Local: npm run publish');
  console.log('   CI: workflow publish-scheduled.yml');
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
