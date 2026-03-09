// Speed Duel — Two-player race game
// Both players see the same word and race to type the correct translation first.
// First correct = 10 pts, second correct = 5 pts, wrong answer = -2 pts.

const SpeedDuel = (() => {
  let state = {
    phase: 'setup', // setup | round | reveal | summary
    players: [
      { name: 'Player 1', nativeLang: 'nl', targetLang: 'es', score: 0, correctCount: 0, wrongCount: 0, bestTime: Infinity },
      { name: 'Player 2', nativeLang: 'es', targetLang: 'nl', score: 0, correctCount: 0, wrongCount: 0, bestTime: Infinity },
    ],
    currentRound: 0,
    totalRounds: 10,
    currentWord: null,
    wordPool: [],
    usedWordIds: new Set(),
    roundHistory: [],
    roundStartTime: 0,
    settings: {
      rounds: 10,
      difficulty: 'mixed',
      translateTo: 'target',  // 'target' = each translates to own target lang, 'source' = translate the source word
    },
  };

  function getContainer() { return document.getElementById('main-content'); }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickWord() {
    if (state.wordPool.length === 0) {
      let filtered = VOCABULARY.filter(w => !state.usedWordIds.has(w.id));
      if (filtered.length === 0) { state.usedWordIds.clear(); filtered = [...VOCABULARY]; }
      if (state.settings.difficulty === 'easy') {
        filtered = filtered.filter(w => w.type === 'noun' || w.type === 'adjective');
      } else if (state.settings.difficulty === 'mixed') {
        const concrete = filtered.filter(w => ['noun', 'adjective', 'verb', 'phrase'].includes(w.type));
        if (concrete.length >= 10) filtered = concrete;
      }
      state.wordPool = shuffleArray(filtered);
    }
    const word = state.wordPool.pop();
    state.usedWordIds.add(word.id);
    return word;
  }

  function normalize(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

  function cleanAnswer(s, lang) {
    let c = normalize(s).replace(/\(.*?\)/g, '').trim();
    if (lang === 'es') c = c.replace(/^(el|la|los|las|un|una)\s+/i, '').trim();
    if (lang === 'nl') c = c.replace(/^(de|het|een)\s+/i, '').trim();
    if (lang === 'en') c = c.replace(/^(the|a|an|to)\s+/i, '').trim();
    return c;
  }

  function checkAnswer(userInput, word, targetLang) {
    const input = cleanAnswer(userInput, targetLang);
    if (!input) return false;
    // Check all languages — the player may type any correct form
    for (const lang of ['en', 'es', 'nl']) {
      const alts = word[lang].split(/[/,]/).map(s => s.trim());
      for (const alt of alts) {
        if (cleanAnswer(alt, lang) === input || normalize(alt) === normalize(userInput)) return true;
      }
    }
    return false;
  }

  function scoreboardHTML() {
    const p1 = state.players[0];
    const p2 = state.players[1];
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';
    return `
      <div class="game-scoreboard">
        <div class="scoreboard-player">
          <span class="scoreboard-flag">${p1Flag}</span>
          <span class="scoreboard-name">${p1.name}</span>
          <span class="scoreboard-pts">${p1.score} pts</span>
        </div>
        <div class="scoreboard-divider">vs</div>
        <div class="scoreboard-player">
          <span class="scoreboard-flag">${p2Flag}</span>
          <span class="scoreboard-name">${p2.name}</span>
          <span class="scoreboard-pts">${p2.score} pts</span>
        </div>
      </div>`;
  }

  // --- Setup ---
  function showSetup() {
    state.phase = 'setup';
    const container = getContainer();
    container.innerHTML = `
      <div class="game-setup fade-in">
        <div class="game-header">
          <h2>⚡ Speed Duel</h2>
          <p class="game-subtitle">Both players race to translate the same word. Fastest correct answer scores more!</p>
        </div>
        <div class="game-setup-form">
          <div class="setup-section">
            <h3>🇳🇱 Player 1 <span class="setup-hint">(learning Spanish)</span></h3>
            <input type="text" id="sd-p1-name" class="game-input" value="${state.players[0].name}" placeholder="Name" />
          </div>
          <div class="setup-vs">VS</div>
          <div class="setup-section">
            <h3>🇪🇸 Player 2 <span class="setup-hint">(learning Dutch)</span></h3>
            <input type="text" id="sd-p2-name" class="game-input" value="${state.players[1].name}" placeholder="Name" />
          </div>
          <div class="setup-options">
            <label class="setup-label">Rounds
              <select id="sd-rounds" class="game-select">
                <option value="5" ${state.settings.rounds === 5 ? 'selected' : ''}>5</option>
                <option value="10" ${state.settings.rounds === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${state.settings.rounds === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${state.settings.rounds === 20 ? 'selected' : ''}>20</option>
              </select>
            </label>
            <label class="setup-label">Difficulty
              <select id="sd-difficulty" class="game-select">
                <option value="easy" ${state.settings.difficulty === 'easy' ? 'selected' : ''}>Easy (nouns & adjectives)</option>
                <option value="mixed" ${state.settings.difficulty === 'mixed' ? 'selected' : ''}>Mixed</option>
                <option value="hard" ${state.settings.difficulty === 'hard' ? 'selected' : ''}>Hard (all word types)</option>
              </select>
            </label>
          </div>
          <button class="btn btn-primary game-btn-start" id="sd-btn-start">⚡ Start Race!</button>
        </div>
      </div>`;

    document.getElementById('sd-btn-start').addEventListener('click', () => {
      state.players[0].name = document.getElementById('sd-p1-name').value.trim() || 'Player 1';
      state.players[1].name = document.getElementById('sd-p2-name').value.trim() || 'Player 2';
      state.settings.rounds = parseInt(document.getElementById('sd-rounds').value);
      state.settings.difficulty = document.getElementById('sd-difficulty').value;
      startGame();
    });
  }

  function startGame() {
    state.currentRound = 0;
    state.usedWordIds = new Set();
    state.wordPool = [];
    state.roundHistory = [];
    state.totalRounds = state.settings.rounds;
    for (const p of state.players) {
      p.score = 0;
      p.correctCount = 0;
      p.wrongCount = 0;
      p.bestTime = Infinity;
    }
    nextRound();
  }

  function nextRound() {
    if (state.currentRound >= state.totalRounds) { showSummary(); return; }
    state.currentRound++;
    state.currentWord = pickWord();
    showCountdown();
  }

  // --- Countdown before each round ---
  function showCountdown() {
    const container = getContainer();
    let count = 3;
    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>
        <div class="sd-countdown-area">
          <div class="sd-countdown-number" id="sd-countdown">${count}</div>
          <div class="sd-countdown-label">Get ready...</div>
        </div>
      </div>`;

    const countEl = document.getElementById('sd-countdown');
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        showRound();
      } else {
        countEl.textContent = count;
        countEl.classList.add('sd-countdown-pulse');
        setTimeout(() => countEl.classList.remove('sd-countdown-pulse'), 200);
      }
    }, 700);
  }

  // --- Round screen: both players see the word and type simultaneously ---
  function showRound() {
    state.phase = 'round';
    const container = getContainer();
    const word = state.currentWord;

    // Show the English word — both players translate to their target language
    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="sd-word-display">
          <div class="sd-word-label">Translate this word:</div>
          <div class="sd-word-main">🇬🇧 ${word.en}</div>
        </div>

        <div class="sd-inputs-row">
          <div class="sd-player-col sd-player-1-col">
            <div class="sd-player-label">${LANGUAGES[state.players[0].nativeLang]?.flag || ''} ${state.players[0].name}</div>
            <div class="sd-target-hint">→ ${LANGUAGES[state.players[0].targetLang]?.flag || ''} ${LANGUAGES[state.players[0].targetLang]?.name || ''}</div>
            <input type="text" id="sd-input-p1" class="game-input sd-race-input"
                   autocomplete="off" autocapitalize="off" spellcheck="false"
                   placeholder="Type translation..." />
            <button class="btn btn-primary sd-submit-btn" id="sd-submit-p1">Submit</button>
            <div class="sd-player-feedback" id="sd-feedback-p1"></div>
          </div>
          <div class="sd-vs-divider">⚡</div>
          <div class="sd-player-col sd-player-2-col">
            <div class="sd-player-label">${LANGUAGES[state.players[1].nativeLang]?.flag || ''} ${state.players[1].name}</div>
            <div class="sd-target-hint">→ ${LANGUAGES[state.players[1].targetLang]?.flag || ''} ${LANGUAGES[state.players[1].targetLang]?.name || ''}</div>
            <input type="text" id="sd-input-p2" class="game-input sd-race-input"
                   autocomplete="off" autocapitalize="off" spellcheck="false"
                   placeholder="Type translation..." />
            <button class="btn btn-primary sd-submit-btn" id="sd-submit-p2">Submit</button>
            <div class="sd-player-feedback" id="sd-feedback-p2"></div>
          </div>
        </div>
      </div>`;

    state.roundStartTime = Date.now();
    let p1Submitted = false;
    let p2Submitted = false;
    let firstCorrectPlayer = null;
    const roundResult = { word, p1: null, p2: null, p1Time: null, p2Time: null };

    function processSubmit(playerIndex) {
      if (playerIndex === 0 && p1Submitted) return;
      if (playerIndex === 1 && p2Submitted) return;

      const inputEl = document.getElementById(playerIndex === 0 ? 'sd-input-p1' : 'sd-input-p2');
      const feedbackEl = document.getElementById(playerIndex === 0 ? 'sd-feedback-p1' : 'sd-feedback-p2');
      const answer = inputEl.value.trim();
      if (!answer) return;

      const elapsed = ((Date.now() - state.roundStartTime) / 1000).toFixed(1);
      const player = state.players[playerIndex];
      const targetLang = player.targetLang;
      const correct = checkAnswer(answer, state.currentWord, targetLang);

      if (playerIndex === 0) { p1Submitted = true; roundResult.p1 = correct; roundResult.p1Time = parseFloat(elapsed); }
      else { p2Submitted = true; roundResult.p2 = correct; roundResult.p2Time = parseFloat(elapsed); }

      inputEl.disabled = true;
      const submitBtn = document.getElementById(playerIndex === 0 ? 'sd-submit-p1' : 'sd-submit-p2');
      if (submitBtn) submitBtn.disabled = true;

      if (correct) {
        const time = parseFloat(elapsed);
        if (time < player.bestTime) player.bestTime = time;
        player.correctCount++;

        if (!firstCorrectPlayer) {
          firstCorrectPlayer = playerIndex;
          player.score += 10;
          feedbackEl.innerHTML = `<span class="sd-correct">✅ Correct! <strong>+10 pts</strong> <span class="sd-time">(${elapsed}s)</span></span>`;
          feedbackEl.classList.add('sd-first');
        } else {
          player.score += 5;
          feedbackEl.innerHTML = `<span class="sd-correct">✅ Correct! <strong>+5 pts</strong> <span class="sd-time">(${elapsed}s)</span></span>`;
        }
      } else {
        player.wrongCount++;
        player.score = Math.max(0, player.score - 2);
        feedbackEl.innerHTML = `<span class="sd-wrong">❌ Wrong! <strong>-2 pts</strong></span>`;
      }

      // Update scoreboard
      const sb = document.querySelector('.game-scoreboard');
      if (sb) sb.outerHTML = scoreboardHTML();

      // If both submitted, move to reveal after a brief pause
      if (p1Submitted && p2Submitted) {
        setTimeout(() => showReveal(roundResult), 1200);
      }
    }

    // Submit buttons
    document.getElementById('sd-submit-p1').addEventListener('click', () => processSubmit(0));
    document.getElementById('sd-submit-p2').addEventListener('click', () => processSubmit(1));

    // Enter key on each input
    document.getElementById('sd-input-p1').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); processSubmit(0); }
    });
    document.getElementById('sd-input-p2').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); processSubmit(1); }
    });

    // Focus first player input
    setTimeout(() => document.getElementById('sd-input-p1')?.focus(), 100);
  }

  // --- Reveal screen ---
  function showReveal(roundResult) {
    state.phase = 'reveal';
    const container = getContainer();
    const word = state.currentWord;

    state.roundHistory.push(roundResult);

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="sd-reveal-card">
          <div class="sd-reveal-word">
            <div class="reveal-word-row"><span class="reveal-lang">🇬🇧</span><span class="reveal-text">${word.en}</span></div>
            <div class="reveal-word-row"><span class="reveal-lang">🇪🇸</span><span class="reveal-text reveal-text-main">${word.es}</span></div>
            <div class="reveal-word-row"><span class="reveal-lang">🇳🇱</span><span class="reveal-text">${word.nl}</span></div>
          </div>

          <div class="sd-reveal-results">
            <div class="sd-reveal-player ${roundResult.p1 ? 'sd-reveal-correct' : 'sd-reveal-wrong'}">
              <span class="sd-reveal-name">${state.players[0].name}</span>
              <span class="sd-reveal-icon">${roundResult.p1 ? '✅' : '❌'}</span>
              ${roundResult.p1Time !== null ? `<span class="sd-reveal-time">${roundResult.p1Time}s</span>` : ''}
            </div>
            <div class="sd-reveal-player ${roundResult.p2 ? 'sd-reveal-correct' : 'sd-reveal-wrong'}">
              <span class="sd-reveal-name">${state.players[1].name}</span>
              <span class="sd-reveal-icon">${roundResult.p2 ? '✅' : '❌'}</span>
              ${roundResult.p2Time !== null ? `<span class="sd-reveal-time">${roundResult.p2Time}s</span>` : ''}
            </div>
          </div>

          <button class="btn btn-primary game-btn-next" id="sd-btn-next">
            ${state.currentRound >= state.totalRounds ? '🏆 See Results' : '➡️ Next Round'}
            <span class="shortcut-hint">[Enter]</span>
          </button>
        </div>
      </div>`;

    // Speak the word
    if (typeof TTS !== 'undefined') setTimeout(() => TTS.speakWord(word.es, 'es', 1.0), 200);

    document.getElementById('sd-btn-next').addEventListener('click', () => nextRound());
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter' && state.phase === 'reveal') {
        e.preventDefault();
        document.removeEventListener('keydown', handler);
        nextRound();
      }
    });
  }

  // --- Summary ---
  function showSummary() {
    state.phase = 'summary';
    const container = getContainer();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const winner = p1.score > p2.score ? p1 : (p2.score > p1.score ? p2 : null);
    const isDraw = !winner;
    const margin = winner ? Math.abs(p1.score - p2.score) : 0;
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';

    function formatTime(t) { return t === Infinity ? '—' : t.toFixed(1) + 's'; }

    const historyHTML = state.roundHistory.map((r, i) => `
      <div class="summary-round-item">
        <span class="summary-round-num">${i + 1}</span>
        <span class="summary-round-word">🇬🇧 ${r.word.en}</span>
        <span>${r.p1 ? '✅' : '❌'} ${r.p1Time ? r.p1Time + 's' : ''}</span>
        <span>|</span>
        <span>${r.p2 ? '✅' : '❌'} ${r.p2Time ? r.p2Time + 's' : ''}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-winner-screen">
          ${isDraw ? `
            <div class="winner-trophy">🤝</div>
            <h2 class="winner-title">It's a Draw!</h2>
            <p class="winner-subtitle">Both scored <strong>${p1.score} pts</strong> — perfectly matched!</p>
          ` : `
            <div class="winner-trophy">🏆</div>
            <h2 class="winner-title">${winner.name} Wins!</h2>
            <p class="winner-subtitle">Victory by <strong>${margin} pts</strong></p>
            <div class="winner-crown">
              <span class="winner-crown-flag">${LANGUAGES[winner.nativeLang]?.flag || ''}</span>
              <span class="winner-crown-name">${winner.name}</span>
            </div>
          `}

          <div class="game-final-scores">
            <div class="final-score-card ${p1.score >= p2.score ? 'final-score-winner' : 'final-score-loser'}">
              <div class="final-score-flag">${p1Flag}</div>
              <div class="final-score-name">${p1.name}</div>
              <div class="final-score-number">${p1.score}</div>
              <div class="final-score-label">points</div>
              <div class="final-score-detail">${p1.correctCount} correct · ${p1.wrongCount} wrong</div>
              <div class="final-score-detail">Best time: ${formatTime(p1.bestTime)}</div>
            </div>
            <div class="final-score-vs">VS</div>
            <div class="final-score-card ${p2.score >= p1.score ? 'final-score-winner' : 'final-score-loser'}">
              <div class="final-score-flag">${p2Flag}</div>
              <div class="final-score-name">${p2.name}</div>
              <div class="final-score-number">${p2.score}</div>
              <div class="final-score-label">points</div>
              <div class="final-score-detail">${p2.correctCount} correct · ${p2.wrongCount} wrong</div>
              <div class="final-score-detail">Best time: ${formatTime(p2.bestTime)}</div>
            </div>
          </div>

          <div class="game-summary-history">
            <h3>Round History</h3>
            <div class="sd-history-header">
              <span>#</span><span>Word</span><span>${p1.name}</span><span></span><span>${p2.name}</span>
            </div>
            ${historyHTML}
          </div>

          <div class="game-summary-actions">
            <button class="btn btn-primary game-btn-rematch" id="sd-btn-rematch">🔄 Rematch!</button>
            <button class="btn btn-secondary" id="sd-btn-setup">⚙️ Settings</button>
          </div>
        </div>
      </div>`;

    document.getElementById('sd-btn-rematch').addEventListener('click', startGame);
    document.getElementById('sd-btn-setup').addEventListener('click', showSetup);
  }

  return { show: showSetup, getState: () => state };
})();
