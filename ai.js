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

  // Convenience: build a system prompt that tells the model the user's level.
  function buildLearnerContext(opts = {}) {
    const limit = opts.limit ?? 40;
    if (typeof SRS === 'undefined' || typeof VOCABULARY === 'undefined') return '';

    const known = SRS.getKnownWords(VOCABULARY).map(w => w.es).slice(0, limit);
    const struggling = SRS.getStrugglingWords(VOCABULARY)
      .map(s => s.word.es).slice(0, 10);
    const stats = SRS.getComputedStats(VOCABULARY);

    const parts = [];
    parts.push(`The learner is studying Spanish. Estimated active vocabulary: ${stats.estimatedVocab} words.`);
    if (known.length) parts.push(`Words they know well (use these freely): ${known.join(', ')}.`);
    if (struggling.length) parts.push(`Words they struggle with (gently reinforce, don't avoid): ${struggling.join(', ')}.`);
    parts.push(`Daily streak: ${stats.dailyStreak}. Mastered: ${stats.totalMastered}.`);
    parts.push(`Speak Spanish at their level. When introducing new words, briefly gloss them in English in parentheses. Keep replies short and conversational unless asked to explain.`);
    return parts.join('\n');
  }

  return { init, isEnabled, chat, buildLearnerContext };
})();
