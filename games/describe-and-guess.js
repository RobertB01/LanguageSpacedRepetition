// Describe & Guess — Two-player language duel game
// Player A (describer) sees a word and must describe it in their TARGET language
// Player B (guesser) must guess the original word
// Roles swap each round. Works on 1 device.

const DescribeAndGuess = (() => {
  // --- Game State ---
  let state = {
    phase: 'setup',       // setup | describer | handoff | guesser | reveal | summary
    players: [
      { name: 'Player 1', nativeLang: 'nl', targetLang: 'es', score: 0, streak: 0, roundsDescribed: 0, roundsGuessed: 0, correctGuesses: 0 },
      { name: 'Player 2', nativeLang: 'es', targetLang: 'nl', score: 0, streak: 0, roundsDescribed: 0, roundsGuessed: 0, correctGuesses: 0 },
    ],
    currentRound: 0,
    totalRounds: 10,
    describerIndex: 0,
    currentWord: null,
    wordPool: [],
    usedWordIds: new Set(),
    roundHistory: [],
    timerSeconds: 60,
    timerRemaining: 60,
    timerInterval: null,
    forbiddenWords: [],
    settings: {
      rounds: 10,
      timer: 60,
      difficulty: 'mixed',
    },
  };

  // --- Helpers ---
  function getContainer() {
    return document.getElementById('main-content');
  }

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
      if (filtered.length === 0) {
        state.usedWordIds.clear();
        filtered = [...VOCABULARY];
      }
      if (state.settings.difficulty === 'easy') {
        filtered = filtered.filter(w => w.type === 'noun' || w.type === 'adjective');
      } else if (state.settings.difficulty === 'hard') {
        // all types
      } else {
        const concrete = filtered.filter(w => ['noun', 'adjective', 'verb', 'phrase'].includes(w.type));
        if (concrete.length >= 10) filtered = concrete;
      }
      state.wordPool = shuffleArray(filtered);
    }
    const word = state.wordPool.pop();
    state.usedWordIds.add(word.id);
    return word;
  }

  function buildForbiddenWords(word, describeLang) {
    // Only show forbidden words in the language the describer must use
    // Plus their native language (so they can't cheat by saying native words)
    const forbidden = new Set();
    const describer = getDescriber();

    // Forbidden in the describe language (target)
    if (word[describeLang]) {
      word[describeLang].split(/[/,]/).forEach(w => {
        const cleaned = w.trim().toLowerCase();
        if (cleaned) forbidden.add(cleaned);
      });
    }
    // Also forbidden in describer's native language
    if (word[describer.nativeLang]) {
      word[describer.nativeLang].split(/[/,]/).forEach(w => {
        const cleaned = w.trim().toLowerCase();
        if (cleaned) forbidden.add(cleaned);
      });
    }
    return [...forbidden];
  }

  function getDescriber() { return state.players[state.describerIndex]; }
  function getGuesser() { return state.players[1 - state.describerIndex]; }

  function startTimer(onTick, onExpire) {
    clearTimer();
    state.timerRemaining = state.settings.timer;
    onTick(state.timerRemaining);
    state.timerInterval = setInterval(() => {
      state.timerRemaining--;
      onTick(state.timerRemaining);
      if (state.timerRemaining <= 0) {
        clearTimer();
        onExpire();
      }
    }, 1000);
  }

  function clearTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  // --- Enter-handler tracking (prevents stale handlers from skipping reveal) ---
  let revealEnterHandler = null;
  function cleanupRevealHandler() {
    if (revealEnterHandler) {
      document.removeEventListener('keydown', revealEnterHandler);
      revealEnterHandler = null;
    }
  }

  // --- Scoreboard HTML (reused across screens) ---
  function scoreboardHTML() {
    const describer = getDescriber();
    const guesser = getGuesser();
    const descrFlag = LANGUAGES[describer.nativeLang]?.flag || '';
    const guesserFlag = LANGUAGES[guesser.nativeLang]?.flag || '';
    return `
      <div class="game-scoreboard">
        <div class="scoreboard-player">
          <span class="scoreboard-flag">${descrFlag}</span>
          <span class="scoreboard-name">${describer.name}</span>
          <span class="scoreboard-pts">${describer.score} pts</span>
        </div>
        <div class="scoreboard-divider">vs</div>
        <div class="scoreboard-player">
          <span class="scoreboard-flag">${guesserFlag}</span>
          <span class="scoreboard-name">${guesser.name}</span>
          <span class="scoreboard-pts">${guesser.score} pts</span>
        </div>
      </div>`;
  }

  // --- Setup Screen ---
  function showSetup() {
    state.phase = 'setup';
    const container = getContainer();

    container.innerHTML = `
      <div class="game-setup fade-in">
        <div class="game-header">
          <h2>🎭 Describe & Guess</h2>
          <p class="game-subtitle">Two players — one screen. Describe the word in your <em>target language</em> without saying it!</p>
        </div>

        <div class="game-setup-form">
          <div class="setup-section">
            <h3>🇳🇱 Player 1 <span class="setup-hint">(learning Spanish)</span></h3>
            <input type="text" id="p1-name" class="game-input" value="${state.players[0].name}" placeholder="Name" />
          </div>

          <div class="setup-vs">VS</div>

          <div class="setup-section">
            <h3>🇪🇸 Player 2 <span class="setup-hint">(learning Dutch)</span></h3>
            <input type="text" id="p2-name" class="game-input" value="${state.players[1].name}" placeholder="Name" />
          </div>

          <div class="setup-options">
            <label class="setup-label">Rounds
              <select id="opt-rounds" class="game-select">
                <option value="5" ${state.settings.rounds === 5 ? 'selected' : ''}>5</option>
                <option value="10" ${state.settings.rounds === 10 ? 'selected' : ''}>10</option>
                <option value="15" ${state.settings.rounds === 15 ? 'selected' : ''}>15</option>
                <option value="20" ${state.settings.rounds === 20 ? 'selected' : ''}>20</option>
              </select>
            </label>
            <label class="setup-label">Timer (sec)
              <select id="opt-timer" class="game-select">
                <option value="30" ${state.settings.timer === 30 ? 'selected' : ''}>30</option>
                <option value="45" ${state.settings.timer === 45 ? 'selected' : ''}>45</option>
                <option value="60" ${state.settings.timer === 60 ? 'selected' : ''}>60</option>
                <option value="90" ${state.settings.timer === 90 ? 'selected' : ''}>90</option>
                <option value="0" ${state.settings.timer === 0 ? 'selected' : ''}>None</option>
              </select>
            </label>
            <label class="setup-label">Difficulty
              <select id="opt-difficulty" class="game-select">
                <option value="easy" ${state.settings.difficulty === 'easy' ? 'selected' : ''}>Easy (nouns & adjectives)</option>
                <option value="mixed" ${state.settings.difficulty === 'mixed' ? 'selected' : ''}>Mixed</option>
                <option value="hard" ${state.settings.difficulty === 'hard' ? 'selected' : ''}>Hard (all word types)</option>
              </select>
            </label>
          </div>

          <button class="btn btn-primary game-btn-start" id="btn-start-game">
            🎮 Start Duel!
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-game').addEventListener('click', () => {
      state.players[0].name = document.getElementById('p1-name').value.trim() || 'Player 1';
      state.players[1].name = document.getElementById('p2-name').value.trim() || 'Player 2';
      state.settings.rounds = parseInt(document.getElementById('opt-rounds').value);
      state.settings.timer = parseInt(document.getElementById('opt-timer').value);
      state.settings.difficulty = document.getElementById('opt-difficulty').value;
      startGame();
    });
  }

  // --- Start Game ---
  function startGame() {
    state.currentRound = 0;
    state.describerIndex = 0;
    state.usedWordIds = new Set();
    state.wordPool = [];
    state.roundHistory = [];
    state.totalRounds = state.settings.rounds;
    for (const p of state.players) {
      p.score = 0;
      p.streak = 0;
      p.correctGuesses = 0;
      p.roundsDescribed = 0;
      p.roundsGuessed = 0;
    }
    nextRound();
  }

  // --- Next Round ---
  function nextRound() {
    if (state.currentRound >= state.totalRounds) {
      showSummary();
      return;
    }
    state.currentRound++;
    state.currentWord = pickWord();
    const describeLang = getDescriber().targetLang;
    state.forbiddenWords = buildForbiddenWords(state.currentWord, describeLang);
    getDescriber().roundsDescribed++;
    getGuesser().roundsGuessed++;
    showTurnAssignment();
  }

  // --- Turn Assignment Screen (shown before each round) ---
  function showTurnAssignment() {
    state.phase = 'turnassign';
    const container = getContainer();
    const describer = getDescriber();
    const guesser = getGuesser();
    const describerFlag = LANGUAGES[describer.nativeLang]?.flag || '';
    const guesserFlag = LANGUAGES[guesser.nativeLang]?.flag || '';

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="game-turn-assignment">
          <h2 class="turn-assign-title">Round ${state.currentRound}</h2>
          <div class="turn-assign-roles">
            <div class="turn-assign-role">
              <div class="turn-assign-icon">🗣️</div>
              <div class="turn-assign-who">${describerFlag} ${describer.name}</div>
              <div class="turn-assign-action">describes</div>
            </div>
            <div class="turn-assign-vs">→</div>
            <div class="turn-assign-role">
              <div class="turn-assign-icon">🤔</div>
              <div class="turn-assign-who">${guesserFlag} ${guesser.name}</div>
              <div class="turn-assign-action">guesses</div>
            </div>
          </div>
          <div class="turn-assign-laptop">
            💻 Pass the laptop to <strong>${describer.name}</strong>
          </div>
          <button class="btn btn-primary game-btn-ready" id="btn-turn-ready">
            👀 ${describer.name} is ready — Show the word
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-turn-ready').addEventListener('click', showDescriberScreen);
  }

  // --- Describer Screen (only the describer should look!) ---
  function showDescriberScreen() {
    state.phase = 'describer';
    const container = getContainer();
    const describer = getDescriber();
    const guesser = getGuesser();
    const word = state.currentWord;
    const targetFlag = LANGUAGES[describer.targetLang]?.flag || '';
    const nativeFlag = LANGUAGES[describer.nativeLang]?.flag || '';
    const describeLang = describer.targetLang;
    const describeLangName = LANGUAGES[describeLang]?.name || describeLang;

    // Main word = describer's target language (what they must describe in)
    // Hints = English + describer's native language (so they know the meaning)
    const mainWord = word[describer.targetLang];
    const nativeWord = word[describer.nativeLang];
    const timerLabel = state.settings.timer > 0 ? `⏱️ ${state.settings.timer}s per round` : '';

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${timerLabel ? `<div class="game-timer-display">${state.settings.timer}s</div>` : ''}
          ${scoreboardHTML()}
        </div>

        <div class="game-warning-banner">
          ⚠️ Only ${describer.name} may look! ${guesser.name}, look away!
        </div>

        <div class="game-describer-card">
          <div class="game-role-label">🗣️ ${describer.name} describes</div>
          
          <div class="game-word-display">
            <div class="game-word-main">${targetFlag} ${mainWord}</div>
            <div class="game-word-hint">🇬🇧 ${word.en}</div>
            <div class="game-word-hint-secondary">${nativeFlag} ${nativeWord}</div>
          </div>

          <div class="game-forbidden">
            <div class="game-forbidden-label">🚫 Forbidden words (don't say these!):</div>
            <div class="game-forbidden-words">
              ${state.forbiddenWords.map(w => `<span class="forbidden-chip">${w}</span>`).join('')}
            </div>
          </div>

          <div class="game-instruction">
            Describe this word in <strong>${targetFlag} ${describeLangName}</strong> without using any forbidden words!
          </div>

          <button class="btn btn-primary game-btn-ready" id="btn-ready">
            ✅ Ready to pass the screen
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-ready').addEventListener('click', showHandoff);
  }

  // --- Handoff Screen ---
  function showHandoff() {
    state.phase = 'handoff';
    clearTimer();
    const container = getContainer();
    const guesser = getGuesser();
    const guesserFlag = LANGUAGES[guesser.nativeLang]?.flag || '';
    const timerLabel = state.settings.timer > 0 ? `<p class="game-handoff-timer">⏱️ ${state.settings.timer} seconds to guess</p>` : '';

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-handoff">
          <div class="game-handoff-icon">🔄</div>
          <h2>Pass the laptop to ${guesser.name} ${guesserFlag}</h2>
          <p class="game-handoff-instruction">💻 ${guesser.name}, take the laptop. ${getDescriber().name} can start describing!</p>
          ${timerLabel}
          <button class="btn btn-primary game-btn-ready" id="btn-guesser-ready">
            ${guesserFlag} I'm ${guesser.name} — Go!
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-guesser-ready').addEventListener('click', showGuesserScreen);
  }

  // --- Guesser Screen ---
  function showGuesserScreen() {
    state.phase = 'guesser';
    const container = getContainer();
    const guesser = getGuesser();
    const describer = getDescriber();
    const describeLang = describer.targetLang;
    const describeLangName = LANGUAGES[describeLang]?.name || describeLang;

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          <div class="game-timer-display" id="game-timer">${state.settings.timer > 0 ? state.settings.timer + 's' : '∞'}</div>
          ${scoreboardHTML()}
        </div>

        <div class="game-guesser-card">
          <div class="game-role-label">🤔 ${guesser.name} guesses</div>
          <p class="game-listen-prompt">${describer.name} is describing a word in <strong>${describeLangName}</strong>. What word is it?</p>
          
          <div class="game-guess-input-area">
            <input type="text" id="guess-input" class="game-input game-guess-input" 
                   autocomplete="off" autocapitalize="off" spellcheck="false" 
                   placeholder="Type your answer..." autofocus />
            <button class="btn btn-primary game-btn-guess" id="btn-submit-guess">
              Guess! <span class="shortcut-hint">[Enter]</span>
            </button>
          </div>

          <div class="game-skip-area">
            <button class="btn btn-secondary game-btn-skip" id="btn-skip">
              ⏭️ Skip
            </button>
          </div>
        </div>
      </div>
    `;

    if (state.settings.timer > 0) {
      const timerEl = document.getElementById('game-timer');
      startTimer(
        (remaining) => {
          timerEl.textContent = remaining + 's';
          if (remaining <= 10) timerEl.classList.add('timer-warning');
          if (remaining <= 5) timerEl.classList.add('timer-critical');
        },
        () => { submitGuess('', true); }
      );
    }

    const input = document.getElementById('guess-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess(input.value);
      }
    });
    setTimeout(() => input.focus(), 150);

    document.getElementById('btn-submit-guess').addEventListener('click', () => {
      submitGuess(input.value);
    });
    document.getElementById('btn-skip').addEventListener('click', () => {
      submitGuess('', true);
    });
  }

  // --- Check Guess ---
  function submitGuess(guessText, skipped = false) {
    clearTimer();
    const word = state.currentWord;
    const guesser = getGuesser();
    const describer = getDescriber();

    let correct = false;
    if (!skipped && guessText.trim()) {
      correct = checkGuessAnswer(guessText, word);
    }

    let guesserPts = 0;
    let describerPts = 0;
    if (correct) {
      guesserPts = 10 + Math.min(guesser.streak, 5) * 2;
      describerPts = 5;
      guesser.score += guesserPts;
      describer.score += describerPts;
      guesser.streak++;
      guesser.correctGuesses++;
    } else {
      guesser.streak = 0;
    }

    state.roundHistory.push({
      word,
      describer: describer.name,
      guesser: guesser.name,
      correct,
      guessText: guessText.trim() || '(skipped)',
      guesserPts,
      describerPts,
    });

    showReveal(correct, guessText, guesserPts, describerPts);
  }

  function checkGuessAnswer(userInput, word) {
    const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const clean = (s) => normalize(s).replace(/\(.*?\)/g, '').replace(/^(el|la|los|las|un|una)\s+/i, '').trim();

    const input = clean(userInput);
    if (!input) return false;

    const esAlternatives = word.es.split(/[/,]/).map(s => s.trim());
    for (const alt of esAlternatives) {
      if (clean(alt) === input || normalize(alt) === normalize(userInput)) return true;
    }

    for (const lang of ['en', 'nl']) {
      const alts = word[lang].split(/[/,]/).map(s => s.trim());
      for (const alt of alts) {
        if (clean(alt) === input || normalize(alt) === normalize(userInput)) return true;
      }
    }

    return false;
  }

  // --- Reveal Screen ---
  function showReveal(correct, guessText, guesserPts, describerPts) {
    cleanupRevealHandler();
    state.phase = 'reveal';
    const container = getContainer();
    const word = state.currentWord;
    const guesser = getGuesser();
    const describer = getDescriber();
    const revealRound = state.currentRound;

    const pointsBreakdown = correct
      ? `<div class="game-points-breakdown">
           <div class="points-earned points-correct">
             <span class="points-who">🤔 ${guesser.name}</span>
             <span class="points-amount">+${guesserPts} pts</span>
             ${guesser.streak >= 2 ? `<span class="points-bonus">(🔥 streak x${guesser.streak})</span>` : ''}
           </div>
           <div class="points-earned points-assist">
             <span class="points-who">🗣️ ${describer.name}</span>
             <span class="points-amount">+${describerPts} pts</span>
             <span class="points-bonus">(great description!)</span>
           </div>
         </div>`
      : `<div class="game-points-breakdown">
           <div class="points-earned points-zero">No points this round</div>
         </div>`;

    const confettiHTML = correct ? `<div class="confetti-container" id="confetti-container"></div>` : '';

    container.innerHTML = `
      <div class="game-screen fade-in">
        ${confettiHTML}
        <div class="game-topbar">
          <div class="game-round">Round ${state.currentRound} / ${state.totalRounds}</div>
          ${scoreboardHTML()}
        </div>

        <div class="game-reveal-card ${correct ? 'reveal-correct' : 'reveal-wrong'}">
          ${correct ? `
            <div class="reveal-celebration">
              <div class="game-reveal-icon reveal-icon-big">🎉</div>
              <div class="game-reveal-verdict reveal-verdict-correct">Correct!</div>
              <div class="reveal-nice-job">Great teamwork!</div>
            </div>
          ` : `
            <div class="reveal-fail">
              <div class="game-reveal-icon">❌</div>
              <div class="game-reveal-verdict reveal-verdict-wrong">Wrong!</div>
              ${guessText.trim() ? `
                <div class="game-reveal-guess">
                  Your answer: <strong>"${guessText}"</strong>
                </div>
              ` : `
                <div class="game-reveal-guess game-reveal-skipped">Skipped / Time's up</div>
              `}
            </div>
          `}

          <div class="game-reveal-answer">
            <div class="reveal-answer-label">🇬🇧 ${word.en}</div>
          </div>

          ${pointsBreakdown}

          ${guesser.streak >= 3 ? `<div class="game-streak-badge">🔥 ${guesser.streak} streak!</div>` : ''}

          <!-- Bonus Translation Challenge (guesser only, answers hidden!) -->
          <div class="bonus-challenge" id="bonus-challenge">
            <div class="bonus-header">🎯 ${guesser.name}, translate for bonus points!</div>
            <div class="bonus-players" id="bonus-players">
              <div class="bonus-player-section" id="bonus-guesser-section">
                <div class="bonus-player-label">${LANGUAGES[guesser.nativeLang]?.flag || ''} ${guesser.name} → translate to ${LANGUAGES[guesser.targetLang]?.name || ''}</div>
                <div class="bonus-input-row">
                  <input type="text" id="bonus-input-guesser" class="game-input bonus-input"
                         autocomplete="off" autocapitalize="off" spellcheck="false"
                         placeholder="Type ${LANGUAGES[guesser.targetLang]?.name || ''} translation..." />
                  <button class="btn btn-primary bonus-check-btn" id="bonus-check-guesser">Check</button>
                </div>
                <div class="bonus-result" id="bonus-result-guesser"></div>
              </div>
            </div>
            <button class="btn btn-secondary bonus-skip-btn" id="bonus-skip">Skip bonus</button>
          </div>

          <!-- Full word reveal (hidden until bonus is done) -->
          <div id="word-reveal-section" style="display:none">
            <div class="game-reveal-word">
              <div class="reveal-word-row">
                <span class="reveal-lang">🇪🇸</span>
                <span class="reveal-text reveal-text-main">${word.es}</span>
                <button class="speak-btn game-speak" id="btn-speak-es" title="Listen">🔊</button>
              </div>
              <div class="reveal-word-row">
                <span class="reveal-lang">🇬🇧</span>
                <span class="reveal-text">${word.en}</span>
              </div>
              <div class="reveal-word-row">
                <span class="reveal-lang">🇳🇱</span>
                <span class="reveal-text">${word.nl}</span>
              </div>
            </div>

            ${word.ex ? `
              <div class="game-reveal-examples">
                <div class="reveal-example">🇪🇸 <em>${word.ex.es}</em></div>
                <div class="reveal-example">🇳🇱 <em>${word.ex.nl}</em></div>
              </div>
            ` : ''}
          </div>

          <!-- Next Round button (hidden until bonus is done) -->
          <button class="btn btn-primary game-btn-next" id="btn-next-round" style="display:none">
            ${state.currentRound >= state.totalRounds ? '🏆 See Results' : '➡️ Next Round'}
            <span class="shortcut-hint">[Enter]</span>
          </button>
        </div>
      </div>
    `;

    // Spawn confetti
    if (correct) spawnConfetti();

    // --- State for bonus & reveal flow ---
    let bonusDone = false;
    let fullRevealShown = false;
    const guesserIndex = state.describerIndex === 0 ? 1 : 0; // capture for bonus

    function showFullReveal() {
      if (fullRevealShown) return;
      fullRevealShown = true;

      // Show full word card
      const revealSection = document.getElementById('word-reveal-section');
      if (revealSection) revealSection.style.display = '';

      // Show next round button
      const btnNext = document.getElementById('btn-next-round');
      if (btnNext) btnNext.style.display = '';

      // Hide skip button
      const skipBtn = document.getElementById('bonus-skip');
      if (skipBtn) skipBtn.style.display = 'none';

      // Disable remaining bonus input
      if (!bonusDone) {
        const inp = document.getElementById('bonus-input-guesser');
        if (inp) inp.disabled = true;
        const btn = document.getElementById('bonus-check-guesser');
        if (btn) btn.disabled = true;
      }

      // Update scoreboard
      const scoreboardEl = document.querySelector('.game-scoreboard');
      if (scoreboardEl) scoreboardEl.outerHTML = scoreboardHTML();

      // Speak Spanish word
      document.getElementById('btn-speak-es')?.addEventListener('click', () => {
        if (typeof TTS !== 'undefined') TTS.speakWord(word.es, 'es', 1.0);
      });
      if (typeof TTS !== 'undefined') {
        setTimeout(() => TTS.speakWord(word.es, 'es', 1.0), 200);
      }

      // Wire next round button
      document.getElementById('btn-next-round')?.addEventListener('click', () => {
        cleanupRevealHandler();
        state.describerIndex = 1 - state.describerIndex;
        nextRound();
      });

      // Enter key for next round (delayed to prevent immediate fire)
      setTimeout(() => {
        cleanupRevealHandler(); // remove any stale handler first
        revealEnterHandler = function(e) {
          if (e.key === 'Enter' && state.phase === 'reveal' && state.currentRound === revealRound) {
            const active = document.activeElement;
            if (active && active.classList.contains('bonus-input')) return;
            e.preventDefault();
            cleanupRevealHandler();
            state.describerIndex = 1 - state.describerIndex;
            nextRound();
          }
        };
        document.addEventListener('keydown', revealEnterHandler);
      }, 300);
    }

    // --- Bonus translation logic (guesser only) ---
    function checkBonusGuesser() {
      const player = state.players[guesserIndex];
      const input = document.getElementById('bonus-input-guesser');
      const resultEl = document.getElementById('bonus-result-guesser');
      const answer = input.value.trim();
      if (!answer) return;

      const targetLang = player.targetLang;
      const correctAnswer = word[targetLang];
      const isCorrect = checkTranslationAnswer(answer, correctAnswer, targetLang);
      const bonusPts = isCorrect ? 5 : 0;

      if (isCorrect) {
        player.score += bonusPts;
        resultEl.innerHTML = `<span class="bonus-correct">✅ Correct! <strong>+${bonusPts} pts</strong></span>`;
        const lastEntry = state.roundHistory[state.roundHistory.length - 1];
        if (!lastEntry.bonusPts) lastEntry.bonusPts = {};
        lastEntry.bonusPts[guesserIndex] = bonusPts;
      } else {
        resultEl.innerHTML = `<span class="bonus-wrong">❌ Not quite — it's <strong>${correctAnswer}</strong></span>`;
      }

      input.disabled = true;
      const checkBtn = document.getElementById('bonus-check-guesser');
      if (checkBtn) checkBtn.disabled = true;
      bonusDone = true;

      // Update scoreboard
      const scoreboardEl = document.querySelector('.game-scoreboard');
      if (scoreboardEl) scoreboardEl.outerHTML = scoreboardHTML();

      // Auto-show full reveal after a brief pause
      setTimeout(() => showFullReveal(), 600);
    }

    document.getElementById('bonus-check-guesser')?.addEventListener('click', () => {
      if (!bonusDone) checkBonusGuesser();
    });

    // Enter key on bonus input
    document.getElementById('bonus-input-guesser')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!bonusDone) checkBonusGuesser();
      }
    });

    // Skip bonus → show full reveal immediately
    document.getElementById('bonus-skip')?.addEventListener('click', () => {
      showFullReveal();
    });
  }

  function checkTranslationAnswer(userInput, correctWord, lang) {
    const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const clean = (s) => {
      let c = normalize(s).replace(/\(.*?\)/g, '').trim();
      if (lang === 'es') c = c.replace(/^(el|la|los|las|un|una)\s+/i, '').trim();
      if (lang === 'nl') c = c.replace(/^(de|het|een)\s+/i, '').trim();
      if (lang === 'en') c = c.replace(/^(the|a|an|to)\s+/i, '').trim();
      return c;
    };
    const input = clean(userInput);
    if (!input) return false;
    const alternatives = correctWord.split(/[/,]/).map(s => s.trim());
    return alternatives.some(alt => clean(alt) === input || normalize(alt) === normalize(userInput));
  }

  function spawnConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#7c4dff', '#3da34d', '#e8a84a', '#e05252', '#00bcd4', '#ff6b35', '#f7c948'];
    const shapes = ['●', '■', '▲', '★', '♦'];
    for (let i = 0; i < 40; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animationDelay = Math.random() * 0.8 + 's';
      particle.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      particle.style.fontSize = (10 + Math.random() * 14) + 'px';
      container.appendChild(particle);
    }
    // Clean up after animation
    setTimeout(() => { if (container) container.innerHTML = ''; }, 3500);
  }

  // --- Winner / Summary Screen ---
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
    const winnerFlag = winner ? LANGUAGES[winner.nativeLang]?.flag || '' : '';

    const historyHTML = state.roundHistory.map((r, i) => `
      <div class="summary-round-item ${r.correct ? 'summary-correct' : 'summary-wrong'}">
        <span class="summary-round-num">${i + 1}</span>
        <span class="summary-round-word">🇪🇸 ${r.word.es} — 🇬🇧 ${r.word.en}</span>
        <span class="summary-round-result">${r.correct ? '✅' : '❌'} ${r.guessText}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="game-screen fade-in">
        <div class="game-winner-screen">
          ${isDraw ? `
            <div class="winner-trophy">🤝</div>
            <h2 class="winner-title">It's a Draw!</h2>
            <p class="winner-subtitle">Both players scored <strong>${p1.score} pts</strong> — evenly matched!</p>
          ` : `
            <div class="winner-trophy">🏆</div>
            <h2 class="winner-title">${winner.name} Wins!</h2>
            <p class="winner-subtitle">Victory by <strong>${margin} pts</strong> — well played!</p>
            <div class="winner-crown">
              <span class="winner-crown-flag">${winnerFlag}</span>
              <span class="winner-crown-name">${winner.name}</span>
            </div>
          `}

          <div class="game-final-scores">
            <div class="final-score-card ${p1.score >= p2.score ? 'final-score-winner' : 'final-score-loser'}">
              <div class="final-score-flag">${p1Flag}</div>
              <div class="final-score-name">${p1.name}</div>
              <div class="final-score-number">${p1.score}</div>
              <div class="final-score-label">points</div>
              <div class="final-score-detail">${p1.correctGuesses}/${p1.roundsGuessed} correct guesses</div>
              <div class="final-score-detail">Best streak: ${getBestStreak(p1.name)}</div>
            </div>
            <div class="final-score-vs">VS</div>
            <div class="final-score-card ${p2.score >= p1.score ? 'final-score-winner' : 'final-score-loser'}">
              <div class="final-score-flag">${p2Flag}</div>
              <div class="final-score-name">${p2.name}</div>
              <div class="final-score-number">${p2.score}</div>
              <div class="final-score-label">points</div>
              <div class="final-score-detail">${p2.correctGuesses}/${p2.roundsGuessed} correct guesses</div>
              <div class="final-score-detail">Best streak: ${getBestStreak(p2.name)}</div>
            </div>
          </div>

          <div class="game-summary-history">
            <h3>All Rounds</h3>
            ${historyHTML}
          </div>

          <div class="game-summary-actions">
            <button class="btn btn-primary game-btn-rematch" id="btn-rematch">🔄 Rematch!</button>
            <button class="btn btn-secondary" id="btn-back-setup">⚙️ Settings</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-rematch').addEventListener('click', startGame);
    document.getElementById('btn-back-setup').addEventListener('click', showSetup);
  }

  function getBestStreak(playerName) {
    let best = 0, current = 0;
    for (const r of state.roundHistory) {
      if (r.guesser === playerName) {
        if (r.correct) { current++; best = Math.max(best, current); }
        else { current = 0; }
      }
    }
    return best > 0 ? '🔥 ' + best : '—';
  }

  // --- Public API ---
  return {
    show: showSetup,
    getState: () => state,
  };
})();
