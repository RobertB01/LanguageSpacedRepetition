// Conjugation Battle — Two-player verb conjugation showdown
// Players alternate: given a verb + tense + subject, type the correct conjugation.
// Points based on speed. Uses the CONJUGATIONS module.

const ConjugationBattle = (() => {
  const TENSES = [
    { key: 'presente', name: 'Presente', fn: 'conjugate' },
    { key: 'preterito', name: 'Pretérito', fn: 'conjugatePreterite' },
    { key: 'imperfecto', name: 'Imperfecto', fn: 'conjugateImperfect' },
    { key: 'futuro', name: 'Futuro', fn: 'conjugateFuture' },
  ];

  let state = {
    phase: 'setup', // setup | turn | feedback | summary
    players: [
      { name: 'Player 1', score: 0, correctCount: 0, wrongCount: 0, totalTime: 0 },
      { name: 'Player 2', score: 0, correctCount: 0, wrongCount: 0, totalTime: 0 },
    ],
    activePlayerIndex: 0,
    currentRound: 0,
    totalRounds: 10,
    currentVerb: null,
    currentTense: null,
    currentSubjectIndex: 0, // index into CONJUGATIONS.SUBJECTS
    correctAnswer: '',
    verbPool: [],
    usedCombos: new Set(),
    roundHistory: [],
    turnStartTime: 0,
    timerRemaining: 20,
    timerInterval: null,
    settings: {
      rounds: 10,
      turnTime: 20,
      tenses: ['presente'],
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

  function clearTimer() {
    if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  }

  function getActivePlayer() { return state.players[state.activePlayerIndex]; }

  function calcPoints(seconds) {
    if (seconds < 3) return 10;
    if (seconds < 5) return 8;
    if (seconds < 8) return 6;
    if (seconds < 12) return 4;
    return 2;
  }

  function pickChallenge() {
    // Get all verbs from the conjugation engine
    if (state.verbPool.length === 0) {
      state.verbPool = shuffleArray(CONJUGATIONS.getAllVerbs());
    }

    const activeTenses = TENSES.filter(t => state.settings.tenses.includes(t.key));
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (state.verbPool.length === 0) {
        state.verbPool = shuffleArray(CONJUGATIONS.getAllVerbs());
        state.usedCombos.clear();
      }

      const verbId = state.verbPool[state.verbPool.length - 1];
      const tense = activeTenses[Math.floor(Math.random() * activeTenses.length)];
      // Pick a random subject (0-5: yo, tú, él/ella, nosotros, vosotros, ellos/ellas)
      const subjectIndex = Math.floor(Math.random() * 6);

      const comboKey = `${verbId}-${tense.key}-${subjectIndex}`;
      if (state.usedCombos.has(comboKey)) {
        state.verbPool.pop();
        continue;
      }

      // Try to conjugate
      const result = CONJUGATIONS[tense.fn](verbId);
      if (!result || !result.forms || !result.forms[subjectIndex]) {
        state.verbPool.pop();
        continue;
      }

      state.usedCombos.add(comboKey);
      state.verbPool.pop();

      const word = VOCABULARY.find(w => w.id === verbId);
      const infinitive = result.infinitive || (word ? word.es.split('/')[0].trim() : '?');

      return {
        verbId,
        infinitive,
        word,
        tense,
        subjectIndex,
        subject: CONJUGATIONS.SUBJECTS[subjectIndex],
        correctForm: result.forms[subjectIndex],
        isReflexive: result.isReflexive || false,
        allForms: result.forms,
      };
    }

    // Fallback: reset and pick any
    state.usedCombos.clear();
    state.verbPool = shuffleArray(CONJUGATIONS.getAllVerbs());
    return pickChallenge();
  }

  function normalize(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

  function checkConjugation(userInput, correctForm, isReflexive, subjectIndex) {
    const input = normalize(userInput);
    if (!input) return false;

    // Correct answer might be just the form, or with reflexive pronoun
    const normalizedCorrect = normalize(correctForm);
    if (input === normalizedCorrect) return true;

    // Also accept with reflexive pronoun prepended
    if (isReflexive) {
      const pronouns = CONJUGATIONS.REFL_PRONOUNS;
      const withPronoun = normalize(pronouns[subjectIndex] + ' ' + correctForm);
      if (input === withPronoun) return true;
      // Accept without pronoun too
      const withoutPronoun = normalize(correctForm);
      if (input === withoutPronoun) return true;
    }

    // Accept accented form matching
    if (input === normalize(correctForm)) return true;

    return false;
  }

  function scoreboardHTML() {
    const p1 = state.players[0];
    const p2 = state.players[1];
    const active = state.activePlayerIndex;
    return `
      <div class="game-scoreboard">
        <div class="scoreboard-player ${active === 0 ? 'scoreboard-active' : ''}">
          <span class="scoreboard-name">${p1.name}</span>
          <span class="scoreboard-pts">${p1.score} pts</span>
        </div>
        <div class="scoreboard-divider">vs</div>
        <div class="scoreboard-player ${active === 1 ? 'scoreboard-active' : ''}">
          <span class="scoreboard-name">${p2.name}</span>
          <span class="scoreboard-pts">${p2.score} pts</span>
        </div>
      </div>`;
  }

  // --- Setup ---
  function showSetup() {
    state.phase = 'setup';
    const container = getContainer();

    const tenseCheckboxes = TENSES.map(t => `
      <label class="cb-tense-label">
        <input type="checkbox" class="cb-tense-check" value="${t.key}"
               ${state.settings.tenses.includes(t.key) ? 'checked' : ''} />
        ${t.name}
      </label>
    `).join('');

    container.innerHTML = `
      <div class="game-setup fade-in">
        <div class="game-header">
          <h2>⚔️ Conjugation Battle</h2>
          <p class="game-subtitle">Take turns conjugating Spanish verbs. Speed counts!</p>
        </div>
        <div class="game-setup-form">
          <div class="setup-section">
            <h3>Player 1</h3>
            <input type="text" id="cb-p1-name" class="game-input" value="${state.players[0].name}" placeholder="Name" />
          </div>
          <div class="setup-vs">VS</div>
          <div class="setup-section">
            <h3>Player 2</h3>
            <input type="text" id="cb-p2-name" class="game-input" value="${state.players[1].name}" placeholder="Name" />
          </div>
          <div class="setup-options">
            <label class="setup-label">Rounds (each)
              <select id="cb-rounds" class="game-select">
                <option value="5" ${state.settings.rounds === 5 ? 'selected' : ''}>5</option>
                <option value="10" ${state.settings.rounds === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${state.settings.rounds === 15 ? 'selected' : ''}>15</option>
              </select>
            </label>
            <label class="setup-label">Time per turn
              <select id="cb-time" class="game-select">
                <option value="15" ${state.settings.turnTime === 15 ? 'selected' : ''}>15s</option>
                <option value="20" ${state.settings.turnTime === 20 ? 'selected' : ''}>20s</option>
                <option value="30" ${state.settings.turnTime === 30 ? 'selected' : ''}>30s</option>
              </select>
            </label>
          </div>
          <div class="cb-tense-picker">
            <label class="setup-label">Tenses to include</label>
            <div class="cb-tense-options">${tenseCheckboxes}</div>
          </div>
          <button class="btn btn-primary game-btn-start" id="cb-btn-start">⚔️ Start Battle!</button>
        </div>
      </div>`;

    document.getElementById('cb-btn-start').addEventListener('click', () => {
      state.players[0].name = document.getElementById('cb-p1-name').value.trim() || 'Player 1';
      state.players[1].name = document.getElementById('cb-p2-name').value.trim() || 'Player 2';
      state.settings.rounds = parseInt(document.getElementById('cb-rounds').value);
      state.settings.turnTime = parseInt(document.getElementById('cb-time').value);

      const checked = [...document.querySelectorAll('.cb-tense-check:checked')].map(el => el.value);
      state.settings.tenses = checked.length > 0 ? checked : ['presente'];

      startGame();
    });
  }

  function startGame() {
    state.currentRound = 0;
    state.activePlayerIndex = 0;
    state.verbPool = [];
    state.usedCombos = new Set();
    state.roundHistory = [];
    state.totalRounds = state.settings.rounds * 2;
    for (const p of state.players) {
      p.score = 0; p.correctCount = 0; p.wrongCount = 0; p.totalTime = 0;
    }
    nextTurn();
  }

  function nextTurn() {
    if (state.currentRound >= state.totalRounds) { showSummary(); return; }
    state.currentRound++;
    state.activePlayerIndex = (state.currentRound - 1) % 2;

    const challenge = pickChallenge();
    state.currentVerb = challenge;
    state.currentTense = challenge.tense;
    state.currentSubjectIndex = challenge.subjectIndex;
    state.correctAnswer = challenge.correctForm;

    showHandoff();
  }

  // --- Handoff ---
  function showHandoff() {
    const container = getContainer();
    const player = getActivePlayer();
    const turnNum = Math.ceil(state.currentRound / 2);

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Turn ${turnNum} / ${state.settings.rounds}</div>
          ${scoreboardHTML()}
        </div>
        <div class="game-handoff">
          <div class="game-handoff-icon">⚔️</div>
          <h2>${player.name}'s Turn</h2>
          <p class="game-handoff-instruction">Conjugate the verb — be fast!</p>
          <button class="btn btn-primary game-btn-ready" id="cb-btn-go">Ready!</button>
        </div>
      </div>`;

    document.getElementById('cb-btn-go').addEventListener('click', showTurn);
  }

  // --- Active turn ---
  function showTurn() {
    state.phase = 'turn';
    clearTimer();
    const container = getContainer();
    const player = getActivePlayer();
    const v = state.currentVerb;
    const turnNum = Math.ceil(state.currentRound / 2);

    // Build the subject display
    const subjectDisplay = v.subject;
    // Build meaning hint
    const meaning = v.word ? `${v.word.en} / ${v.word.nl}` : '';

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Turn ${turnNum} / ${state.settings.rounds}</div>
          <div class="game-timer-display" id="cb-timer">${state.settings.turnTime}s</div>
          ${scoreboardHTML()}
        </div>

        <div class="cb-challenge-card">
          <div class="cb-player-label">${player.name}</div>
          <div class="cb-verb-infinitive">${v.infinitive}</div>
          ${meaning ? `<div class="cb-verb-meaning">${meaning}</div>` : ''}
          <div class="cb-tense-badge">${v.tense.name}</div>
          <div class="cb-subject">${subjectDisplay}</div>
          ${v.isReflexive ? '<div class="cb-reflexive-hint">reflexive verb</div>' : ''}

          <div class="cb-answer-area">
            <input type="text" id="cb-answer" class="game-input cb-answer-input"
                   autocomplete="off" autocapitalize="off" spellcheck="false"
                   placeholder="Type the conjugation..." autofocus />
            <button class="btn btn-primary cb-answer-btn" id="cb-btn-submit">Submit <span class="shortcut-hint">[Enter]</span></button>
          </div>
        </div>
      </div>`;

    state.turnStartTime = Date.now();
    state.timerRemaining = state.settings.turnTime;

    const timerEl = document.getElementById('cb-timer');
    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      timerEl.textContent = state.timerRemaining + 's';
      if (state.timerRemaining <= 5) timerEl.classList.add('timer-warning');
      if (state.timerRemaining <= 3) timerEl.classList.add('timer-critical');
      if (state.timerRemaining <= 0) {
        clearTimer();
        submitAnswer('', true);
      }
    }, 1000);

    const input = document.getElementById('cb-answer');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitAnswer(input.value); }
    });
    document.getElementById('cb-btn-submit').addEventListener('click', () => submitAnswer(input.value));
    setTimeout(() => input.focus(), 100);
  }

  function submitAnswer(answer, timedOut = false) {
    clearTimer();
    const player = getActivePlayer();
    const v = state.currentVerb;
    const elapsed = (Date.now() - state.turnStartTime) / 1000;

    let correct = false;
    let points = 0;
    if (!timedOut && answer.trim()) {
      correct = checkConjugation(answer, state.correctAnswer, v.isReflexive, state.currentSubjectIndex);
    }

    if (correct) {
      points = calcPoints(elapsed);
      player.score += points;
      player.correctCount++;
      player.totalTime += elapsed;
    } else {
      player.wrongCount++;
    }

    // Build the full conjugation table for display
    const allFormsHTML = v.allForms.map((form, i) => {
      const isTarget = (i === state.currentSubjectIndex);
      const subj = CONJUGATIONS.SUBJECTS[i];
      const prefix = v.isReflexive ? CONJUGATIONS.REFL_PRONOUNS[i] + ' ' : '';
      return `<span class="cb-conj-form ${isTarget ? 'cb-conj-highlight' : ''}">${subj} → ${prefix}${form}</span>`;
    }).join('');

    state.roundHistory.push({
      player: player.name,
      playerIndex: state.activePlayerIndex,
      verb: v.infinitive,
      tense: v.tense.name,
      subject: v.subject,
      correctForm: state.correctAnswer,
      answer: answer.trim() || (timedOut ? '(time\'s up)' : '(empty)'),
      correct,
      points,
      time: correct ? elapsed : null,
    });

    showFeedback(correct, points, elapsed, answer, timedOut, allFormsHTML);
  }

  function showFeedback(correct, points, elapsed, answer, timedOut, allFormsHTML) {
    state.phase = 'feedback';
    const container = getContainer();
    const v = state.currentVerb;
    const prefix = v.isReflexive ? CONJUGATIONS.REFL_PRONOUNS[state.currentSubjectIndex] + ' ' : '';
    const fullCorrectAnswer = prefix + state.correctAnswer;

    let speedLabel = '';
    if (correct) {
      if (elapsed < 3) speedLabel = '⚡ Lightning!';
      else if (elapsed < 5) speedLabel = '🔥 Quick!';
      else if (elapsed < 8) speedLabel = '👍 Solid';
      else speedLabel = '🐢 Made it';
    }

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Turn ${Math.ceil(state.currentRound / 2)} / ${state.settings.rounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="cb-feedback-card ${correct ? 'cb-feedback-correct' : 'cb-feedback-wrong'}">
          ${correct ? `
            <div class="cb-feedback-icon">🎉</div>
            <div class="cb-feedback-verdict cb-verdict-correct">Correct!</div>
            <div class="cb-feedback-points">+${points} pts</div>
            <div class="cb-feedback-speed">${speedLabel} (${elapsed.toFixed(1)}s)</div>
          ` : `
            <div class="cb-feedback-icon">❌</div>
            <div class="cb-feedback-verdict cb-verdict-wrong">${timedOut ? 'Time\'s Up!' : 'Wrong!'}</div>
            ${answer.trim() ? `<div class="cb-feedback-answer">Your answer: "${answer}"</div>` : ''}
          `}

          <div class="cb-correct-display">
            <div class="cb-correct-label">${v.subject} (${v.tense.name}) of <strong>${v.infinitive}</strong>:</div>
            <div class="cb-correct-form">${fullCorrectAnswer}</div>
          </div>

          <div class="cb-all-forms">
            <div class="cb-all-forms-label">Full conjugation:</div>
            <div class="cb-forms-grid">${allFormsHTML}</div>
          </div>

          <button class="btn btn-primary game-btn-next" id="cb-btn-next">
            ${state.currentRound >= state.totalRounds ? '🏆 See Results' : '➡️ Next Turn'}
            <span class="shortcut-hint">[Enter]</span>
          </button>
        </div>
      </div>`;

    document.getElementById('cb-btn-next').addEventListener('click', () => nextTurn());
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

    function avgTime(p) {
      return p.correctCount > 0 ? (p.totalTime / p.correctCount).toFixed(1) + 's' : '—';
    }

    const historyHTML = state.roundHistory.map((r, i) => `
      <div class="summary-round-item ${r.correct ? 'summary-correct' : 'summary-wrong'}">
        <span class="summary-round-num">${i + 1}</span>
        <span>${r.player}</span>
        <span class="summary-round-word">${r.verb} · ${r.subject} · ${r.tense}</span>
        <span>${r.correct ? '✅ +' + r.points : '❌ 0'}</span>
      </div>
    `).join('');

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
              <span class="winner-crown-name">${winner.name}</span>
            </div>
          `}

          <div class="game-final-scores">
            <div class="final-score-card ${p1.score >= p2.score ? 'final-score-winner' : 'final-score-loser'}">
              <div class="final-score-name">${p1.name}</div>
              <div class="final-score-number">${p1.score}</div>
              <div class="final-score-label">points</div>
              <div class="final-score-detail">${p1.correctCount}/${state.settings.rounds} correct</div>
              <div class="final-score-detail">Avg time: ${avgTime(p1)}</div>
            </div>
            <div class="final-score-vs">VS</div>
            <div class="final-score-card ${p2.score >= p1.score ? 'final-score-winner' : 'final-score-loser'}">
              <div class="final-score-name">${p2.name}</div>
              <div class="final-score-number">${p2.score}</div>
              <div class="final-score-label">points</div>
              <div class="final-score-detail">${p2.correctCount}/${state.settings.rounds} correct</div>
              <div class="final-score-detail">Avg time: ${avgTime(p2)}</div>
            </div>
          </div>

          <div class="game-summary-history">
            <h3>Battle History</h3>
            ${historyHTML}
          </div>

          <div class="game-summary-actions">
            <button class="btn btn-primary game-btn-rematch" id="cb-btn-rematch">🔄 Rematch!</button>
            <button class="btn btn-secondary" id="cb-btn-setup">⚙️ Settings</button>
          </div>
        </div>
      </div>`;

    document.getElementById('cb-btn-rematch').addEventListener('click', startGame);
    document.getElementById('cb-btn-setup').addEventListener('click', showSetup);
  }

  return { show: showSetup, getState: () => state };
})();
