// Guess Who? — Spanish Language Learning Game (¿Quién es?)
// Players ask yes/no questions in Spanish to identify the mystery character
// Great for practicing descriptive adjectives, colors, and question formation

const GuessWho = (() => {

  // Character pool with visual traits described in Spanish
  const CHARACTERS = [
    { id: 1,  name: 'María',    hair: 'negro',    hairLen: 'largo',  eyes: 'marrón', hat: false, glasses: false, beard: false, earrings: true,  gender: 'f', emoji: '👩‍🦱' },
    { id: 2,  name: 'Carlos',   hair: 'rubio',    hairLen: 'corto',  eyes: 'azul',   hat: true,  glasses: false, beard: true,  earrings: false, gender: 'm', emoji: '👨' },
    { id: 3,  name: 'Lucía',    hair: 'rojo',     hairLen: 'largo',  eyes: 'verde',  hat: false, glasses: true,  beard: false, earrings: true,  gender: 'f', emoji: '👩‍🦰' },
    { id: 4,  name: 'Pedro',    hair: 'marrón',   hairLen: 'corto',  eyes: 'marrón', hat: false, glasses: true,  beard: false, earrings: false, gender: 'm', emoji: '👨‍🦱' },
    { id: 5,  name: 'Ana',      hair: 'rubio',    hairLen: 'corto',  eyes: 'azul',   hat: true,  glasses: false, beard: false, earrings: false, gender: 'f', emoji: '👱‍♀️' },
    { id: 6,  name: 'Diego',    hair: 'negro',    hairLen: 'corto',  eyes: 'marrón', hat: false, glasses: false, beard: true,  earrings: false, gender: 'm', emoji: '👨‍🦳' },
    { id: 7,  name: 'Sofia',    hair: 'marrón',   hairLen: 'largo',  eyes: 'verde',  hat: false, glasses: false, beard: false, earrings: true,  gender: 'f', emoji: '👩' },
    { id: 8,  name: 'Miguel',   hair: 'negro',    hairLen: 'corto',  eyes: 'azul',   hat: true,  glasses: true,  beard: false, earrings: false, gender: 'm', emoji: '🧑' },
    { id: 9,  name: 'Elena',    hair: 'rojo',     hairLen: 'corto',  eyes: 'marrón', hat: false, glasses: true,  beard: false, earrings: false, gender: 'f', emoji: '👩‍🦰' },
    { id: 10, name: 'Pablo',    hair: 'rubio',    hairLen: 'corto',  eyes: 'verde',  hat: false, glasses: false, beard: true,  earrings: false, gender: 'm', emoji: '👱‍♂️' },
    { id: 11, name: 'Carmen',   hair: 'negro',    hairLen: 'largo',  eyes: 'marrón', hat: true,  glasses: false, beard: false, earrings: true,  gender: 'f', emoji: '👩‍🦱' },
    { id: 12, name: 'Javier',   hair: 'marrón',   hairLen: 'corto',  eyes: 'azul',   hat: false, glasses: false, beard: false, earrings: false, gender: 'm', emoji: '👦' },
    { id: 13, name: 'Isabel',   hair: 'rubio',    hairLen: 'largo',  eyes: 'verde',  hat: false, glasses: true,  beard: false, earrings: true,  gender: 'f', emoji: '👱‍♀️' },
    { id: 14, name: 'Andrés',   hair: 'negro',    hairLen: 'corto',  eyes: 'marrón', hat: false, glasses: true,  beard: true,  earrings: false, gender: 'm', emoji: '🧔' },
    { id: 15, name: 'Rosa',     hair: 'marrón',   hairLen: 'corto',  eyes: 'azul',   hat: true,  glasses: false, beard: false, earrings: false, gender: 'f', emoji: '👩‍🦱' },
    { id: 16, name: 'Fernando', hair: 'rubio',    hairLen: 'corto',  eyes: 'marrón', hat: false, glasses: false, beard: false, earrings: false, gender: 'm', emoji: '👨‍🦳' },
    { id: 17, name: 'Laura',    hair: 'negro',    hairLen: 'largo',  eyes: 'verde',  hat: false, glasses: false, beard: false, earrings: false, gender: 'f', emoji: '👩' },
    { id: 18, name: 'Tomás',    hair: 'rojo',     hairLen: 'corto',  eyes: 'azul',   hat: true,  glasses: false, beard: true,  earrings: false, gender: 'm', emoji: '👨‍🦰' },
    { id: 19, name: 'Patricia', hair: 'marrón',   hairLen: 'largo',  eyes: 'marrón', hat: false, glasses: true,  beard: false, earrings: true,  gender: 'f', emoji: '👩‍🦱' },
    { id: 20, name: 'Luis',     hair: 'negro',    hairLen: 'corto',  eyes: 'verde',  hat: false, glasses: true,  beard: false, earrings: false, gender: 'm', emoji: '🧑' },
    { id: 21, name: 'Marta',    hair: 'rojo',     hairLen: 'largo',  eyes: 'azul',   hat: true,  glasses: false, beard: false, earrings: true,  gender: 'f', emoji: '👩‍🦰' },
    { id: 22, name: 'Roberto',  hair: 'marrón',   hairLen: 'corto',  eyes: 'marrón', hat: false, glasses: false, beard: true,  earrings: false, gender: 'm', emoji: '👨' },
    { id: 23, name: 'Inés',     hair: 'negro',    hairLen: 'largo',  eyes: 'azul',   hat: false, glasses: true,  beard: false, earrings: true,  gender: 'f', emoji: '👩' },
    { id: 24, name: 'Raúl',     hair: 'rubio',    hairLen: 'corto',  eyes: 'verde',  hat: true,  glasses: true,  beard: false, earrings: false, gender: 'm', emoji: '👱‍♂️' },
  ];

  // Trait vocabulary with Spanish question templates
  const TRAITS = {
    gender_m:   { question: '¿Es hombre?',                       check: c => c.gender === 'm',          hint: 'Is it a man?' },
    gender_f:   { question: '¿Es mujer?',                        check: c => c.gender === 'f',          hint: 'Is it a woman?' },
    hair_negro: { question: '¿Tiene el pelo negro?',             check: c => c.hair === 'negro',        hint: 'Black hair?' },
    hair_rubio: { question: '¿Tiene el pelo rubio?',             check: c => c.hair === 'rubio',        hint: 'Blonde hair?' },
    hair_rojo:  { question: '¿Tiene el pelo rojo?',              check: c => c.hair === 'rojo',         hint: 'Red hair?' },
    hair_brown: { question: '¿Tiene el pelo marrón?',            check: c => c.hair === 'marrón',       hint: 'Brown hair?' },
    hair_long:  { question: '¿Tiene el pelo largo?',             check: c => c.hairLen === 'largo',     hint: 'Long hair?' },
    hair_short: { question: '¿Tiene el pelo corto?',             check: c => c.hairLen === 'corto',     hint: 'Short hair?' },
    eyes_blue:  { question: '¿Tiene los ojos azules?',           check: c => c.eyes === 'azul',         hint: 'Blue eyes?' },
    eyes_green: { question: '¿Tiene los ojos verdes?',           check: c => c.eyes === 'verde',        hint: 'Green eyes?' },
    eyes_brown: { question: '¿Tiene los ojos marrones?',         check: c => c.eyes === 'marrón',       hint: 'Brown eyes?' },
    hat:        { question: '¿Lleva sombrero?',                  check: c => c.hat,                     hint: 'Wearing a hat?' },
    glasses:    { question: '¿Lleva gafas?',                     check: c => c.glasses,                 hint: 'Wearing glasses?' },
    beard:      { question: '¿Tiene barba?',                     check: c => c.beard,                   hint: 'Has a beard?' },
    earrings:   { question: '¿Lleva pendientes?',                check: c => c.earrings,                hint: 'Wearing earrings?' },
  };

  // Hair color display map
  const HAIR_COLORS = {
    negro: '#2d2d2d', rubio: '#f0d060', rojo: '#d44', marrón: '#8B4513',
  };

  const EYE_COLORS = {
    azul: '#4488cc', verde: '#44aa55', marrón: '#8B5E3C',
  };

  // Game state
  let secret = null;
  let eliminated = new Set();
  let questionLog = [];
  let questionsAsked = 0;
  let gameOver = false;

  function startGame() {
    secret = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    eliminated = new Set();
    questionLog = [];
    questionsAsked = 0;
    gameOver = false;
    render();
  }

  function askQuestion(traitKey) {
    if (gameOver) return;
    const trait = TRAITS[traitKey];
    if (!trait) return;

    const answer = trait.check(secret);
    questionsAsked++;

    questionLog.push({
      question: trait.question,
      hint: trait.hint,
      answer,
    });

    // Eliminate non-matching characters
    for (const c of CHARACTERS) {
      if (eliminated.has(c.id)) continue;
      const matches = trait.check(c);
      if (matches !== answer) {
        eliminated.add(c.id);
      }
    }

    render();
  }

  function makeGuess(charId) {
    if (gameOver) return;
    questionsAsked++;

    if (charId === secret.id) {
      gameOver = true;
      questionLog.push({
        question: `¡Es ${secret.name}!`,
        hint: `Guessed: ${secret.name}`,
        answer: true,
      });
    } else {
      const wrongChar = CHARACTERS.find(c => c.id === charId);
      eliminated.add(charId);
      questionLog.push({
        question: `¿Es ${wrongChar.name}?`,
        hint: `Wrong guess: ${wrongChar.name}`,
        answer: false,
      });
    }
    render();
  }

  function buildCharacterCard(c) {
    const isEliminated = eliminated.has(c.id);
    const hairColor = HAIR_COLORS[c.hair] || '#666';
    const eyeColor = EYE_COLORS[c.eyes] || '#666';

    // Build trait icons
    let traitIcons = '';
    if (c.hat) traitIcons += '<span class="gw-trait-icon" title="sombrero">🎩</span>';
    if (c.glasses) traitIcons += '<span class="gw-trait-icon" title="gafas">👓</span>';
    if (c.beard) traitIcons += '<span class="gw-trait-icon" title="barba">🧔</span>';
    if (c.earrings) traitIcons += '<span class="gw-trait-icon" title="pendientes">💎</span>';

    return `
      <div class="gw-card ${isEliminated ? 'gw-eliminated' : ''}" data-id="${c.id}">
        <div class="gw-card-inner">
          <div class="gw-avatar">
            <span class="gw-emoji">${c.emoji}</span>
            <div class="gw-hair-dot" style="background:${hairColor}" title="pelo ${c.hair}"></div>
            <div class="gw-eye-dot" style="background:${eyeColor}" title="ojos ${c.eyes}"></div>
          </div>
          <div class="gw-name">${c.name}</div>
          <div class="gw-traits">${traitIcons}</div>
        </div>
      </div>`;
  }

  function buildVocabPanel() {
    return `
      <div class="gw-vocab-panel">
        <h4>📖 Vocabulario útil</h4>
        <div class="gw-vocab-grid">
          <div class="gw-vocab-item"><strong>pelo</strong> = hair</div>
          <div class="gw-vocab-item"><strong>ojos</strong> = eyes</div>
          <div class="gw-vocab-item"><strong>negro</strong> = black</div>
          <div class="gw-vocab-item"><strong>rubio</strong> = blonde</div>
          <div class="gw-vocab-item"><strong>rojo</strong> = red</div>
          <div class="gw-vocab-item"><strong>marrón</strong> = brown</div>
          <div class="gw-vocab-item"><strong>azul</strong> = blue</div>
          <div class="gw-vocab-item"><strong>verde</strong> = green</div>
          <div class="gw-vocab-item"><strong>largo</strong> = long</div>
          <div class="gw-vocab-item"><strong>corto</strong> = short</div>
          <div class="gw-vocab-item"><strong>sombrero</strong> = hat</div>
          <div class="gw-vocab-item"><strong>gafas</strong> = glasses</div>
          <div class="gw-vocab-item"><strong>barba</strong> = beard</div>
          <div class="gw-vocab-item"><strong>pendientes</strong> = earrings</div>
          <div class="gw-vocab-item"><strong>hombre</strong> = man</div>
          <div class="gw-vocab-item"><strong>mujer</strong> = woman</div>
        </div>
      </div>`;
  }

  function render() {
    const container = document.getElementById('main-content');
    const remaining = CHARACTERS.filter(c => !eliminated.has(c.id));

    let html = `<div class="gw-screen fade-in">`;

    // Header
    html += `
      <div class="gw-header">
        <h2>¿Quién es? <span class="gw-subtitle">Guess Who?</span></h2>
        <div class="gw-stats">
          <span class="gw-stat">❓ ${questionsAsked} preguntas</span>
          <span class="gw-stat">👥 ${remaining.length} remaining</span>
        </div>
      </div>`;

    // Win state
    if (gameOver) {
      html += `
        <div class="gw-win-banner">
          <div class="gw-win-emoji">${secret.emoji}</div>
          <h3>¡Correcto! Es ${secret.name}!</h3>
          <p>You found them in <strong>${questionsAsked}</strong> questions!</p>
          <p>${questionsAsked <= 5 ? '🌟 Excellent!' : questionsAsked <= 8 ? '👍 Good job!' : '💪 Keep practicing!'}</p>
          <button class="btn btn-primary" id="gw-play-again">Jugar otra vez</button>
          <button class="btn btn-secondary" id="gw-back">← Back</button>
        </div>`;
    }

    // Question buttons
    if (!gameOver) {
      html += `
        <div class="gw-questions">
          <h3>Haz una pregunta <span class="gw-hint">(Ask a question)</span></h3>
          <div class="gw-question-grid">`;

      for (const [key, trait] of Object.entries(TRAITS)) {
        const alreadyAsked = questionLog.some(q => q.question === trait.question);
        html += `
            <button class="gw-question-btn ${alreadyAsked ? 'gw-asked' : ''}" data-trait="${key}" ${alreadyAsked ? 'disabled' : ''}>
              <span class="gw-q-es">${trait.question}</span>
              <span class="gw-q-hint">${trait.hint}</span>
            </button>`;
      }

      html += `
          </div>
        </div>`;
    }

    // Question log
    if (questionLog.length > 0) {
      html += `<div class="gw-log"><h4>Preguntas:</h4>`;
      for (const q of questionLog) {
        html += `<div class="gw-log-item ${q.answer ? 'gw-yes' : 'gw-no'}">
          <span class="gw-log-icon">${q.answer ? '✅ Sí' : '❌ No'}</span>
          <span class="gw-log-q">${q.question}</span>
          <span class="gw-log-hint">${q.hint}</span>
        </div>`;
      }
      html += `</div>`;
    }

    // Character board
    html += `
      <div class="gw-board">
        <h3>Los personajes ${!gameOver ? '<span class="gw-hint">(Click to guess!)</span>' : ''}</h3>
        <div class="gw-grid">
          ${CHARACTERS.map(c => buildCharacterCard(c)).join('')}
        </div>
      </div>`;

    // Vocabulary reference
    html += buildVocabPanel();

    // Back button
    if (!gameOver) {
      html += `<div class="gw-actions">
        <button class="btn btn-secondary" id="gw-restart">🔄 Reiniciar</button>
        <button class="btn btn-secondary" id="gw-back">← Back</button>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

    // Bind events
    document.querySelectorAll('.gw-question-btn:not(.gw-asked)').forEach(btn => {
      btn.addEventListener('click', () => askQuestion(btn.dataset.trait));
    });

    document.querySelectorAll('.gw-card:not(.gw-eliminated)').forEach(card => {
      if (!gameOver) {
        card.addEventListener('click', () => makeGuess(parseInt(card.dataset.id)));
        card.style.cursor = 'pointer';
      }
    });

    document.getElementById('gw-play-again')?.addEventListener('click', startGame);
    document.getElementById('gw-restart')?.addEventListener('click', startGame);
    document.getElementById('gw-back')?.addEventListener('click', () => {
      if (typeof App !== 'undefined') App.showStudy();
    });
  }

  return {
    startGame,
    render,
  };
})();
