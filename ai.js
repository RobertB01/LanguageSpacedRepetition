// Thin LLM wrapper. Supports any OpenAI-compatible chat-completions API:
// OpenAI, Groq, Mistral, OpenRouter, Together, etc. If openai-config.js is
// missing or invalid, AI.isEnabled() returns false and the app falls back to
// non-AI behaviour.

const AI = (() => {
  const PROVIDERS = {
    openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini' },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
    mistral: { baseUrl: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'meta-llama/llama-3.3-70b-instruct' },
  };

  let cfg = null;
  let enabled = false;

  function init() {
    try {
      const c = window.OPENAI_CONFIG;
      if (!c || !c.apiKey) return false;
      if (c.apiKey.includes('YOUR-KEY') || c.apiKey.includes('YOUR-KEY-HERE')) return false;

      const provider = c.provider || 'openai';
      const preset = PROVIDERS[provider] || {};
      cfg = {
        provider,
        baseUrl: c.baseUrl || preset.baseUrl || 'https://api.openai.com/v1',
        model: c.model || preset.defaultModel || 'gpt-4o-mini',
        apiKey: c.apiKey,
      };
      enabled = true;
      console.log(`AI enabled (provider: ${cfg.provider}, model: ${cfg.model}).`);
      return true;
    } catch (e) {
      console.warn('AI init failed:', e);
      return false;
    }
  }

  function isEnabled() { return enabled; }

  // messages: [{ role: 'system'|'user'|'assistant', content: string }, ...]
  // opts: { temperature, maxTokens, model }
  async function chat(messages, opts = {}) {
    if (!enabled) throw new Error('AI not configured');
    const body = {
      model: opts.model || cfg.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 600,
    };
    const url = `${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`${cfg.provider} ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // CEFR baseline descriptions — what the learner can already do at each
  // self-reported level, so the AI doesn't drop them back to "hola/adiós"
  // when their SRS data is still sparse.
  const LEVEL_DESCRIPTIONS = {
    beginner: 'Absolute beginner. No prior Spanish. Use very simple words and lots of English glosses.',
    a1: 'Approximately A1. Already knows ~500 high-frequency words: greetings, numbers, days, family, ser/estar/tener/ir/hacer in present tense, basic questions (qué, dónde, cómo). Can form simple sentences. Do NOT explain words like hola, gracias, sí, no, casa, ser, estar, tener, ir.',
    a2: 'Approximately A2. Knows ~1000 words across daily-life topics, can use present + simple past + near future (ir a + inf), basic adjectives, and common phrases. Comfortable with most everyday vocabulary. Skip beginner-level explanations.',
    b1: 'Approximately B1. Comfortable with present, all past tenses (pretérito + imperfecto), future, conditional, and present subjunctive in common contexts. ~2000 words including abstract concepts. Can hold conversations on familiar topics, read short articles. Treat as conversational partner.',
    b2: 'Approximately B2. Solid grammar including most subjunctive uses, perfect tenses, passive voice. ~4000 words. Comfortable with idioms, opinion pieces, and nuanced discussions. Speak naturally without hand-holding.',
  };

  // Convenience: build a system prompt that tells the model the user's level.
  function buildLearnerContext(opts = {}) {
    const limit = opts.limit ?? 40;
    if (typeof SRS === 'undefined' || typeof VOCABULARY === 'undefined') return '';

    const settings = SRS.getSettings();
    const level = (settings.baselineLevel || 'a1').toLowerCase();
    const levelDesc = LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS.a1;

    const known = SRS.getKnownWords(VOCABULARY).map(w => w.es).slice(0, limit);
    const struggling = SRS.getStrugglingWords(VOCABULARY)
      .map(s => s.word.es).slice(0, 10);
    const stats = SRS.getComputedStats(VOCABULARY);

    // Anything the learner has been exposed to at least once, even if not
    // yet mastered. This is what the user actually means when they ask
    // "which words have I had?" — the AI should know about these even
    // though they haven't graduated to "known" status yet.
    const allProgress = SRS.getAllProgress();
    const seenIds = new Set();
    for (const key of Object.keys(allProgress)) {
      const m = key.match(/^(\d+)_/);
      if (m) seenIds.add(Number(m[1]));
    }
    const seenWords = VOCABULARY
      .filter(w => seenIds.has(w.id))
      .map(w => w.es);
    const totalSeen = seenWords.length;

    const parts = [];
    parts.push(`SELF-REPORTED LEVEL: ${level.toUpperCase()}. ${levelDesc}`);
    parts.push(`SRS DATA: exposed to ${totalSeen} distinct words across ${stats.totalReviews ?? 0} reviews. Estimated active vocabulary from SRS alone: ${stats.estimatedVocab} words. (The real total is higher — trust the self-reported level above when SRS is sparse.)`);
    if (seenWords.length) {
      const sample = seenWords.slice(-limit);
      parts.push(`Words they have practised in this app (assume familiarity): ${sample.join(', ')}.`);
    }
    if (known.length) parts.push(`Words mastered in SRS — interval >= 7 days: ${known.join(', ')}.`);
    if (struggling.length) parts.push(`Words they struggle with (gently reinforce, don't avoid): ${struggling.join(', ')}.`);
    parts.push(`Daily streak: ${stats.dailyStreak}. Mastered: ${stats.totalMastered}.`);
    parts.push(`IMPORTANT: Calibrate to the SELF-REPORTED LEVEL above, not just SRS counts. Never tell the learner they "just started", have "0 words", or suggest absolute beginner words (hola, adiós, gracias) unless their level is "beginner". If asked which words they've had, refer to the practised list above.`);
    parts.push(`Speak Spanish at their level. When introducing words above their level, briefly gloss them in English in parentheses. Keep replies short and conversational unless asked to explain.`);
    return parts.join('\n');
  }

  return { init, isEnabled, chat, buildLearnerContext };
})();
