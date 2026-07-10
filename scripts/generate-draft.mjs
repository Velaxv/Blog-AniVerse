#!/usr/bin/env node
/**
 * Gera rascunho com IA (ou template) + imagens → data/drafts/review/
 *
 * Uso:
 *   npm run generate
 *   npm run generate -- --topic "Meu tema" --category mangas
 *   npm run generate -- --queue-id one-piece-cap3-zoro
 *   npm run generate -- --keep-queue   (não remove item da fila)
 */

import path from 'node:path';
import { PATHS } from './lib/paths.mjs';
import {
  ensureDirs,
  listDrafts,
  loadQueue,
  saveQueue,
  slugify,
  writeJson
} from './lib/draft-io.mjs';
import { draftFromTopic } from './lib/ai.mjs';
import { generatePostImages, injectImages } from './lib/images.mjs';

function args() {
  const a = process.argv.slice(2);
  const out = { keepQueue: false, topic: null, queueId: null, category: 'mangas', type: 'manga' };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--keep-queue') out.keepQueue = true;
    else if (a[i] === '--topic') out.topic = a[++i];
    else if (a[i] === '--queue-id') out.queueId = a[++i];
    else if (a[i] === '--category') out.category = a[++i];
    else if (a[i] === '--type') out.type = a[++i];
  }
  return out;
}

function pickQueueItem(queue, opts) {
  if (opts.topic) {
    return {
      item: {
        id: slugify(opts.topic),
        topic: opts.topic,
        category: opts.category,
        type: opts.type,
        tags: [],
        notes: ''
      },
      index: -1
    };
  }
  const items = queue.items || [];
  if (!items.length) return { item: null, index: -1 };
  if (opts.queueId) {
    const index = items.findIndex((x) => x.id === opts.queueId);
    if (index < 0) throw new Error(`Item de fila não encontrado: ${opts.queueId}`);
    return { item: items[index], index };
  }
  // maior prioridade (menor número) primeiro
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.priority || 99) - (b.item.priority || 99));
  return sorted[0];
}

async function main() {
  await ensureDirs();
  const opts = args();
  const queue = await loadQueue();
  const { item, index } = pickQueueItem(queue, opts);

  if (!item) {
    console.error('Fila vazia. Adicione itens em data/queue.json ou use --topic "..."');
    process.exit(1);
  }

  console.log('📝 Gerando rascunho para:', item.topic);

  const ai = await draftFromTopic(item);
  console.log('   engine:', ai.engine || 'unknown');

  const baseSlug = slugify(ai.title || item.topic || item.id);
  const id = baseSlug;
  const slug = baseSlug;

  // evita colisão com drafts existentes
  const existing = [
    ...(await listDrafts(PATHS.draftsReview)),
    ...(await listDrafts(PATHS.draftsScheduled)),
    ...(await listDrafts(PATHS.draftsPublished))
  ];
  let finalSlug = slug;
  let n = 2;
  while (existing.some((d) => d.data.slug === finalSlug || d.file === `${finalSlug}.json`)) {
    finalSlug = `${slug}-${n++}`;
  }

  console.log('🖼  Gerando imagens...');
  const imagePaths = await generatePostImages(finalSlug, ai.imagePrompts || {});
  const content = injectImages(ai.contentHtml || ai.content || '', imagePaths);

  const draft = {
    id: finalSlug,
    slug: finalSlug,
    title: ai.title || item.topic,
    excerpt: ai.excerpt || '',
    content,
    cover: imagePaths.cover || `images/posts/${finalSlug}/cover.jpg`,
    category: item.category || opts.category || 'mangas',
    tags: Array.isArray(ai.tags) && ai.tags.length ? ai.tags : item.tags || [],
    date: new Date().toISOString().slice(0, 10),
    author: 'AniVerse',
    featured: false,
    popular: true,
    type: item.type || opts.type || 'manga',
    status: 'review',
    generatedAt: new Date().toISOString(),
    engine: ai.engine || 'unknown',
    source: {
      queueId: item.id || null,
      topic: item.topic,
      series: item.series || null,
      notes: item.notes || null
    },
    imagePrompts: ai.imagePrompts || null,
    publishAt: null
  };

  const outPath = path.join(PATHS.draftsReview, `${finalSlug}.json`);
  await writeJson(outPath, draft);
  console.log('✅ Rascunho em review:', outPath);
  console.log('   Revise o JSON (e imagens em images/posts/' + finalSlug + '/)');
  console.log('   Depois: npm run approve -- --slug ' + finalSlug);

  if (!opts.keepQueue && index >= 0) {
    queue.items.splice(index, 1);
    await saveQueue(queue);
    console.log('🗑  Item removido da fila (use --keep-queue para manter)');
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
