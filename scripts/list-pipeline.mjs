#!/usr/bin/env node
import { PATHS } from './lib/paths.mjs';
import { ensureDirs, listDrafts, loadQueue, loadPosts } from './lib/draft-io.mjs';
import { nextFreeSlot } from './lib/slots.mjs';

async function main() {
  await ensureDirs();
  const queue = await loadQueue();
  const review = await listDrafts(PATHS.draftsReview);
  const scheduled = await listDrafts(PATHS.draftsScheduled);
  const published = await listDrafts(PATHS.draftsPublished);
  const posts = await loadPosts();

  console.log('══════════════════════════════════════');
  console.log(' AniVerse — pipeline de posts');
  console.log('══════════════════════════════════════');
  console.log('\n📋 Fila (queue.json):', (queue.items || []).length);
  (queue.items || []).forEach((it, i) => {
    console.log(`  ${i + 1}. [${it.priority ?? '-'}] ${it.id} — ${it.topic}`);
  });

  console.log('\n✏️  Review (aguardar sua revisão):', review.length);
  review.forEach((d) => {
    console.log(`  - ${d.data.slug}`);
    console.log(`    ${d.data.title}`);
  });

  console.log('\n📅 Scheduled (publicação automática):', scheduled.length);
  scheduled.forEach((d) => {
    console.log(`  - ${d.data.slug} @ ${d.data.publishAt}`);
  });

  const occupied = scheduled.map((d) => d.data.publishAt).filter(Boolean);
  try {
    const next = nextFreeSlot(new Date(), occupied);
    console.log('\n⏰ Próximo slot livre:', next.label);
  } catch {
    /* ignore */
  }

  console.log('\n📦 Arquivados (published drafts):', published.length);
  console.log('🌐 No ar (posts.json):', (posts.posts || []).length);
  (posts.posts || []).slice(0, 5).forEach((p) => {
    console.log(`  - ${p.date} ${p.slug}${p.featured ? ' ⭐' : ''}`);
  });
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
