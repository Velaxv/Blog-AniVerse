/**
 * Gera e baixa imagens para o post.
 * Usa Pollinations (sem key) por padrão; opcional OPENAI_API_KEY (DALL·E).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './paths.mjs';

async function download(url, dest) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AniVerseBlogBot/1.0' }
  });
  if (!res.ok) throw new Error(`Download falhou ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buf);
  return dest;
}

function pollinationsUrl(prompt, { width = 1200, height = 630, seed } = {}) {
  const q = encodeURIComponent(prompt);
  const seedPart = seed != null ? `&seed=${seed}` : '';
  return `https://image.pollinations.ai/prompt/${q}?width=${width}&height=${height}&nologo=true&enhance=true${seedPart}`;
}

async function openaiImage(prompt, dest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY ausente');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024'
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI image ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const url = data.data?.[0]?.url;
  if (!url) throw new Error('OpenAI image sem URL');
  return download(url, dest);
}

export async function generatePostImages(slug, prompts = {}) {
  const dir = path.join(PATHS.imagesPosts, slug);
  await fs.mkdir(dir, { recursive: true });

  const jobs = [
    { key: 'cover', file: 'cover.jpg', prompt: prompts.cover },
    { key: 'img1', file: 'img-1.jpg', prompt: prompts.img1 },
    { key: 'img2', file: 'img-2.jpg', prompt: prompts.img2 }
  ];

  const preferOpenAI = process.env.IMAGE_ENGINE === 'openai' && process.env.OPENAI_API_KEY;
  const result = {};

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const prompt =
      job.prompt ||
      `Anime style illustration for blog post ${slug}, cinematic lighting, 16:9, no text, no logos`;
    const dest = path.join(dir, job.file);
    process.stdout.write(`  🖼  ${job.file}... `);
    try {
      if (preferOpenAI) {
        await openaiImage(prompt, dest);
      } else {
        const url = pollinationsUrl(prompt, { seed: Date.now() % 100000 + i * 17 });
        await download(url, dest);
      }
      console.log('ok');
    } catch (err) {
      console.log('falhou:', err.message);
      // tenta pollinations como fallback
      if (preferOpenAI) {
        try {
          const url = pollinationsUrl(prompt, { seed: 42 + i });
          await download(url, dest);
          console.log('  ↳ fallback pollinations ok');
        } catch (e2) {
          console.warn('  ↳ fallback também falhou:', e2.message);
        }
      }
    }
    result[job.key] = `images/posts/${slug}/${job.file}`;
  }

  return result;
}

export function injectImages(contentHtml, imagePaths) {
  let html = String(contentHtml || '');

  const figure = (src, caption) => `
<figure class="post-figure">
  <img src="${src}" alt="${caption}" loading="lazy" width="1200" height="675">
  <figcaption>${caption}</figcaption>
</figure>`.trim();

  if (html.includes('{{IMG_1}}')) {
    html = html.replace(
      /\{\{IMG_1\}\}/g,
      figure(imagePaths.img1 || imagePaths.cover, 'Ilustração do artigo')
    );
  } else if (imagePaths.img1) {
    // insere após primeiro parágrafo
    html = html.replace(
      /<\/p>/i,
      `</p>\n${figure(imagePaths.img1, 'Ilustração do artigo')}`
    );
  }

  if (html.includes('{{IMG_2}}')) {
    html = html.replace(
      /\{\{IMG_2\}\}/g,
      figure(imagePaths.img2 || imagePaths.cover, 'Cena em destaque')
    );
  } else if (imagePaths.img2) {
    html += `\n${figure(imagePaths.img2, 'Cena em destaque')}`;
  }

  return html;
}
