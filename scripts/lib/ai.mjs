/**
 * Geração de rascunho via API (xAI / OpenAI) ou template local.
 * Prefere: XAI_API_KEY → OPENAI_API_KEY → template.
 */

function stripCodeFence(text) {
  let t = String(text || '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return t.trim();
}

function buildPrompt(item) {
  return `Você é o redator do blog AniVerse (Brasil), especializado em anime e mangá.
Escreva um artigo completo em PORTUGUÊS do Brasil, tom editorial, envolvente, com análise (não só resumo).

Tema: ${item.topic}
Série (se houver): ${item.series || 'n/a'}
Categoria: ${item.category || 'mangas'}
Notas do editor: ${item.notes || 'nenhuma'}
Tags sugeridas: ${(item.tags || []).join(', ')}

Regras:
- Título impactante, sem clickbait vazio
- Excerpt de 1–2 frases (~180 caracteres)
- Conteúdo em HTML semântico: use <p>, <h2>, <h3>, <ul>, <li>, <blockquote>, <strong>, <em>
- NÃO use markdown
- NÃO inclua <html>, <body> ou scripts
- 4 a 7 seções com <h2>
- Inclua 2 placeholders de imagem exatamente assim (serão trocados depois):
  {{IMG_1}} e {{IMG_2}} em linhas próprias dentro de <figure class="post-figure"> se preferir, ou só o token
- Sem spoilers desnecessários de finais de obra; se spoiler de capítulo específico, avise
- Estilo próximo a análise narrativa (como One Piece cap. 1 e 2 do AniVerse)

Responda APENAS com JSON válido:
{
  "title": "...",
  "excerpt": "...",
  "contentHtml": "...",
  "tags": ["..."],
  "imagePrompts": {
    "cover": "English prompt for anime-style cover art, 16:9, no text, no logos",
    "img1": "English prompt for illustration 1, 16:9, no text",
    "img2": "English prompt for illustration 2, 16:9, no text"
  }
}`;
}

function fallbackDraft(item) {
  const title = item.topic;
  const excerpt = `Análise AniVerse: ${item.topic}. Um olhar sobre narrativa, personagens e o que isso muda na história.`;
  const contentHtml = `
<p><em>Rascunho automático (template local — configure XAI_API_KEY ou OPENAI_API_KEY para rascunhos por IA).</em></p>
<p>Este artigo aborda: <strong>${escapeHtml(item.topic)}</strong>.</p>
${item.notes ? `<p><strong>Notas do editor:</strong> ${escapeHtml(item.notes)}</p>` : ''}

{{IMG_1}}

<h2>Contexto</h2>
<p>Complete aqui o contexto da obra, arco ou capítulo. Explique por que o tema importa para o leitor brasileiro de anime/mangá.</p>

<h2>O que acontece (sem enrolação)</h2>
<p>Resuma os eventos principais e o foco emocional da cena ou arco.</p>

{{IMG_2}}

<h2>Personagens e motivações</h2>
<p>Analise as motivações, contrastes e o que o autor está plantando para o futuro.</p>

<h2>Temas centrais</h2>
<ul>
  <li><strong>Tema 1:</strong> desenvolva.</li>
  <li><strong>Tema 2:</strong> desenvolva.</li>
  <li><strong>Tema 3:</strong> desenvolva.</li>
</ul>

<h2>Por que isso importa no AniVerse</h2>
<p>Conecte com a identidade do blog: análise com coração, sem hype vazio.</p>

<h2>Conclusão</h2>
<p>Feche com uma imagem forte e convide o leitor ao próximo post da série (se houver).</p>
`.trim();

  return {
    title,
    excerpt,
    contentHtml,
    tags: item.tags || [],
    imagePrompts: {
      cover: `Cinematic anime blog cover art about ${item.topic}, dramatic lighting, 16:9, painterly shonen style, no text, no logos`,
      img1: `Anime illustration scene related to ${item.topic}, atmospheric, 16:9, no text, no logos`,
      img2: `Emotional anime key visual for ${item.series || item.topic}, soft light, 16:9, no text, no logos`
    },
    engine: 'template'
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function callChat({ baseUrl, apiKey, model, prompt }) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'Você escreve artigos em português do Brasil para o blog AniVerse. Responda só com JSON válido.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI API ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('AI respondeu vazio');
  return JSON.parse(stripCodeFence(text));
}

export async function draftFromTopic(item) {
  const prompt = buildPrompt(item);
  const xai = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  try {
    if (xai) {
      const parsed = await callChat({
        baseUrl: 'https://api.x.ai/v1',
        apiKey: xai,
        model: process.env.XAI_MODEL || 'grok-2-latest',
        prompt
      });
      return { ...parsed, engine: 'xai' };
    }
    if (openai) {
      const parsed = await callChat({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: openai,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        prompt
      });
      return { ...parsed, engine: 'openai' };
    }
  } catch (err) {
    console.warn('⚠️  IA falhou, usando template local:', err.message);
  }

  return fallbackDraft(item);
}
