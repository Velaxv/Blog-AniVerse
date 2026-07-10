#!/usr/bin/env node
/**
 * Publica drafts com publishAt <= agora em data/posts.json
 * e arquiva em data/drafts/published/
 *
 * Uso:
 *   npm run publish
 *   npm run publish -- --force-slug meu-post   (publica mesmo antes da hora)
 *   npm run publish -- --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './lib/paths.mjs';
import { ensureDirs, listDrafts, loadPosts, savePosts, writeJson } from './lib/draft-io.mjs';
import { isDue } from './lib/slots.mjs';

function args() {
  const a = process.argv.slice(2);
  const out = { dryRun: false, forceSlug: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--dry-run') out.dryRun = true;
    else if (a[i] === '--force-slug') out.forceSlug = a[++i];
  }
  return out;
}

function toPublicPost(draft) {
  return {
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    excerpt: draft.excerpt,
    content: draft.content,
    cover: draft.cover,
    category: draft.category,
    tags: draft.tags || [],
    date: draft.date,
    author: draft.author || 'AniVerse',
    featured: !!draft.featured,
    popular: draft.popular !== false,
    type: draft.type || 'manga'
  };
}

async function main() {
  await ensureDirs();
  const opts = args();
  const now = new Date();
  const scheduled = await listDrafts(PATHS.draftsScheduled);

  let due = scheduled.filter((d) => isDue(d.data.publishAt, now));
  if (opts.forceSlug) {
    due = scheduled.filter(
      (d) => d.data.slug === opts.forceSlug || d.file === `${opts.forceSlug}.json`
    );
  }

  if (!due.length) {
    console.log('Nenhum post due para publicar em', now.toISOString());
    if (scheduled.length) {
      console.log('Agendados pendentes:');
      scheduled.forEach((d) => {
        console.log(`  - ${d.data.slug} @ ${d.data.publishAt}`);
      });
    }
    return;
  }

  // ordem cronológica de publicação
  due.sort((a, b) => String(a.data.publishAt).localeCompare(String(b.data.publishAt)));

  const postsData = await loadPosts();
  const existingIds = new Set((postsData.posts || []).map((p) => p.id));
  const existingSlugs = new Set((postsData.posts || []).map((p) => p.slug));

  let published = 0;

  for (const item of due) {
    const draft = item.data;
    if (existingIds.has(draft.id) || existingSlugs.has(draft.slug)) {
      console.warn(`⚠️  Já existe no ar, arquivando draft: ${draft.slug}`);
    } else {
      // desmarca featured antigos se este for featured
      const pub = toPublicPost(draft);
      if (pub.featured) {
        postsData.posts.forEach((p) => {
          p.featured = false;
        });
      } else if (!postsData.posts.some((p) => p.featured)) {
        // se ninguém é featured, o mais novo publicado vira featured
        pub.featured = true;
        postsData.posts.forEach((p) => {
          p.featured = false;
        });
      }

      postsData.posts.unshift(pub);
      existingIds.add(pub.id);
      existingSlugs.add(pub.slug);
      console.log(`🚀 Publicar: ${pub.slug} (${draft.publishAt})`);
      published++;
    }

    if (!opts.dryRun) {
      const archived = {
        ...draft,
        status: 'published',
        publishedAt: now.toISOString()
      };
      const dest = path.join(PATHS.draftsPublished, path.basename(item.path));
      await writeJson(dest, archived);
      await fs.unlink(item.path);
    }
  }

  // ordena posts por data desc
  postsData.posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (opts.dryRun) {
    console.log(`[dry-run] ${published} post(s) seriam publicados. posts.json NÃO alterado.`);
    return;
  }

  if (published > 0) {
    await savePosts(postsData);
    console.log(`✅ ${published} post(s) em data/posts.json`);
  } else {
    console.log('Nada novo em posts.json (apenas arquivos arquivados).');
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
