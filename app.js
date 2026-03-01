// Main Application Logic — Spanish Focus (EN/NL ↔ ES)
// Features: Bidirectional SRS, Conjugation Panel, Verbs Page, Progress Page, Undo, Chimes

const App = (() => {
  let queue = [];
  let currentIndex = 0;
  let currentCard = null;
  let isRevealed = false;
  let cardStartTime = 0;
  let currentMode = 'recognition';
  let currentView = 'study';
  let settings = {};

  // Current card's language direction
  let sourceLang = 'en';
  let targetLang = 'es';
  let lastAnswerCorrect = false;

  // Track words missed this session
  let missedWords = new Map();

  // Undo state (single level)
  let undoState = null; // { card, index, progressSnapshot, direction }

  // Audio context for chimes
  let audioCtx = null;

  // --- Audio Chimes ---
  function getAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    return audioCtx;
  }

  function playChime(correct) {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (correct) {
      // Ascending two-note chime
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523, now); // C5
      osc1.connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const gain2 = ctx.createGain();
      gain2.connect(ctx.destination);
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659, now + 0.12); // E5
      osc2.connect(gain2);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.4);
    } else {
      // Low buzz
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  }

  // --- Helpers ---
  function normalizeAccents(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function checkAnswer(userInput, correctWord) {
    const normalizedInput = normalizeAccents(userInput);
    const alternatives = correctWord.split(/[/,]/).map(s => normalizeAccents(s));
    return alternatives.some(alt =>
      normalizedInput === alt || normalizedInput === alt.replace(/^to /, '')
    );
  }

  function highlightWord(sentence, word) {
    const words = word.split('/').map(w => w.trim());
    let result = sentence;
    for (const w of words) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi');
      result = result.replace(regex, '<span class="highlight">$1</span>');
    }
    return result;
  }

  function langFlag(lang) {
    return LANGUAGES[lang] ? LANGUAGES[lang].flag : '';
  }

  function langName(lang) {
    return LANGUAGES[lang] ? LANGUAGES[lang].name : lang;
  }

  // --- Language Direction (uses card's pre-assigned direction) ---
  function pickDirection() {
    if (!currentCard || !currentCard.direction) {
      // Fallback: random direction
      const knownLangs = ['en', 'nl'];
      const other = knownLangs[Math.floor(Math.random() * knownLangs.length)];
      if (Math.random() < 0.5) {
        sourceLang = other;
        targetLang = 'es';
      } else {
        sourceLang = 'es';
        targetLang = other;
      }
      return;
    }

    const knownLangs = ['en', 'nl'];
    const other = knownLangs[Math.floor(Math.random() * knownLangs.length)];

    if (currentCard.direction === 'toEs') {
      // User sees known language, must type Spanish
      sourceLang = other;
      targetLang = 'es';
    } else {
      // User sees Spanish, must type known language
      sourceLang = 'es';
      targetLang = other;
    }
  }

  // --- Study Mode ---
  function getStudyMode() {
    return 'production';
  }

  // --- Missed Words Sidebar ---
  function buildMissedListHTML() {
    if (missedWords.size === 0) return '';
    let html = '';
    for (const [id, entry] of missedWords) {
      html += `<div class="missed-item">
        <span class="missed-es">${entry.es}</span>
        <span class="missed-trans">${entry.en} / ${entry.nl}</span>
      </div>`;
    }
    return html;
  }

  function updateMissedPanel() {
    const list = document.getElementById('missed-list');
    if (list) list.innerHTML = buildMissedListHTML();
  }

  // --- Knowledge Sandbox Panel (word-level, max of both directions) ---
  function getKnowledgeLevels() {
    const allProgress = SRS.getAllProgress();
    const total = VOCABULARY.length;
    let mastered = 0, good = 0, okay = 0, seen = 0, unseen = 0;

    function dirLevel(p) {
      if (!p || p.totalReviews === 0) return 0;
      if (p.interval >= 21 && p.easeFactor > 2.0) return 4;
      if (p.interval >= 7) return 3;
      if (p.interval >= 1) return 2;
      return 1;
    }

    for (const word of VOCABULARY) {
      const pToEs = allProgress[`${word.id}_toEs`];
      const pFromEs = allProgress[`${word.id}_fromEs`];
      const level = Math.max(dirLevel(pToEs), dirLevel(pFromEs));

      if (level === 0) unseen++;
      else if (level === 1) seen++;
      else if (level === 2) okay++;
      else if (level === 3) good++;
      else mastered++;
    }
    return { mastered, good, okay, seen, unseen, total };
  }

  function buildSandboxHTML() {
    const k = getKnowledgeLevels();
    const known = k.mastered + k.good + k.okay + k.seen;

    function col(level, count, label) {
      const pct = k.total > 0 ? (count / k.total) * 100 : 0;
      return `
        <div class="sandbox-col level-${level}">
          <div class="sandbox-count">${count}</div>
          <div class="sandbox-track">
            <div class="sandbox-fill" style="height: ${pct}%"></div>
          </div>
          <div class="sandbox-label">${label}</div>
        </div>`;
    }

    return `
      <div class="sandbox-panel">
        <div class="sandbox-header">${known} / ${k.total}</div>
        <div class="sandbox-bars">
          ${col('mastered', k.mastered, 'Altijd goed')}
          ${col('good', k.good, 'Redelijk')}
          ${col('okay', k.okay, 'Beetje')}
          ${col('seen', k.seen, '1x goed')}
        </div>
        <div class="sandbox-total">${k.unseen} onbekend</div>
      </div>`;
  }

  // --- Initialize ---
  async function init() {
    await SRS.loadFromServer();
    settings = SRS.getSettings();
    await TTS.init();
    queue = SRS.buildQueue(VOCABULARY, settings);
    missedWords = new Map();
    SRS.initSession();

    if (queue.length === 0) {
      showProgress();
    } else {
      showStudy();
    }

    setupKeyboard();

    if (TTS.hasWarning()) {
      const missing = TTS.getWarnings().map(l => langName(l)).join(', ');
      showWarning(`No TTS voice found for: ${missing}. Try Chrome or Edge for best support.`);
    }
  }

  // --- Study Screen ---
  function showStudy() {
    currentView = 'study';
    updateNav();

    if (currentIndex >= queue.length) {
      showSummary();
      return;
    }

    currentCard = queue[currentIndex];
    isRevealed = false;
    cardStartTime = Date.now();

    currentMode = getStudyMode();
    pickDirection();

    const word = currentCard.word;
    const dir = currentCard.direction || 'fromEs';
    const progress = SRS.getWordProgress(word.id, dir);
    const progressPercent = queue.length > 0 ? Math.round((currentIndex / queue.length) * 100) : 0;

    const sourceWord = sourceLang === 'es' && word.g
      ? word.es + ' <span class="gender-tag">' + (word.g === 'f' ? 'la' : 'el') + '</span>'
      : word[sourceLang];
    const sourceFlag = langFlag(sourceLang);
    const targetFlag = langFlag(targetLang);
    const targetName = langName(targetLang);

    // Check if verb for conjugation button
    const isVerb = typeof CONJUGATIONS !== 'undefined' && CONJUGATIONS.isVerb(word.id);

    const container = document.getElementById('main-content');

    container.innerHTML = `
      <div class="study-layout">
        <div class="study-sidebar" id="missed-panel">
          <div class="sidebar-header">Missed words</div>
          <div class="missed-list" id="missed-list">
            ${buildMissedListHTML()}
          </div>
        </div>
        <div class="study-main">
          <div class="study-screen">
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${progressPercent}%"></div>
          <span class="progress-text">${currentIndex} / ${queue.length}</span>
        </div>

        <div class="card-container" id="card-container">
          <div class="card-meta">
            <span class="word-type">${word.type}${dir === 'toEs' ? ' → ES' : ' ← ES'}</span>
            <span class="direction-badge">${sourceFlag} → ${targetFlag}</span>
            <span class="review-count">${progress.totalReviews > 0 ? progress.totalReviews + ' reviews' : 'New'}</span>
          </div>

            <div class="card-front fade-in">
              <div class="word-display">
                <span class="source-word">${sourceWord}</span>
                ${sourceLang === 'es' ? `<button class="speak-btn" id="btn-speak-word" title="Listen">🔊</button>` : ''}
              </div>
              ${isVerb ? `<button class="btn-conjugation" id="btn-conjugation" title="Show conjugation">Conjugar</button>` : ''}
              <p class="mode-label">${sourceLang === 'es' ? `${langFlag('en')}${langFlag('nl')} English or Dutch` : `${targetFlag} ${targetName}`}:</p>
              <div class="input-container">
                <input type="text" id="production-input" class="production-input" autocomplete="off" autocapitalize="off" spellcheck="false" autofocus placeholder="Enter = don't know" />
                <button class="btn btn-primary btn-check" id="btn-check">
                  Check <span class="shortcut-hint">[Enter]</span>
                </button>
              </div>
            </div>

          <div class="card-back hidden" id="card-back"></div>
        </div>

        <div class="rating-buttons hidden" id="rating-buttons">
          <div class="rating-row">
            ${undoState ? `<button class="btn btn-undo" id="btn-undo" title="Undo last card (Ctrl+Z)">↩ Undo</button>` : ''}
            <button class="btn btn-next" id="btn-next">
              Volgende <span class="shortcut-hint">[Enter]</span>
            </button>
          </div>
        </div>
      </div>
        </div>
        ${buildSandboxHTML()}
      </div>
    `;

    // Bind events
    document.getElementById('btn-speak-word')?.addEventListener('click', () => {
      TTS.speakWord(word.es, 'es', settings.speechSpeed);
    });
    if (settings.autoPronounce && sourceLang === 'es') {
      setTimeout(() => TTS.speakWord(word.es, 'es', settings.speechSpeed), 300);
    }
    document.getElementById('btn-check')?.addEventListener('click', checkProductionAnswer);

    // Conjugation button
    document.getElementById('btn-conjugation')?.addEventListener('click', () => {
      showConjugationPanel(word.id);
    });

    // Undo button
    document.getElementById('btn-undo')?.addEventListener('click', performUndo);

    const input = document.getElementById('production-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (isRevealed) {
            rateCard(lastAnswerCorrect ? 2 : 0);
          } else {
            checkProductionAnswer();
          }
        }
      });
      setTimeout(() => input.focus(), 100);
    }

    document.getElementById('btn-next')?.addEventListener('click', () => {
      rateCard(lastAnswerCorrect ? 2 : 0);
    });
  }

  // --- Conjugation Panel (Modal Overlay) ---
  function showConjugationPanel(vocabId) {
    if (typeof CONJUGATIONS === 'undefined') return;
    const data = CONJUGATIONS.conjugate(vocabId);
    if (!data) return;

    const subjs = CONJUGATIONS.SUBJECTS;
    const refProns = CONJUGATIONS.REFL_PRONOUNS;

    let tableRows = '';
    for (let i = 0; i < 6; i++) {
      const form = data.isReflexive ? `${refProns[i]} ${data.forms[i]}` : data.forms[i];
      tableRows += `
        <tr>
          <td class="conj-subject">${subjs[i]}</td>
          <td class="conj-form">${form}</td>
        </tr>`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay fade-in';
    overlay.innerHTML = `
      <div class="conj-modal">
        <div class="conj-header">
          <h3>${data.infinitive}</h3>
          <span class="conj-pattern">${data.pattern}</span>
          <button class="conj-close" id="conj-close">✕</button>
        </div>
        <table class="conj-table">
          <thead>
            <tr><th>Persona</th><th>Presente</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        ${data.tip ? `<div class="conj-tip"><strong>💡 Tip:</strong> ${data.tip}</div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('conj-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    // Close on Escape
    const escHandler = (e) => {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  // --- Build the "answer" panel showing all 3 translations ---
  function buildAnswerHTML(word, opts = {}) {
    const { showResult, isCorrect, userAnswer } = opts;

    let html = '<div class="answer-reveal fade-in">';

    if (showResult !== undefined) {
      html += `
        <div class="production-result ${isCorrect ? 'correct' : 'incorrect'}">
          <span class="result-icon">${isCorrect ? '✓' : '✗'}</span>
          <span class="result-text">${isCorrect ? 'Correct!' : 'Incorrect'}</span>
        </div>`;
      if (!isCorrect && userAnswer) {
        html += `
        <div class="your-answer">
          <span class="label">Your answer:</span>
          <span class="user-answer">${userAnswer}</span>
        </div>`;
      }
    }

    const genderTag = word.g ? ` <span class="gender-tag">${word.g === 'f' ? 'la' : 'el'}</span>` : '';
    html += '<div class="translations-grid">';
    for (const lang of LANG_KEYS) {
      if (lang === 'es' && sourceLang === 'es') continue;
      const isSpeakable = lang === 'es' && TTS.isAvailable('es');
      const wordText = lang === 'es' ? word.es + genderTag : word[lang];
      html += `
        <div class="translation-row ${lang === targetLang ? 'target-lang' : ''}">
          <span class="lang-flag">${langFlag(lang)}</span>
          <span class="lang-word">${wordText}</span>
          ${isSpeakable ? `<button class="speak-btn speak-answer" data-lang="es" data-text="${word.es.replace(/"/g, '&quot;')}" title="Listen">🔊</button>` : ''}
        </div>`;
    }
    html += '</div>';

    // Example sentence
    if (word.ex && word.ex.es) {
      const isSpeakable = TTS.isAvailable('es');
      html += `<div class="example-section">
        <div class="example-row">
          <span class="lang-flag">${langFlag('es')}</span>
          <p class="example-text">${highlightWord(word.ex.es, word.es)}</p>
          ${isSpeakable ? `<button class="speak-btn speak-example" data-lang="es" data-text="${word.ex.es.replace(/"/g, '&quot;')}" title="Listen to sentence">🔊</button>` : ''}
        </div>
        ${word.ex.nl ? `<div class="example-translation">
          <span class="lang-flag">${langFlag('nl')}</span>
          <p class="example-text">${word.ex.nl}</p>
        </div>` : ''}
      </div>`;
    }

    // Show conjugation button in answer for verbs
    const isVerb = typeof CONJUGATIONS !== 'undefined' && CONJUGATIONS.isVerb(word.id);
    if (isVerb) {
      html += `<button class="btn-conjugation btn-conjugation-answer" id="btn-conj-answer">Conjugar</button>`;
    }

    html += '</div>';
    return html;
  }

  function bindSpeakButtons() {
    document.querySelectorAll('.speak-answer').forEach(btn => {
      btn.addEventListener('click', () => {
        TTS.speakWord(btn.dataset.text, btn.dataset.lang, settings.speechSpeed);
      });
    });
    document.querySelectorAll('.speak-example').forEach(btn => {
      btn.addEventListener('click', () => {
        TTS.speakSentence(btn.dataset.text, btn.dataset.lang, settings.speechSpeed);
      });
    });
    document.getElementById('btn-conj-answer')?.addEventListener('click', () => {
      showConjugationPanel(currentCard.word.id);
    });
  }

  // --- Reveal (Recognition Mode) ---
  function revealAnswer() {
    if (isRevealed) return;
    isRevealed = true;

    const word = currentCard.word;
    const back = document.getElementById('card-back');

    back.innerHTML = buildAnswerHTML(word);
    back.classList.remove('hidden');
    document.getElementById('rating-buttons').classList.remove('hidden');

    const revealBtn = document.getElementById('btn-reveal');
    if (revealBtn) revealBtn.classList.add('hidden');

    bindSpeakButtons();

    if (settings.autoPronounce) {
      setTimeout(() => TTS.speakWord(word.es, 'es', settings.speechSpeed), 300);
    }
  }

  // --- Check Production Answer ---
  function checkProductionAnswer() {
    if (isRevealed) return;
    TTS.stop();

    const input = document.getElementById('production-input');
    if (!input) return;

    const userAnswer = input.value.trim();
    if (!userAnswer) {
      handleDontKnow();
      return;
    }

    isRevealed = true;

    const word = currentCard.word;
    const isCorrect = sourceLang === 'es'
      ? (checkAnswer(userAnswer, word.en) || checkAnswer(userAnswer, word.nl))
      : checkAnswer(userAnswer, word[targetLang]);

    lastAnswerCorrect = isCorrect;
    playChime(isCorrect);

    const back = document.getElementById('card-back');
    back.innerHTML = buildAnswerHTML(word, { showResult: true, isCorrect, userAnswer });
    back.classList.remove('hidden');
    document.getElementById('rating-buttons').classList.remove('hidden');

    input.disabled = true;
    document.getElementById('btn-check')?.classList.add('hidden');

    bindSpeakButtons();

    if (settings.autoPronounce && word.ex && word.ex.es) {
      TTS.speakSentence(word.ex.es, 'es', settings.speechSpeed);
    }
  }

  // --- Don't Know ---
  function handleDontKnow() {
    if (isRevealed) return;
    TTS.stop();
    isRevealed = true;
    lastAnswerCorrect = false;
    playChime(false);

    const word = currentCard.word;
    const input = document.getElementById('production-input');
    if (input) input.disabled = true;

    const back = document.getElementById('card-back');
    back.innerHTML = buildAnswerHTML(word, { showResult: true, isCorrect: false, userAnswer: '(skipped)' });
    back.classList.remove('hidden');
    document.getElementById('rating-buttons').classList.remove('hidden');
    document.getElementById('btn-check')?.classList.add('hidden');

    bindSpeakButtons();

    if (settings.autoPronounce && word.ex && word.ex.es) {
      TTS.speakSentence(word.ex.es, 'es', settings.speechSpeed);
    }
  }

  // --- Rate Card ---
  function rateCard(quality) {
    const responseTime = Date.now() - cardStartTime;
    const word = currentCard.word;
    const dir = currentCard.direction || 'fromEs';
    const isProduction = currentMode === 'production';
    const wasCorrect = quality >= 2;

    // Save undo state BEFORE making changes
    const key = `${word.id}_${dir}`;
    const allProg = SRS.getAllProgress();
    undoState = {
      card: { ...currentCard },
      index: currentIndex,
      progressKey: key,
      progressSnapshot: allProg[key] ? { ...allProg[key] } : null,
      missedSnapshot: new Map(missedWords),
    };

    // Track missed/recovered words for sidebar
    if (!wasCorrect) {
      missedWords.set(word.id, { word, es: word.es, en: word.en, nl: word.nl });
    } else if (missedWords.has(word.id)) {
      missedWords.delete(word.id);
    }

    SRS.reviewWord(word.id, dir, quality, responseTime, isProduction);
    SRS.updateSession(wasCorrect, responseTime, currentCard.isNew);
    SRS.updateGlobalStats(wasCorrect, responseTime);

    if (quality === 0) {
      const reinsertPos = Math.min(currentIndex + 3 + Math.floor(Math.random() * 5), queue.length);
      queue.splice(reinsertPos, 0, { word: currentCard.word, direction: dir, isNew: false });
    }

    currentIndex++;
    TTS.stop();
    showStudy();
  }

  // --- Undo ---
  function performUndo() {
    if (!undoState) return;

    // Restore progress
    const allProg = SRS.getAllProgress();
    if (undoState.progressSnapshot) {
      allProg[undoState.progressKey] = undoState.progressSnapshot;
    } else {
      delete allProg[undoState.progressKey];
    }
    // Save directly to localStorage (bypass normal flow)
    try {
      localStorage.setItem('srs_word_progress', JSON.stringify(allProg));
    } catch (e) { }

    // Restore missed words
    missedWords = undoState.missedSnapshot;

    // Go back to the previous card
    currentIndex = undoState.index;
    undoState = null;

    TTS.stop();
    showStudy();
    showWarning('Ongedaan gemaakt');
  }

  // --- Session Summary ---
  function showSummary() {
    currentView = 'summary';
    updateNav();

    const session = SRS.getSession();
    const accuracy = session.cardsReviewed > 0
      ? Math.round((session.correctCount / session.cardsReviewed) * 100) : 0;
    const avgTime = session.cardsReviewed > 0
      ? Math.round(session.totalResponseTime / session.cardsReviewed / 1000 * 10) / 10 : 0;
    const totalTime = Math.round((Date.now() - session.startTime) / 1000 / 60 * 10) / 10;

    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="summary-screen fade-in">
        <h2>Sessie klaar! 🎉</h2>
        <div class="summary-stats">
          <div class="stat-card">
            <div class="stat-value">${session.cardsReviewed}</div>
            <div class="stat-label">Cards</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${accuracy}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${avgTime}s</div>
            <div class="stat-label">Avg Time</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${session.newWordsIntroduced}</div>
            <div class="stat-label">New Words</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalTime}m</div>
            <div class="stat-label">Time Spent</div>
          </div>
        </div>
        <div class="summary-actions">
          <button class="btn btn-primary" id="btn-study-more">Meer studeren</button>
          <button class="btn btn-secondary" id="btn-go-progress">Voortgang bekijken</button>
        </div>
      </div>
    `;

    document.getElementById('btn-study-more')?.addEventListener('click', () => {
      queue = SRS.buildQueue(VOCABULARY, settings);
      currentIndex = 0;
      missedWords = new Map();
      SRS.initSession();
      if (queue.length === 0) {
        showWarning('No cards are due for review. Come back later!');
        showProgress();
      } else {
        showStudy();
      }
    });

    document.getElementById('btn-go-progress')?.addEventListener('click', showProgress);
  }

  // --- Progress Page ---
  function showProgress() {
    currentView = 'progress';
    updateNav();

    const stats = SRS.getComputedStats(VOCABULARY);
    const todayAcc = stats.todayAccuracy.total > 0
      ? Math.round((stats.todayAccuracy.correct / stats.todayAccuracy.total) * 100) : 0;
    const timeToday = Math.round(stats.totalTimeToday / 1000 / 60 * 10) / 10;

    // Build daily activity chart from review history
    const history = SRS.getReviewHistory();
    const dailyActivity = buildDailyActivity(history);

    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="progress-screen fade-in">
        <h2>Voortgang</h2>

        <div class="progress-knowledge">
          <h3>Woordkennis</h3>
          ${buildProgressBars()}
        </div>

        <div class="status-bar-section">
          <h3>Kaartvoortgang (${stats.totalCards} kaarten)</h3>
          <div class="status-bar">
            <div class="status-segment new" style="width: ${(stats.totalNew / stats.totalCards) * 100}%" title="New: ${stats.totalNew}"></div>
            <div class="status-segment learning" style="width: ${(stats.totalLearning / stats.totalCards) * 100}%" title="Learning: ${stats.totalLearning}"></div>
            <div class="status-segment review" style="width: ${(stats.totalReview / stats.totalCards) * 100}%" title="Review: ${stats.totalReview}"></div>
            <div class="status-segment mastered" style="width: ${(stats.totalMastered / stats.totalCards) * 100}%" title="Mastered: ${stats.totalMastered}"></div>
          </div>
          <div class="status-legend">
            <span class="legend-item"><span class="dot new"></span>Nieuw: ${stats.totalNew}</span>
            <span class="legend-item"><span class="dot learning"></span>Leren: ${stats.totalLearning}</span>
            <span class="legend-item"><span class="dot review"></span>Herhalen: ${stats.totalReview}</span>
            <span class="legend-item"><span class="dot mastered"></span>Geleerd: ${stats.totalMastered}</span>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.totalReviewCount}</div>
            <div class="stat-label">Total Reviews</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.last7Accuracy}%</div>
            <div class="stat-label">7-Day Accuracy</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.estimatedVocab}</div>
            <div class="stat-label">Est. Vocabulary</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.dueTomorrow}</div>
            <div class="stat-label">Due Tomorrow</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${todayAcc}%</div>
            <div class="stat-label">Today Accuracy</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${timeToday}m</div>
            <div class="stat-label">Time Today</div>
          </div>
        </div>

        <div class="activity-section">
          <h3>Activiteit (laatste 14 dagen)</h3>
          <div class="activity-chart">
            ${dailyActivity}
          </div>
        </div>

        <div class="history-section">
          <h3>Recente reviews</h3>
          <div class="history-list">
            ${buildRecentHistory(history)}
          </div>
        </div>

        ${stats.struggledWords.length > 0 ? `
          <div class="struggled-section">
            <h3>Moeilijke woorden</h3>
            <div class="struggled-list">
              ${stats.struggledWords.map(sw => `
                <div class="struggled-word">
                  <span class="sw-lang">${langFlag('en')} ${sw.word.en}</span>
                  <span class="sw-lang">${langFlag('es')} ${sw.word.es}</span>
                  <span class="sw-lang">${langFlag('nl')} ${sw.word.nl}</span>
                  <span class="sw-dir">${sw.direction === 'toEs' ? '→ES' : '←ES'}</span>
                  <span class="sw-ease">EF: ${sw.progress.easeFactor.toFixed(2)}</span>
                  <span class="sw-accuracy">${sw.progress.totalReviews > 0 ? Math.round(sw.progress.totalCorrect / sw.progress.totalReviews * 100) : 0}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="dashboard-actions">
          <button class="btn btn-primary" id="btn-start-study">Start Studying</button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-study')?.addEventListener('click', () => {
      settings = SRS.getSettings();
      queue = SRS.buildQueue(VOCABULARY, settings);
      currentIndex = 0;
      missedWords = new Map();
      SRS.initSession();
      if (queue.length === 0) {
        showWarning('No cards are due for review right now. Come back later!');
      } else {
        showStudy();
      }
    });
  }

  function buildProgressBars() {
    const k = getKnowledgeLevels();
    const known = k.mastered + k.good + k.okay + k.seen;

    function bar(level, count, label, color) {
      const pct = k.total > 0 ? (count / k.total) * 100 : 0;
      return `
        <div class="progress-bar-row">
          <span class="pb-label">${label}</span>
          <div class="pb-track">
            <div class="pb-fill" style="width: ${pct}%; background: ${color}"></div>
          </div>
          <span class="pb-count">${count}</span>
        </div>`;
    }

    return `
      <div class="progress-bars-horizontal">
        <div class="pb-header">${known} / ${k.total} woorden</div>
        ${bar('mastered', k.mastered, 'Altijd goed', '#5ec269')}
        ${bar('good', k.good, 'Redelijk', '#7c8cf5')}
        ${bar('okay', k.okay, 'Beetje', '#e8a84a')}
        ${bar('seen', k.seen, '1x goed', '#e05a52')}
        ${bar('unseen', k.unseen, 'Onbekend', '#5c5c66')}
      </div>`;
  }

  function buildDailyActivity(history) {
    // Group by day for last 14 days
    const days = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { correct: 0, incorrect: 0, total: 0 };
    }

    for (const entry of history) {
      const key = new Date(entry.ts).toISOString().split('T')[0];
      if (days[key]) {
        days[key].total++;
        if (entry.ok) days[key].correct++;
        else days[key].incorrect++;
      }
    }

    const maxTotal = Math.max(1, ...Object.values(days).map(d => d.total));
    let html = '';
    for (const [date, data] of Object.entries(days)) {
      const height = (data.total / maxTotal) * 100;
      const correctPct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
      const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('nl', { weekday: 'short' }).slice(0, 2);
      html += `
        <div class="activity-bar" title="${date}: ${data.total} reviews (${Math.round(correctPct)}% correct)">
          <div class="activity-fill" style="height: ${height}%">
            <div class="activity-correct" style="height: ${correctPct}%"></div>
          </div>
          <span class="activity-day">${dayLabel}</span>
        </div>`;
    }
    return html;
  }

  function buildRecentHistory(history) {
    if (history.length === 0) return '<p class="empty-hint">Nog geen reviews.</p>';

    const recent = history.slice(-20).reverse();
    let html = '';
    for (const entry of recent) {
      const word = VOCABULARY.find(w => w.id === entry.id);
      if (!word) continue;
      const time = new Date(entry.ts).toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' });
      const date = new Date(entry.ts).toLocaleDateString('nl', { day: 'numeric', month: 'short' });
      const dirLabel = entry.dir === 'toEs' ? '→ES' : '←ES';
      html += `
        <div class="history-item ${entry.ok ? 'history-correct' : 'history-incorrect'}">
          <span class="hi-result">${entry.ok ? '✓' : '✗'}</span>
          <span class="hi-word">${word.es}</span>
          <span class="hi-dir">${dirLabel}</span>
          <span class="hi-time">${date} ${time}</span>
          <span class="hi-rt">${Math.round(entry.rt / 1000)}s</span>
        </div>`;
    }
    return html;
  }

  // --- Verbs Reference Page ---
  function showVerbs() {
    currentView = 'verbs';
    updateNav();

    if (typeof CONJUGATIONS === 'undefined') {
      document.getElementById('main-content').innerHTML = '<div class="empty-state"><p>Conjugation data not available.</p></div>';
      return;
    }

    const groups = CONJUGATIONS.getPatternGroups();
    const container = document.getElementById('main-content');

    let html = '<div class="verbs-screen fade-in"><h2>Werkwoorden</h2>';

    for (const [groupName, group] of Object.entries(groups)) {
      html += `
        <div class="verb-group">
          <div class="verb-group-header" onclick="this.parentElement.classList.toggle('expanded')">
            <h3>${groupName} <span class="verb-count">(${group.verbs.length})</span></h3>
            <p class="verb-group-desc">${group.desc}</p>
            <span class="expand-icon">▾</span>
          </div>
          <div class="verb-group-body">`;

      for (const vocId of group.verbs) {
        const word = VOCABULARY.find(w => w.id === vocId);
        if (!word) continue;
        const conj = CONJUGATIONS.conjugate(vocId);
        if (!conj) continue;

        const subjs = CONJUGATIONS.SUBJECTS;
        const refProns = CONJUGATIONS.REFL_PRONOUNS;

        let formsHtml = '';
        for (let i = 0; i < 6; i++) {
          const form = conj.isReflexive ? `${refProns[i]} ${conj.forms[i]}` : conj.forms[i];
          formsHtml += `<tr><td>${subjs[i]}</td><td>${form}</td></tr>`;
        }

        html += `
          <div class="verb-entry">
            <div class="verb-entry-header" onclick="this.parentElement.classList.toggle('verb-expanded')">
              <span class="verb-inf">${conj.infinitive}</span>
              <span class="verb-meaning">${word.en} / ${word.nl}</span>
              <span class="expand-icon">▾</span>
            </div>
            <div class="verb-entry-body">
              <table class="conj-table conj-table-small">
                <tbody>${formsHtml}</tbody>
              </table>
              ${conj.tip ? `<div class="conj-tip-small">${conj.tip}</div>` : ''}
            </div>
          </div>`;
      }

      html += '</div></div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // --- Settings ---
  function showSettings() {
    currentView = 'settings';
    updateNav();

    settings = SRS.getSettings();

    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="settings-screen fade-in">
        <h2>Settings</h2>

        <div class="setting-group">
          <label class="setting-label">New Cards Per Session</label>
          <div class="setting-control">
            <input type="range" id="set-new-cards" min="5" max="30" value="${settings.newCardsPerSession}" />
            <span id="new-cards-value" class="range-value">${settings.newCardsPerSession}</span>
          </div>
        </div>

        <div class="setting-group">
          <label class="setting-label">Auto-Pronounce</label>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" id="set-auto-pronounce" ${settings.autoPronounce ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-group">
          <label class="setting-label">Speech Speed</label>
          <div class="setting-control speed-buttons">
            <button class="btn btn-small ${settings.speechSpeed === 'slow' ? 'active' : ''}" data-speed="slow">Slow</button>
            <button class="btn btn-small ${settings.speechSpeed === 'normal' ? 'active' : ''}" data-speed="normal">Normal</button>
            <button class="btn btn-small ${settings.speechSpeed === 'fast' ? 'active' : ''}" data-speed="fast">Fast</button>
          </div>
        </div>

        <div class="setting-group">
          <label class="setting-label">Data</label>
          <div class="setting-control data-buttons">
            <button class="btn btn-secondary" id="btn-export">Export</button>
            <button class="btn btn-secondary" id="btn-import">Import</button>
          </div>
        </div>

        <div class="setting-group setting-group-danger">
          <label class="setting-label">Voortgang wissen</label>
          <p class="setting-hint">Verwijdert alle voortgang permanent. Dit kan niet ongedaan worden.</p>
          <button class="btn btn-danger" id="btn-reset">Wis alle voortgang</button>
        </div>

        <input type="file" id="import-file" accept=".json" class="hidden" />
      </div>
    `;

    // --- Bind events ---
    const newCardsSlider = document.getElementById('set-new-cards');
    newCardsSlider?.addEventListener('input', (e) => {
      document.getElementById('new-cards-value').textContent = e.target.value;
      settings.newCardsPerSession = parseInt(e.target.value);
      SRS.saveSettings(settings);
    });

    document.getElementById('set-auto-pronounce')?.addEventListener('change', (e) => {
      settings.autoPronounce = e.target.checked;
      SRS.saveSettings(settings);
    });

    document.querySelectorAll('.speed-buttons .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.speed-buttons .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        settings.speechSpeed = btn.dataset.speed;
        SRS.saveSettings(settings);
      });
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
      const data = SRS.exportProgress();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `language-srs-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('import-file')?.click();
    });

    document.getElementById('import-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const success = SRS.importProgress(ev.target.result);
        if (success) {
          showWarning('Progress imported successfully!');
          showSettings();
        } else {
          showWarning('Import failed. Invalid file format.');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      showConfirm('Weet je zeker dat je alle voortgang wilt wissen? Dit kan niet ongedaan worden.', () => {
        SRS.resetProgress();
        showWarning('Alle voortgang is gewist.');
        showSettings();
      });
    });
  }

  // --- Navigation ---
  function updateNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const view = btn.dataset.view;
      // Map dashboard/summary to progress for nav highlighting
      const isActive = view === currentView ||
        (view === 'progress' && (currentView === 'progress' || currentView === 'summary' || currentView === 'dashboard'));
      btn.classList.toggle('active', isActive);
    });
  }

  // --- Toasts / Modals ---
  function showWarning(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay fade-in';
    overlay.innerHTML = `
      <div class="modal">
        <p>${message}</p>
        <div class="modal-buttons">
          <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="modal-confirm">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('modal-cancel')?.addEventListener('click', () => overlay.remove());
    document.getElementById('modal-confirm')?.addEventListener('click', () => {
      overlay.remove();
      onConfirm();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  // --- Keyboard Shortcuts ---
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && currentView === 'study') {
        e.preventDefault();
        performUndo();
        return;
      }

      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      if (currentView !== 'study') return;

      if (e.code === 'Space' && !isRevealed) {
        e.preventDefault();
        revealAnswer();
      } else if (isRevealed && (e.code === 'Space' || e.key === 'Enter')) {
        e.preventDefault();
        rateCard(lastAnswerCorrect ? 2 : 0);
      }
    });
  }

  // --- Public API ---
  return {
    init,
    showStudy: () => {
      settings = SRS.getSettings();
      queue = SRS.buildQueue(VOCABULARY, settings);
      currentIndex = 0;
      missedWords = new Map();
      SRS.initSession();
      if (queue.length === 0) {
        showWarning('No cards are due for review. Come back later!');
        showProgress();
      } else {
        showStudy();
      }
    },
    showProgress,
    showVerbs,
    showSettings,
    // Legacy alias
    showDashboard: () => showProgress(),
  };
})();
