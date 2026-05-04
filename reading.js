// Reading page — generates short Spanish texts at the user's level
// (~90% known words + ~10% new) and lets them ask AI to explain words/phrases.
// Falls back gracefully if AI isn't configured.

const Reading = (() => {
  const STORAGE_KEY = 'srs_reading_texts';
  const MAX_HISTORY = 20;

  function _getSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function _save(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_HISTORY))); }
    catch (e) {}
  }

  function _esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    const aiOn = typeof AI !== 'undefined' && AI.isEnabled();
    const saved = _getSaved();
    const lastText = saved[saved.length - 1];

    return `
      <div class="reading-page fade-in">
        <div class="reading-header">
          <h2>📖 Reading</h2>
          <p class="reading-sub">
            Short texts using mostly words you know, with a few new ones mixed in.
            ${aiOn ? '' : '<br><em>⚠️ Add an OpenAI key in <code>openai-config.js</code> to generate new texts.</em>'}
          </p>
        </div>

        <div class="reading-controls">
          <label>Length:
            <select id="reading-length">
              <option value="short">Short (3–4 sentences)</option>
              <option value="medium" selected>Medium (1 paragraph)</option>
              <option value="long">Long (2 paragraphs)</option>
            </select>
          </label>
          <label>Topic:
            <input type="text" id="reading-topic" placeholder="(optional, e.g. cooking, travel, family)" />
          </label>
          <button class="btn btn-primary" id="reading-generate" ${aiOn ? '' : 'disabled'}>
            ✨ Generate text
          </button>
        </div>

        <div id="reading-output" class="reading-output">
          ${lastText ? _renderText(lastText) : '<div class="empty-state">No text yet — click <strong>Generate</strong> above to create one.</div>'}
        </div>

        <div id="reading-explain" class="reading-explain hidden">
          <div class="reading-explain-header">
            <strong id="reading-explain-title">Explanation</strong>
            <button class="btn btn-ghost" id="reading-explain-close">✕</button>
          </div>
          <div id="reading-explain-body">…</div>
        </div>
      </div>
    `;
  }

  function _renderText(t) {
    if (!t) return '';
    const newWords = (t.newWords || []).map(w => w.toLowerCase());
    // Tokenize & wrap each word in a clickable span. Mark "new" words.
    const html = t.text.replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/g, (m) => {
      const isNew = newWords.includes(m.toLowerCase());
      return `<span class="rd-word${isNew ? ' rd-new' : ''}" data-word="${_esc(m)}">${_esc(m)}</span>`;
    });
    return `
      <div class="reading-text-card">
        <div class="reading-text">${html}</div>
        ${t.translation ? `<details class="reading-translation"><summary>Show English translation</summary><div>${_esc(t.translation)}</div></details>` : ''}
        ${t.newWords && t.newWords.length ? `
          <div class="reading-new-words">
            <strong>New words:</strong> ${t.newWords.map(w => `<code>${_esc(w)}</code>`).join(', ')}
          </div>` : ''}
        <div class="reading-meta">
          <small>Click any word for an AI explanation. Generated ${new Date(t.ts).toLocaleString()}.</small>
        </div>
      </div>
    `;
  }

  async function generate() {
    if (typeof AI === 'undefined' || !AI.isEnabled()) {
      alert('Add an OpenAI key in openai-config.js to generate texts.');
      return;
    }

    const length = document.getElementById('reading-length')?.value || 'medium';
    const topic = (document.getElementById('reading-topic')?.value || '').trim();
    const out = document.getElementById('reading-output');
    out.innerHTML = '<div class="empty-state">Generating… ⏳</div>';

    const lengthHints = {
      short: '3 to 4 short sentences',
      medium: '1 paragraph of about 5 to 7 sentences',
      long: '2 paragraphs',
    };

    const frontier = SRS.getFrontierWords(VOCABULARY, { known: 60, unknown: 6 });
    const knownStr = frontier.known.map(w => w.es).join(', ');
    const newStr = frontier.unknown.map(w => w.es).join(', ');

    const system = `You generate short Spanish reading practice texts for a learner. ` +
      `Use mostly words from the learner's KNOWN list, and weave in 2–4 words from the NEW list. ` +
      `Keep grammar at A2/B1 level. Reply ONLY with valid JSON matching this schema: ` +
      `{"text": string (Spanish text), "translation": string (English translation), "newWords": string[] (the new vocabulary words actually used)}.`;

    const user = `KNOWN words: ${knownStr}\n\nNEW words to introduce: ${newStr}\n\n` +
      `Length: ${lengthHints[length]}.` +
      (topic ? `\nTopic: ${topic}.` : '');

    try {
      const raw = await AI.chat([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], { temperature: 0.8, maxTokens: 700 });

      // Try to parse JSON from the response (strip code fences if any).
      const jsonStr = raw.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
      let parsed;
      try { parsed = JSON.parse(jsonStr); }
      catch (e) {
        // Fallback: treat whole response as plain text.
        parsed = { text: raw, translation: '', newWords: frontier.unknown.map(w => w.es) };
      }

      const entry = {
        ts: Date.now(),
        text: parsed.text || '',
        translation: parsed.translation || '',
        newWords: Array.isArray(parsed.newWords) ? parsed.newWords : [],
        topic,
        length,
      };

      const saved = _getSaved();
      saved.push(entry);
      _save(saved);

      out.innerHTML = _renderText(entry);
      _bindWordClicks();
    } catch (e) {
      console.error(e);
      out.innerHTML = `<div class="empty-state">Generation failed: ${_esc(e.message || e)}</div>`;
    }
  }

  async function explainWord(word) {
    const panel = document.getElementById('reading-explain');
    const title = document.getElementById('reading-explain-title');
    const body = document.getElementById('reading-explain-body');
    if (!panel || !body) return;

    panel.classList.remove('hidden');
    title.textContent = word;
    body.innerHTML = 'Thinking…';

    if (typeof AI === 'undefined' || !AI.isEnabled()) {
      body.innerHTML = 'AI is not configured — add an OpenAI key in <code>openai-config.js</code>.';
      return;
    }

    // Get current text for context
    const saved = _getSaved();
    const last = saved[saved.length - 1];
    const sentenceContext = last ? last.text : '';

    const system = `You are a concise Spanish tutor. The learner clicked a word in a text. ` +
      `Briefly explain (in English): meaning, part of speech, and—if it's a verb—infinitive + tense + person. ` +
      `Keep it to 3–5 short bullet points. Use <strong> and <em> sparingly.`;
    const user = `Word: "${word}"\nContext: "${sentenceContext}"`;

    try {
      const reply = await AI.chat([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ], { temperature: 0.3, maxTokens: 250 });
      // Allow simple inline formatting only.
      body.innerHTML = reply
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
    } catch (e) {
      body.innerHTML = `Failed: ${_esc(e.message || e)}`;
    }
  }

  function _bindWordClicks() {
    document.querySelectorAll('.rd-word').forEach(el => {
      el.addEventListener('click', () => explainWord(el.dataset.word));
    });
  }

  function bind() {
    const genBtn = document.getElementById('reading-generate');
    if (genBtn) genBtn.addEventListener('click', generate);

    const closeBtn = document.getElementById('reading-explain-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      document.getElementById('reading-explain')?.classList.add('hidden');
    });

    _bindWordClicks();
  }

  return { render, bind };
})();
