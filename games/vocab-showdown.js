// Vocab Showdown — Alternating-turn translation battle
// Players take turns translating words. Faster answers = more points.
// Speed bonus: <3s = 10pts, <5s = 8pts, <10s = 6pts, else = 4pts. Wrong = 0.

const VocabShowdown = (() => {
  let state = {
    phase: 'setup', // setup | turn | feedback | summary
    players: [
      { name: 'Player 1', nativeLang: 'nl', targetLang: 'es', score: 0, correctCount: 0, wrongCount: 0, totalTime: 0 },
      { name: 'Player 2', nativeLang: 'es', targetLang: 'nl', score: 0, correctCount: 0, wrongCount: 0, totalTime: 0 },
    ],
    activePlayerIndex: 0,
    currentRound: 0,
    totalRounds: 10,
    currentWord: null,
    wordPool: [],
    usedWordIds: new Set(),
    roundHistory: [],
    turnStartTime: 0,
    timerRemaining: 15,
    timerInterval: null,
    settings: {
      rounds: 10,
      turnTime: 15,
      difficulty: 'mixed',
      direction: 'to-target', // 'to-target' or 'from-target'
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
    // Must answer in the target language
    const alts = word[targetLang].split(/[/,]/).map(s => s.trim());
    for (const alt of alts) {
      if (cleanAnswer(alt, targetLang) === input || normalize(alt) === normalize(userInput)) return true;
    }
    return false;
  }

  function getActivePlayer() { return state.players[state.activePlayerIndex]; }

  function scoreboardHTML() {
    const p1 = state.players[0];
    const p2 = state.players[1];
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';
    const active = state.activePlayerIndex;
    return `
      <div class="game-scoreboard">
        <div class="scoreboard-player ${active === 0 ? 'scoreboard-active' : ''}">
          <span class="scoreboard-flag">${p1Flag}</span>
          <span class="scoreboard-name">${p1.name}</span>
          <span class="scoreboard-pts">${p1.score} pts</span>
        </div>
        <div class="scoreboard-divider">vs</div>
        <div class="scoreboard-player ${active === 1 ? 'scoreboard-active' : ''}">
          <span class="scoreboard-flag">${p2Flag}</span>
          <span class="scoreboard-name">${p2.name}</span>
          <span class="scoreboard-pts">${p2.score} pts</span>
        </div>
      </div>`;
  }

  function clearTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  }

  function calcPointsForTime(seconds) {
    if (seconds < 3) return 10;
    if (seconds < 5) return 8;
    if (seconds < 10) return 6;
    return 4;
  }

  // --- Setup ---
  function showSetup() {
    state.phase = 'setup';
    const container = getContainer();
    container.innerHTML = `
      <div class="game-setup fade-in">
        <div class="game-header">
          <h2>🎯 Vocab Showdown</h2>
          <p class="game-subtitle">Take turns translating words. Faster answers score more points!</p>
        </div>
        <div class="game-setup-form">
          <div class="setup-section">
            <h3>🇳🇱 Player 1 <span class="setup-hint">(learning Spanish)</span></h3>
            <input type="text" id="vs-p1-name" class="game-input" value="${state.players[0].name}" placeholder="Name" />
          </div>
          <div class="setup-vs">VS</div>
          <div class="setup-section">
            <h3>🇪🇸 Player 2 <span class="setup-hint">(learning Dutch)</span></h3>
            <input type="text" id="vs-p2-name" class="game-input" value="${state.players[1].name}" placeholder="Name" />
          </div>
          <div class="setup-options">
            <label class="setup-label">Rounds (each)
              <select id="vs-rounds" class="game-select">
                <option value="5" ${state.settings.rounds === 5 ? 'selected' : ''}>5</option>
                <option value="10" ${state.settings.rounds === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${state.settings.rounds === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${state.settings.rounds === 20 ? 'selected' : ''}>20</option>
              </select>
            </label>
            <label class="setup-label">Time per turn
              <select id="vs-time" class="game-select">
                <option value="10" ${state.settings.turnTime === 10 ? 'selected' : ''}>10s</option>
                <option value="15" ${state.settings.turnTime === 15 ? 'selected' : ''}>15s</option>
                <option value="20" ${state.settings.turnTime === 20 ? 'selected' : ''}>20s</option>
                <option value="30" ${state.settings.turnTime === 30 ? 'selected' : ''}>30s</option>
              </select>
            </label>
            <label class="setup-label">Difficulty
              <select id="vs-difficulty" class="game-select">
                <option value="easy" ${state.settings.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
                <option value="mixed" ${state.settings.difficulty === 'mixed' ? 'selected' : ''}>Mixed</option>
                <option value="hard" ${state.settings.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
              </select>
            </label>
          </div>
          <div class="vs-scoring-info">
            <div class="vs-scoring-title">⏱️ Speed Scoring</div>
            <div class="vs-scoring-grid">
              <span class="vs-score-tier vs-tier-gold">&lt; 3s → 10 pts</span>
              <span class="vs-score-tier vs-tier-silver">&lt; 5s → 8 pts</span>
              <span class="vs-score-tier vs-tier-bronze">&lt; 10s → 6 pts</span>
              <span class="vs-score-tier vs-tier-base">10s+ → 4 pts</span>
            </div>
          </div>
          <button class="btn btn-primary game-btn-start" id="vs-btn-start">🎯 Start Showdown!</button>
        </div>
      </div>`;

    document.getElementById('vs-btn-start').addEventListener('click', () => {
      state.players[0].name = document.getElementById('vs-p1-name').value.trim() || 'Player 1';
      state.players[1].name = document.getElementById('vs-p2-name').value.trim() || 'Player 2';
      state.settings.rounds = parseInt(document.getElementById('vs-rounds').value);
      state.settings.turnTime = parseInt(document.getElementById('vs-time').value);
      state.settings.difficulty = document.getElementById('vs-difficulty').value;
      startGame();
    });
  }

  function startGame() {
    state.currentRound = 0;
    state.activePlayerIndex = 0;
    state.usedWordIds = new Set();
    state.wordPool = [];
    state.roundHistory = [];
    state.totalRounds = state.settings.rounds * 2; // each player gets rounds turns
    for (const p of state.players) {
      p.score = 0; p.correctCount = 0; p.wrongCount = 0; p.totalTime = 0;
    }
    nextTurn();
  }

  function nextTurn() {
    if (state.currentRound >= state.totalRounds) { showSummary(); return; }
    state.currentRound++;
    state.currentWord = pickWord();
    // Alternate: even rounds = P1, odd = P2
    state.activePlayerIndex = (state.currentRound - 1) % 2;
    showHandoff();
  }

  // --- Handoff ---
  function showHandoff() {
    const container = getContainer();
    const player = getActivePlayer();
    const flag = LANGUAGES[player.nativeLang]?.flag || '';
    const turnNum = Math.ceil(state.currentRound / 2);
    const totalPerPlayer = state.settings.rounds;

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Turn ${turnNum} / ${totalPerPlayer}</div>
          ${scoreboardHTML()}
        </div>
        <div class="game-handoff">
          <div class="game-handoff-icon">🎯</div>
          <h2>${flag} ${player.name}'s Turn</h2>
          <p class="game-handoff-instruction">Translate the word to <strong>${LANGUAGES[player.targetLang]?.name || ''}</strong> as fast as you can!</p>
          <button class="btn btn-primary game-btn-ready" id="vs-btn-go">Ready!</button>
        </div>
      </div>`;

    document.getElementById('vs-btn-go').addEventListener('click', showTurn);
  }

  // --- Active Turn ---
  function showTurn() {
    state.phase = 'turn';
    clearTimer();
    const container = getContainer();
    const player = getActivePlayer();
    const word = state.currentWord;
    const sourceLang = player.nativeLang;
    const targetLang = player.targetLang;
    const sourceFlag = LANGUAGES[sourceLang]?.flag || '';
    const targetFlag = LANGUAGES[targetLang]?.flag || '';
    const turnNum = Math.ceil(state.currentRound / 2);
    const totalPerPlayer = state.settings.rounds;

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Turn ${turnNum} / ${totalPerPlayer}</div>
          <div class="game-timer-display" id="vs-timer">${state.settings.turnTime}s</div>
          ${scoreboardHTML()}
        </div>

        <div class="vs-turn-card">
          <div class="vs-turn-player">${LANGUAGES[player.nativeLang]?.flag || ''} ${player.name}</div>
          <div class="vs-word-prompt">
            <div class="vs-prompt-label">Translate to ${targetFlag} ${LANGUAGES[targetLang]?.name || ''}:</div>
            <div class="vs-prompt-word">${sourceFlag} ${word[sourceLang]}</div>
            <div class="vs-prompt-english">🇬🇧 ${word.en}</div>
          </div>

          <div class="vs-answer-area">
            <input type="text" id="vs-answer" class="game-input vs-answer-input"
                   autocomplete="off" autocapitalize="off" spellcheck="false"
                   placeholder="Type ${LANGUAGES[targetLang]?.name || ''} translation..." autofocus />
            <button class="btn btn-primary vs-answer-btn" id="vs-btn-submit">Submit <span class="shortcut-hint">[Enter]</span></button>
          </div>

          <div class="vs-speed-indicator" id="vs-speed-bar">
            <div class="vs-speed-fill" id="vs-speed-fill"></div>
            <div class="vs-speed-tiers">
              <span class="vs-tier-mark" style="left:20%">3s</span>
              <span class="vs-tier-mark" style="left:33%">5s</span>
              <span class="vs-tier-mark" style="left:66%">10s</span>
            </div>
          </div>
        </div>
      </div>`;

    state.turnStartTime = Date.now();
    state.timerRemaining = state.settings.turnTime;

    // Timer
    const timerEl = document.getElementById('vs-timer');
    const speedFill = document.getElementById('vs-speed-fill');
    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      timerEl.textContent = state.timerRemaining + 's';
      if (state.timerRemaining <= 5) timerEl.classList.add('timer-warning');
      if (state.timerRemaining <= 3) timerEl.classList.add('timer-critical');

      // Speed bar: shrink from 100% → 0% over turnTime
      const pct = Math.max(0, (state.timerRemaining / state.settings.turnTime) * 100);
      speedFill.style.width = pct + '%';

      if (state.timerRemaining <= 0) {
        clearTimer();
        submitAnswer('', true);
      }
    }, 1000);

    // Input handling
    const input = document.getElementById('vs-answer');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitAnswer(input.value); }
    });
    document.getElementById('vs-btn-submit').addEventListener('click', () => submitAnswer(input.value));
    setTimeout(() => input.focus(), 100);
  }

  function submitAnswer(answer, timedOut = false) {
    clearTimer();
    const player = getActivePlayer();
    const word = state.currentWord;
    const targetLang = player.targetLang;
    const elapsed = (Date.now() - state.turnStartTime) / 1000;

    let correct = false;
    let points = 0;
    if (!timedOut && answer.trim()) {
      correct = checkAnswer(answer, word, targetLang);
    }

    if (correct) {
      points = calcPointsForTime(elapsed);
      player.score += points;
      player.correctCount++;
      player.totalTime += elapsed;
    } else {
      player.wrongCount++;
    }

    state.roundHistory.push({
      word,
      player: player.name,
      playerIndex: state.activePlayerIndex,
      correct,
      answer: answer.trim() || (timedOut ? '(time\'s up)' : '(empty)'),
      time: correct ? elapsed : null,
      points,
    });

    showFeedback(correct, points, elapsed, answer, timedOut);
  }

  // --- Turn feedback ---
  function showFeedback(correct, points, elapsed, answer, timedOut) {
    state.phase = 'feedback';
    const container = getContainer();
    const player = getActivePlayer();
    const word = state.currentWord;
    const targetLang = player.targetLang;
    const correctAnswer = word[targetLang];

    let speedLabel = '';
    if (correct) {
      if (elapsed < 3) speedLabel = '⚡ Lightning fast!';
      else if (elapsed < 5) speedLabel = '🔥 Quick!';
      else if (elapsed < 10) speedLabel = '👍 Solid';
      else speedLabel = '🐢 Made it!';
    }

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Turn ${Math.ceil(state.currentRound / 2)} / ${state.settings.rounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="vs-feedback-card ${correct ? 'vs-feedback-correct' : 'vs-feedback-wrong'}">
          ${correct ? `
            <div class="vs-feedback-icon">🎉</div>
            <div class="vs-feedback-verdict vs-verdict-correct">Correct!</div>
            <div class="vs-feedback-points">+${points} pts</div>
            <div class="vs-feedback-speed">${speedLabel} (${elapsed.toFixed(1)}s)</div>
          ` : `
            <div class="vs-feedback-icon">❌</div>
            <div class="vs-feedback-verdict vs-verdict-wrong">${timedOut ? 'Time\'s Up!' : 'Wrong!'}</div>
            ${answer.trim() ? `<div class="vs-feedback-answer">Your answer: "${answer}"</div>` : ''}
            <div class="vs-feedback-correct-answer">Correct: <strong>${correctAnswer}</strong></div>
          `}

          <div class="vs-feedback-word-card">
            <div class="reveal-word-row"><span class="reveal-lang">🇬🇧</span><span class="reveal-text">${word.en}</span></div>
            <div class="reveal-word-row"><span class="reveal-lang">🇪🇸</span><span class="reveal-text">${word.es}</span></div>
            <div class="reveal-word-row"><span class="reveal-lang">🇳🇱</span><span class="reveal-text">${word.nl}</span></div>
          </div>

          <button class="btn btn-primary game-btn-next" id="vs-btn-next">
            ${state.currentRound >= state.totalRounds ? '🏆 See Results' : '➡️ Next Turn'}
            <span class="shortcut-hint">[Enter]</span>
          </button>
        </div>
      </div>`;

    if (typeof TTS !== 'undefined') setTimeout(() => TTS.speakWord(word.es, 'es', 1.0), 200);

    document.getElementById('vs-btn-next').addEventListener('click', () => nextTurn());
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter' && state.phase === 'feedback') {
        e.preventDefault();
        document.removeEventListener('keydown', handler);
        nextTurn();
      }
    });
  }

  // --- Summary ---
  function showSummary() {
    state.phase = 'summary';
    clearTimer();
    const container = getContainer();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const winner = p1.score > p2.score ? p1 : (p2.score > p1.score ? p2 : null);
    const isDraw = !winner;
    const margin = winner ? Math.abs(p1.score - p2.score) : 0;
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';

    function avgTime(p) {
      return p.correctCount > 0 ? (p.totalTime / p.correctCount).toFixed(1) + 's' : '—';
    }

    const historyHTML = state.roundHistory.map((r, i) => {
      const pFlag = LANGUAGES[state.players[r.playerIndex].nativeLang]?.flag || '';
      return `
        <div class="summary-round-item ${r.correct ? 'summary-correct' : 'summary-wrong'}">
          <span class="summary-round-num">${i + 1}</span>
          <span>${pFlag} ${r.player}</span>
          <span class="summary-round-word">🇬🇧 ${r.word.en}</span>
          <span>${r.correct ? '✅' : '❌'} ${r.correct ? '+' + r.points : '0'}</span>
          <span>${r.time !== null ? r.time.toFixed(1) + 's' : ''}</span>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-winner-screen">
          ${isDraw ? `
            <div class="winner-trophy">🤝</div>
            <h2 class="winner-title">It's a Draw!</h2>
            <p class="winner-subtitle">Both scored <strong>${p1.score} pts</strong></p>
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
              <div class="final-score-detail">${p1.correctCount}/${state.settings.rounds} correct</div>
              <div class="final-score-detail">Avg time: ${avgTime(p1)}</div>
            </div>
            <div class="final-score-vs">VS</div>
            <div class="final-score-card ${p2.score >= p1.score ? 'final-score-winner' : 'final-score-loser'}">
              <div class="final-score-flag">${p2Flag}</div>
              <div class="final-score-name">${p2.name}</div>
              <div class="final-score-number">${p2.score}</div>
              <div class="final-score-label">points</div>
              <div class="final-score-detail">${p2.correctCount}/${state.settings.rounds} correct</div>
              <div class="final-score-detail">Avg time: ${avgTime(p2)}</div>
            </div>
          </div>

          <div class="game-summary-history">
            <h3>Turn History</h3>
            ${historyHTML}
          </div>

          <div class="game-summary-actions">
            <button class="btn btn-primary game-btn-rematch" id="vs-btn-rematch">🔄 Rematch!</button>
            <button class="btn btn-secondary" id="vs-btn-setup">⚙️ Settings</button>
          </div>
        </div>
      </div>`;

    document.getElementById('vs-btn-rematch').addEventListener('click', startGame);
    document.getElementById('vs-btn-setup').addEventListener('click', showSetup);
  }

  return { show: showSetup, getState: () => state };
})();
