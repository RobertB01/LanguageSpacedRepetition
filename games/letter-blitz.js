// Letter Blitz — Two-player "Scattergories" style game
// A random letter is drawn. Players take turns filling in words for each category
// that start with that letter. Answers in any language, bonus for target language.
// Unique answers = 10 pts, matching = 5 pts, invalid/empty = 0 pts.

const LetterBlitz = (() => {
  // --- Categories pool ---
  const ALL_CATEGORIES = [
    { id: 'animal',     label: '🐾 Animal',        emoji: '🐾' },
    { id: 'food',       label: '🍽️ Food / Drink',   emoji: '🍽️' },
    { id: 'color',      label: '🎨 Color',          emoji: '🎨' },
    { id: 'country',    label: '🌍 Country / City', emoji: '🌍' },
    { id: 'profession', label: '👷 Profession',     emoji: '👷' },
    { id: 'bodypart',   label: '🦴 Body part',      emoji: '🦴' },
    { id: 'clothing',   label: '👕 Clothing',       emoji: '👕' },
    { id: 'verb',       label: '🏃 Verb (action)',  emoji: '🏃' },
    { id: 'adjective',  label: '✨ Adjective',      emoji: '✨' },
    { id: 'sport',      label: '⚽ Sport / Hobby',  emoji: '⚽' },
    { id: 'household',  label: '🏠 Household item', emoji: '🏠' },
    { id: 'nature',     label: '🌿 Nature',         emoji: '🌿' },
    { id: 'transport',  label: '🚗 Transport',      emoji: '🚗' },
    { id: 'music',      label: '🎵 Music / Art',    emoji: '🎵' },
    { id: 'school',     label: '📚 School subject',  emoji: '📚' },
    { id: 'emotion',    label: '😊 Emotion',        emoji: '😊' },
  ];

  // Letters that have enough words across languages (skip Q, X, Y, Z for fairness)
  const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVW'.split('');

  let state = {
    phase: 'setup',   // setup | letter | turn | review | scores | summary
    players: [
      { name: 'Player 1', nativeLang: 'nl', targetLang: 'es', totalScore: 0 },
      { name: 'Player 2', nativeLang: 'es', targetLang: 'nl', totalScore: 0 },
    ],
    currentRound: 0,
    totalRounds: 3,
    currentLetter: '',
    categories: [],       // categories for current round
    answers: [[], []],    // answers[playerIdx][categoryIdx] = string
    judgments: [[], []],   // judgments[playerIdx][categoryIdx] = boolean
    turnIndex: 0,          // which player is filling in
    timerSeconds: 60,
    timerRemaining: 60,
    timerInterval: null,
    roundHistory: [],
    usedLetters: new Set(),
    settings: {
      rounds: 3,
      timer: 60,
      categoriesPerRound: 6,
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

  function pickLetter() {
    let available = LETTERS.filter(l => !state.usedLetters.has(l));
    if (available.length === 0) {
      state.usedLetters.clear();
      available = [...LETTERS];
    }
    const letter = available[Math.floor(Math.random() * available.length)];
    state.usedLetters.add(letter);
    return letter;
  }

  function pickCategories() {
    return shuffleArray(ALL_CATEGORIES).slice(0, state.settings.categoriesPerRound);
  }

  function clearTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function scoreboardHTML() {
    const p1 = state.players[0];
    const p2 = state.players[1];
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';
    return `
      <div class="game-scoreboard">
        <div class="scoreboard-player ${p1.totalScore >= p2.totalScore ? 'scoreboard-leading' : ''}">
          ${p1Flag} <span class="scoreboard-name">${p1.name}</span>
          <span class="scoreboard-score">${p1.totalScore}</span>
        </div>
        <div class="scoreboard-divider">vs</div>
        <div class="scoreboard-player ${p2.totalScore >= p1.totalScore ? 'scoreboard-leading' : ''}">
          ${p2Flag} <span class="scoreboard-name">${p2.name}</span>
          <span class="scoreboard-score">${p2.totalScore}</span>
        </div>
      </div>`;
  }

  // --- Setup Screen ---
  function show() {
    state.phase = 'setup';
    state.usedLetters = new Set();
    const container = getContainer();
    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-setup">
          <button class="btn btn-secondary game-back-btn" id="btn-back-games">← Back to Games</button>
          <h2 class="game-setup-title">🔤 Letter Blitz</h2>
          <p class="game-setup-subtitle">A letter is drawn. Fill in a word for each category starting with that letter!</p>

          <div class="game-setup-form">
            <div class="game-setup-row">
              <label>🇳🇱 Player 1 (Dutch speaker)</label>
              <input type="text" id="p1-name" class="game-input" value="${state.players[0].name}" placeholder="Name" />
            </div>
            <div class="game-setup-row">
              <label>🇪🇸 Player 2 (Spanish speaker)</label>
              <input type="text" id="p2-name" class="game-input" value="${state.players[1].name}" placeholder="Name" />
            </div>
            <div class="game-setup-row">
              <label>Rounds</label>
              <select id="opt-rounds" class="game-input">
                <option value="2" ${state.settings.rounds === 2 ? 'selected' : ''}>2 rounds</option>
                <option value="3" ${state.settings.rounds === 3 ? 'selected' : ''}>3 rounds</option>
                <option value="5" ${state.settings.rounds === 5 ? 'selected' : ''}>5 rounds</option>
              </select>
            </div>
            <div class="game-setup-row">
              <label>⏱️ Time per player</label>
              <select id="opt-timer" class="game-input">
                <option value="45" ${state.settings.timer === 45 ? 'selected' : ''}>45 seconds</option>
                <option value="60" ${state.settings.timer === 60 ? 'selected' : ''}>60 seconds</option>
                <option value="90" ${state.settings.timer === 90 ? 'selected' : ''}>90 seconds</option>
                <option value="120" ${state.settings.timer === 120 ? 'selected' : ''}>120 seconds</option>
              </select>
            </div>
            <div class="game-setup-row">
              <label>📋 Categories per round</label>
              <select id="opt-categories" class="game-input">
                <option value="4" ${state.settings.categoriesPerRound === 4 ? 'selected' : ''}>4 categories</option>
                <option value="6" ${state.settings.categoriesPerRound === 6 ? 'selected' : ''}>6 categories</option>
                <option value="8" ${state.settings.categoriesPerRound === 8 ? 'selected' : ''}>8 categories</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary game-btn-start" id="btn-start-game">
            🔤 Start Letter Blitz!
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-back-games').addEventListener('click', () => {
      if (typeof App !== 'undefined') App.showGames();
    });

    document.getElementById('btn-start-game').addEventListener('click', () => {
      state.players[0].name = document.getElementById('p1-name').value.trim() || 'Player 1';
      state.players[1].name = document.getElementById('p2-name').value.trim() || 'Player 2';
      state.settings.rounds = parseInt(document.getElementById('opt-rounds').value);
      state.settings.timer = parseInt(document.getElementById('opt-timer').value);
      state.settings.categoriesPerRound = parseInt(document.getElementById('opt-categories').value);
      startGame();
    });
  }

  function startGame() {
    state.currentRound = 0;
    state.totalRounds = state.settings.rounds;
    state.usedLetters = new Set();
    state.roundHistory = [];
    for (const p of state.players) {
      p.totalScore = 0;
    }
    nextRound();
  }

  function nextRound() {
    if (state.currentRound >= state.totalRounds) {
      showSummary();
      return;
    }
    state.currentRound++;
    state.currentLetter = pickLetter();
    state.categories = pickCategories();
    state.answers = [
      new Array(state.categories.length).fill(''),
      new Array(state.categories.length).fill(''),
    ];
    state.judgments = [
      new Array(state.categories.length).fill(null),
      new Array(state.categories.length).fill(null),
    ];
    state.turnIndex = 0;
    showLetterReveal();
  }

  // --- Letter Reveal Screen ---
  function showLetterReveal() {
    state.phase = 'letter';
    const container = getContainer();

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="lb-letter-reveal">
          <div class="lb-letter-label">The letter is...</div>
          <div class="lb-letter-big" id="lb-letter-anim">${state.currentLetter}</div>
          <div class="lb-categories-preview">
            <div class="lb-categories-label">Categories this round:</div>
            ${state.categories.map(c => `<span class="lb-category-chip">${c.label}</span>`).join('')}
          </div>
          <div class="lb-letter-instruction">
            Find a word starting with <strong>"${state.currentLetter}"</strong> for each category!<br>
            <span class="lb-lang-hint">Answers in 🇪🇸 Spanish, 🇬🇧 English, or 🇳🇱 Dutch — target language = bonus!</span>
          </div>
          <button class="btn btn-primary game-btn-ready" id="btn-start-turn">
            💻 ${state.players[0].name} goes first — Start!
          </button>
        </div>
      </div>
    `;

    // Animate letter
    const letterEl = document.getElementById('lb-letter-anim');
    letterEl.classList.add('lb-letter-animate');

    document.getElementById('btn-start-turn').addEventListener('click', () => {
      state.turnIndex = 0;
      showTurnScreen();
    });
  }

  // --- Turn Screen (player fills in categories) ---
  function showTurnScreen() {
    state.phase = 'turn';
    clearTimer();
    const container = getContainer();
    const player = state.players[state.turnIndex];
    const playerFlag = LANGUAGES[player.nativeLang]?.flag || '';
    const otherPlayer = state.players[1 - state.turnIndex];

    state.timerSeconds = state.settings.timer;
    state.timerRemaining = state.timerSeconds;

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          <div class="game-timer-display" id="game-timer">${state.timerRemaining}s</div>
          ${scoreboardHTML()}
        </div>

        <div class="game-warning-banner">
          ⚠️ ${playerFlag} ${player.name}'s turn — ${otherPlayer.name}, look away!
        </div>

        <div class="lb-turn-card">
          <div class="lb-turn-letter">Letter: <span class="lb-turn-letter-big">${state.currentLetter}</span></div>
          <div class="lb-turn-hint">Target language bonus: ${LANGUAGES[player.targetLang]?.flag || ''} ${LANGUAGES[player.targetLang]?.name || ''}</div>
          
          <div class="lb-category-inputs" id="lb-inputs">
            ${state.categories.map((cat, i) => `
              <div class="lb-input-row">
                <label class="lb-input-label">${cat.label}</label>
                <input type="text" class="game-input lb-cat-input" id="lb-input-${i}"
                       data-index="${i}"
                       autocomplete="off" autocapitalize="off" spellcheck="false"
                       placeholder="${state.currentLetter}..." />
              </div>
            `).join('')}
          </div>

          <button class="btn btn-primary game-btn-ready" id="btn-submit-turn">
            ✅ Done — Submit answers
          </button>
        </div>
      </div>
    `;

    // Focus first input
    document.getElementById('lb-input-0')?.focus();

    // Tab/Enter to move between inputs
    const inputs = document.querySelectorAll('.lb-cat-input');
    inputs.forEach((inp, idx) => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          } else {
            submitTurn();
          }
        }
      });
    });

    // Start timer
    startTimer();

    document.getElementById('btn-submit-turn').addEventListener('click', submitTurn);
  }

  function startTimer() {
    const timerEl = document.getElementById('game-timer');
    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      if (timerEl) {
        timerEl.textContent = state.timerRemaining + 's';
        if (state.timerRemaining <= 10) timerEl.classList.add('timer-critical');
        else if (state.timerRemaining <= 20) timerEl.classList.add('timer-warning');
      }
      if (state.timerRemaining <= 0) {
        clearTimer();
        submitTurn();
      }
    }, 1000);
  }

  function submitTurn() {
    clearTimer();
    if (state.phase !== 'turn') return;

    // Collect answers
    const pi = state.turnIndex;
    state.categories.forEach((_, i) => {
      const inp = document.getElementById(`lb-input-${i}`);
      state.answers[pi][i] = inp ? inp.value.trim() : '';
    });

    if (state.turnIndex === 0) {
      // Player 2's turn next
      state.turnIndex = 1;
      showHandoff();
    } else {
      // Both done — go to review
      showReview();
    }
  }

  // --- Handoff between players ---
  function showHandoff() {
    state.phase = 'handoff';
    const container = getContainer();
    const nextPlayer = state.players[1];
    const nextFlag = LANGUAGES[nextPlayer.nativeLang]?.flag || '';

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-handoff">
          <div class="game-handoff-icon">🔄</div>
          <h2>Pass the laptop to ${nextPlayer.name} ${nextFlag}</h2>
          <p class="game-handoff-instruction">💻 ${nextPlayer.name}, take the laptop. Don't peek at ${state.players[0].name}'s answers!</p>
          <p class="game-handoff-timer">⏱️ ${state.settings.timer} seconds</p>
          <button class="btn btn-primary game-btn-ready" id="btn-next-player">
            ${nextFlag} I'm ${nextPlayer.name} — Go!
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-next-player').addEventListener('click', showTurnScreen);
  }

  // --- Review Screen (players judge each other's answers) ---
  function showReview() {
    state.phase = 'review';
    const container = getContainer();
    const letter = state.currentLetter;
    const p1 = state.players[0];
    const p2 = state.players[1];
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';

    // Pre-judge: answers must start with the correct letter
    for (let pi = 0; pi < 2; pi++) {
      for (let ci = 0; ci < state.categories.length; ci++) {
        const answer = state.answers[pi][ci];
        if (!answer) {
          state.judgments[pi][ci] = false; // empty = invalid
        } else if (answer[0].toUpperCase() !== letter) {
          state.judgments[pi][ci] = false; // wrong letter
        } else {
          state.judgments[pi][ci] = true; // assume valid, players can reject
        }
      }
    }

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="lb-review">
          <h2 class="lb-review-title">📋 Review Answers — Letter "${letter}"</h2>
          <p class="lb-review-subtitle">Tap an answer to mark it ❌ invalid if you disagree. Tap again to restore ✅.</p>

          <div class="lb-review-table">
            <div class="lb-review-header">
              <div class="lb-review-cat-col">Category</div>
              <div class="lb-review-ans-col">${p1Flag} ${p1.name}</div>
              <div class="lb-review-ans-col">${p2Flag} ${p2.name}</div>
            </div>
            ${state.categories.map((cat, ci) => {
              const a1 = state.answers[0][ci] || '—';
              const a2 = state.answers[1][ci] || '—';
              const match = a1.toLowerCase() === a2.toLowerCase() && a1 !== '—';
              return `
                <div class="lb-review-row ${match ? 'lb-review-match' : ''}">
                  <div class="lb-review-cat-col">${cat.emoji} ${cat.id}</div>
                  <div class="lb-review-ans-col">
                    <button class="lb-answer-btn ${!state.answers[0][ci] ? 'lb-answer-empty' : ''}"
                            id="lb-judge-0-${ci}" data-player="0" data-cat="${ci}">
                      ${a1}
                      ${match ? '<span class="lb-match-badge">🔁</span>' : ''}
                    </button>
                  </div>
                  <div class="lb-review-ans-col">
                    <button class="lb-answer-btn ${!state.answers[1][ci] ? 'lb-answer-empty' : ''}"
                            id="lb-judge-1-${ci}" data-player="1" data-cat="${ci}">
                      ${a2}
                      ${match ? '<span class="lb-match-badge">🔁</span>' : ''}
                    </button>
                  </div>
                </div>`;
            }).join('')}
          </div>

          <button class="btn btn-primary game-btn-ready" id="btn-confirm-scores">
            🏆 Confirm & See Scores
          </button>
        </div>
      </div>
    `;

    // Wire up judgment toggles
    document.querySelectorAll('.lb-answer-btn').forEach(btn => {
      const pi = parseInt(btn.dataset.player);
      const ci = parseInt(btn.dataset.cat);
      if (!state.answers[pi][ci]) return; // can't toggle empty
      updateJudgeButton(pi, ci);

      btn.addEventListener('click', () => {
        state.judgments[pi][ci] = !state.judgments[pi][ci];
        updateJudgeButton(pi, ci);
      });
    });

    document.getElementById('btn-confirm-scores').addEventListener('click', showRoundScores);
  }

  function updateJudgeButton(pi, ci) {
    const btn = document.getElementById(`lb-judge-${pi}-${ci}`);
    if (!btn) return;
    if (state.judgments[pi][ci]) {
      btn.classList.remove('lb-answer-rejected');
      btn.classList.add('lb-answer-accepted');
    } else {
      btn.classList.remove('lb-answer-accepted');
      btn.classList.add('lb-answer-rejected');
    }
  }

  // --- Round Scores Screen ---
  function showRoundScores() {
    state.phase = 'scores';
    const container = getContainer();
    const letter = state.currentLetter;

    // Calculate scores for this round
    let roundScores = [0, 0];
    let details = [];

    for (let ci = 0; ci < state.categories.length; ci++) {
      const a0 = state.answers[0][ci];
      const a1 = state.answers[1][ci];
      const v0 = state.judgments[0][ci] && !!a0;
      const v1 = state.judgments[1][ci] && !!a1;
      const match = v0 && v1 && a0.toLowerCase() === a1.toLowerCase();

      let pts0 = 0, pts1 = 0;

      if (v0 && !match) {
        pts0 = 10; // unique valid answer
      } else if (v0 && match) {
        pts0 = 5; // matching answer
      }
      if (v1 && !match) {
        pts1 = 10;
      } else if (v1 && match) {
        pts1 = 5;
      }

      // Target language bonus: +3 if they answered in their target language
      // We detect this by checking if the answer appears in the vocabulary as target lang
      if (v0 && pts0 > 0) {
        if (isTargetLangWord(a0, state.players[0].targetLang, letter)) pts0 += 3;
      }
      if (v1 && pts1 > 0) {
        if (isTargetLangWord(a1, state.players[1].targetLang, letter)) pts1 += 3;
      }

      roundScores[0] += pts0;
      roundScores[1] += pts1;
      details.push({ cat: state.categories[ci], a0, a1, v0, v1, pts0, pts1, match });
    }

    state.players[0].totalScore += roundScores[0];
    state.players[1].totalScore += roundScores[1];

    state.roundHistory.push({
      round: state.currentRound,
      letter,
      categories: state.categories.map(c => c.id),
      scores: [...roundScores],
      details,
    });

    const p1 = state.players[0];
    const p2 = state.players[1];
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="lb-scores">
          <h2 class="lb-scores-title">Round ${state.currentRound} — Letter "${letter}"</h2>

          <div class="lb-scores-table">
            <div class="lb-scores-header">
              <div class="lb-scores-cat-col">Category</div>
              <div class="lb-scores-ans-col">${p1Flag} ${p1.name}</div>
              <div class="lb-scores-ans-col">${p2Flag} ${p2.name}</div>
            </div>
            ${details.map(d => `
              <div class="lb-scores-row">
                <div class="lb-scores-cat-col">${d.cat.emoji} ${d.cat.id}</div>
                <div class="lb-scores-ans-col ${d.v0 ? 'lb-score-valid' : 'lb-score-invalid'}">
                  <span class="lb-score-answer">${d.a0 || '—'}</span>
                  <span class="lb-score-pts ${d.pts0 > 0 ? 'lb-pts-pos' : 'lb-pts-zero'}">${d.v0 ? '+' + d.pts0 : '0'}</span>
                  ${d.match ? '<span class="lb-match-badge">🔁</span>' : ''}
                </div>
                <div class="lb-scores-ans-col ${d.v1 ? 'lb-score-valid' : 'lb-score-invalid'}">
                  <span class="lb-score-answer">${d.a1 || '—'}</span>
                  <span class="lb-score-pts ${d.pts1 > 0 ? 'lb-pts-pos' : 'lb-pts-zero'}">${d.v1 ? '+' + d.pts1 : '0'}</span>
                  ${d.match ? '<span class="lb-match-badge">🔁</span>' : ''}
                </div>
              </div>
            `).join('')}
            <div class="lb-scores-row lb-scores-total">
              <div class="lb-scores-cat-col"><strong>Round total</strong></div>
              <div class="lb-scores-ans-col"><strong>+${roundScores[0]}</strong></div>
              <div class="lb-scores-ans-col"><strong>+${roundScores[1]}</strong></div>
            </div>
          </div>

          <div class="lb-scores-summary">
            ${roundScores[0] > roundScores[1]
              ? `<div class="lb-round-winner">🏆 ${p1.name} wins the round!</div>`
              : roundScores[1] > roundScores[0]
              ? `<div class="lb-round-winner">🏆 ${p2.name} wins the round!</div>`
              : `<div class="lb-round-winner">🤝 It's a tie!</div>`}
          </div>

          <button class="btn btn-primary game-btn-next" id="btn-next-round">
            ${state.currentRound >= state.totalRounds ? '🏆 Final Results' : '➡️ Next Round'}
            <span class="shortcut-hint">[Enter]</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-next-round').addEventListener('click', nextRound);

    // Enter key
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Enter' && state.phase === 'scores') {
        e.preventDefault();
        document.removeEventListener('keydown', handler);
        nextRound();
      }
    });
  }

  function isTargetLangWord(answer, targetLang, letter) {
    // Check if the answer looks like it's in the target language
    // Simple heuristic: check vocabulary list for matches in that language
    const norm = answer.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return VOCABULARY.some(w => {
      const wordVal = (w[targetLang] || '').toLowerCase().trim();
      const alts = wordVal.split(/[/,]/).map(s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
      return alts.some(a => a === norm);
    });
  }

  // --- Summary Screen ---
  function showSummary() {
    state.phase = 'summary';
    const container = getContainer();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const p1Flag = LANGUAGES[p1.nativeLang]?.flag || '';
    const p2Flag = LANGUAGES[p2.nativeLang]?.flag || '';
    const winner = p1.totalScore > p2.totalScore ? p1
                 : p2.totalScore > p1.totalScore ? p2
                 : null;

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-winner-screen">
          ${winner
            ? `<div class="winner-trophy">🏆</div>
               <div class="winner-name">${LANGUAGES[winner.nativeLang]?.flag || ''} ${winner.name} wins!</div>
               <div class="winner-score">${winner.totalScore} points</div>`
            : `<div class="winner-trophy">🤝</div>
               <div class="winner-name">It's a tie!</div>
               <div class="winner-score">${p1.totalScore} points each</div>`
          }

          <div class="summary-final-scores">
            <div class="summary-player">
              <div class="summary-player-name">${p1Flag} ${p1.name}</div>
              <div class="summary-player-score">${p1.totalScore} pts</div>
            </div>
            <div class="summary-player">
              <div class="summary-player-name">${p2Flag} ${p2.name}</div>
              <div class="summary-player-score">${p2.totalScore} pts</div>
            </div>
          </div>

          <div class="lb-summary-rounds">
            <h3>Round Breakdown</h3>
            ${state.roundHistory.map(rh => `
              <div class="lb-summary-round">
                <span class="lb-summary-letter">${rh.letter}</span>
                <span class="lb-summary-round-score">${p1Flag} ${rh.scores[0]} — ${rh.scores[1]} ${p2Flag}</span>
              </div>
            `).join('')}
          </div>

          <div class="game-summary-actions">
            <button class="btn btn-primary" id="btn-play-again">🔄 Play Again</button>
            <button class="btn btn-secondary" id="btn-back-games">← Back to Games</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-play-again').addEventListener('click', show);
    document.getElementById('btn-back-games').addEventListener('click', () => {
      if (typeof App !== 'undefined') App.showGames();
    });
  }

  return { show };
})();
