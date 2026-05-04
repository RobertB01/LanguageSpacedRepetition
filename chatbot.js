// AI Language Learning Chatbot
// Smart rule-based chatbot that uses vocabulary, conjugation, and progress data
// Supports Spanish and Dutch learning with contextual responses

const Chatbot = (() => {
  const CHAT_HISTORY_KEY = 'srs_chat_history';
  const CHAT_LANG_KEY = 'srs_chat_lang'; // 'es' or 'nl'
  const MAX_HISTORY = 100;

  // --- Chat history ---
  function getHistory() {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return [];
  }

  function saveHistory(history) {
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  }

  function clearHistory() {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  }

  function getChatLang() {
    return localStorage.getItem(CHAT_LANG_KEY) || 'es';
  }

  function setChatLang(lang) {
    localStorage.setItem(CHAT_LANG_KEY, lang);
  }

  // --- Get learning context from SRS data ---
  function getLearningContext() {
    const allProgress = SRS.getAllProgress();
    const stats = SRS.getComputedStats(VOCABULARY);
    const history = SRS.getReviewHistory();

    // Find struggled words
    const struggled = [];
    const mastered = [];
    const recentlyLearned = [];

    for (const word of VOCABULARY) {
      for (const dir of ['toEs', 'fromEs']) {
        const key = `${word.id}_${dir}`;
        const p = allProgress[key];
        if (!p) continue;
        if (p.easeFactor < 2.0 && p.totalReviews >= 2) {
          struggled.push({ word, direction: dir, accuracy: p.totalReviews > 0 ? p.totalCorrect / p.totalReviews : 0 });
        }
        if (p.status === 'mastered') {
          mastered.push(word);
        }
        if (p.lastSeen && (Date.now() - p.lastSeen) < 24 * 60 * 60 * 1000 && p.totalReviews <= 3) {
          recentlyLearned.push(word);
        }
      }
    }

    // Get recent session data
    const recent = history.slice(-20);
    const recentCorrect = recent.filter(h => h.ok).length;
    const recentAccuracy = recent.length > 0 ? Math.round((recentCorrect / recent.length) * 100) : 0;

    return {
      totalWords: VOCABULARY.length,
      wordsStudied: stats.estimatedVocab,
      totalReviews: stats.totalReviewCount,
      streak: stats.dailyStreak,
      accuracy: recentAccuracy,
      struggled: struggled.slice(0, 10),
      mastered: mastered.slice(0, 20),
      recentlyLearned: recentlyLearned.slice(0, 10),
      stats,
    };
  }

  // --- Smart response generation ---
  function generateResponse(userMessage) {
    const msg = userMessage.toLowerCase().trim();
    const lang = getChatLang();
    const langName = lang === 'es' ? 'Spanish' : 'Dutch';
    const ctx = getLearningContext();

    // Greeting patterns
    if (/^(hi|hello|hey|hola|hoi|dag|goedemorgen|buenas|buenos)/i.test(msg)) {
      return greetingResponse(lang, ctx);
    }

    // Progress / how am I doing
    if (/progress|how.*(am i|doing|going)|voortgang|hoe gaat|stats|score/i.test(msg)) {
      return progressResponse(ctx, lang);
    }

    // Ask for help with struggled words
    if (/help|difficult|hard|moeilijk|struggle|problem|fout/i.test(msg)) {
      return helpWithStruggledWords(ctx, lang);
    }

    // Quiz me / test me / practice
    if (/quiz|test|practice|oefen|train|toets|practic/i.test(msg)) {
      return quizResponse(ctx, lang);
    }

    // Translate
    if (/translate|vertaal|traduc|what.*(mean|is)|wat.*betekent|como.*dice|hoe.*zeg/i.test(msg)) {
      return translateResponse(msg, lang);
    }

    // Conjugation help
    if (/conjuga|werkwoord|verb|vervoeg/i.test(msg)) {
      return conjugationHelp(msg, lang);
    }

    // Tips / advice
    if (/tip|advice|suggest|recommend|raad|advies/i.test(msg)) {
      return tipsResponse(ctx, lang);
    }

    // Grammar questions
    if (/grammar|gramm|ser.*estar|por.*para|preterit|imperfect/i.test(msg)) {
      return grammarResponse(msg, lang);
    }

    // Example sentence
    if (/example|sentence|voorbeeld|zin|frase|oración/i.test(msg)) {
      return exampleResponse(lang);
    }

    // Word of the day
    if (/word.*day|woord.*dag|palabra.*día/i.test(msg)) {
      return wordOfDayResponse(lang);
    }

    // Specific word lookup
    const wordMatch = findWordInMessage(msg);
    if (wordMatch) {
      return wordInfoResponse(wordMatch, lang);
    }

    // Default: contextual response
    return defaultResponse(ctx, lang);
  }

  function greetingResponse(lang, ctx) {
    const profile = typeof Profiles !== 'undefined' ? Profiles.getActiveProfile() : null;
    const name = profile ? profile.name : '';
    const greeting = name ? ` ${name}` : '';

    if (lang === 'es') {
      const greetings = [
        `¡Hola${greeting}! 👋 I'm your Spanish learning assistant. You've studied **${ctx.wordsStudied}** words so far. What would you like to practice?`,
        `¡Buenos días${greeting}! 🌞 Ready to learn some Spanish? You're on a **${ctx.streak}-day streak**! Ask me to quiz you, help with difficult words, or explain grammar.`,
        `¡Bienvenido${greeting}! 🎉 You've done **${ctx.totalReviews}** reviews total. Want a quiz, translation help, or some tips?`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    } else {
      const greetings = [
        `Hoi${greeting}! 👋 Ik ben je Nederlandse leerassistent. Je hebt al **${ctx.wordsStudied}** woorden geleerd. Wat wil je oefenen?`,
        `Goedendag${greeting}! 🌞 Klaar om Nederlands te oefenen? Je hebt een streak van **${ctx.streak} dagen**!`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
  }

  function progressResponse(ctx, lang) {
    const { stats } = ctx;
    let response = `📊 **Your Progress:**\n\n`;
    response += `• Words studied: **${ctx.wordsStudied}** / ${ctx.totalWords}\n`;
    response += `• Total reviews: **${ctx.totalReviews}**\n`;
    response += `• Daily streak: **${ctx.streak}** days 🔥\n`;
    response += `• Recent accuracy: **${ctx.accuracy}%**\n`;
    response += `• Cards mastered: **${stats.totalMastered}** / ${stats.totalCards}\n`;
    response += `• Due tomorrow: **${stats.dueTomorrow}**\n\n`;

    if (ctx.struggled.length > 0) {
      response += `⚠️ Words you struggle with: `;
      response += ctx.struggled.slice(0, 5).map(s => `**${s.word.es}** (${s.word.en})`).join(', ');
      response += `\n\n`;
    }

    if (ctx.accuracy >= 90) {
      response += `🌟 Excellent accuracy! You're doing great. Consider adding more new cards per session.`;
    } else if (ctx.accuracy >= 70) {
      response += `👍 Good progress! Focus on the words you find difficult. Try the "help" command for practice.`;
    } else {
      response += `💪 Keep going! Try reviewing at a slower pace and repeat the difficult words more often.`;
    }

    return response;
  }

  function helpWithStruggledWords(ctx, lang) {
    if (ctx.struggled.length === 0) {
      return `🎉 Great news! You don't have any particularly difficult words right now. Keep up the good work!\n\nWant me to quiz you on recent words instead? Just say "quiz me"!`;
    }

    let response = `📝 **Words you find difficult:**\n\n`;
    for (const s of ctx.struggled.slice(0, 5)) {
      const w = s.word;
      const acc = Math.round(s.accuracy * 100);
      response += `• **${w.es}** = ${w.en} / ${w.nl} (${acc}% accuracy)\n`;
      if (w.ex && w.ex.es) {
        response += `  _${w.ex.es}_\n`;
      }
    }

    response += `\n💡 **Tips:** Try creating a mental image for each word. Use them in a sentence. Say them out loud!\n`;
    response += `\nWant me to quiz you on these? Say "quiz me"!`;
    return response;
  }

  function quizResponse(ctx, lang) {
    // Pick a random word — prefer struggled or recently learned
    let pool = ctx.struggled.map(s => s.word);
    if (pool.length < 3) {
      pool = [...pool, ...ctx.recentlyLearned];
    }
    if (pool.length < 3) {
      // Pick random vocabulary
      const shuffled = [...VOCABULARY].sort(() => Math.random() - 0.5);
      pool = shuffled.slice(0, 5);
    }

    // Remove duplicates
    const seen = new Set();
    pool = pool.filter(w => { if (seen.has(w.id)) return false; seen.add(w.id); return true; });

    const quizWords = pool.slice(0, 3);
    let response = `🧠 **Quick Quiz! Translate these:**\n\n`;
    const answers = [];

    for (let i = 0; i < quizWords.length; i++) {
      const w = quizWords[i];
      if (lang === 'es') {
        if (Math.random() < 0.5) {
          response += `${i + 1}. **${w.en}** → Spanish?\n`;
          answers.push(`${w.es}`);
        } else {
          response += `${i + 1}. **${w.es}** → English?\n`;
          answers.push(`${w.en}`);
        }
      } else {
        if (Math.random() < 0.5) {
          response += `${i + 1}. **${w.en}** → Dutch?\n`;
          answers.push(`${w.nl}`);
        } else {
          response += `${i + 1}. **${w.nl}** → English?\n`;
          answers.push(`${w.en}`);
        }
      }
    }

    response += `\n<details><summary>Click to reveal answers</summary>\n\n`;
    for (let i = 0; i < answers.length; i++) {
      response += `${i + 1}. **${answers[i]}**\n`;
    }
    response += `</details>`;

    return response;
  }

  function translateResponse(msg, lang) {
    // Try to extract the word/phrase to translate
    const patterns = [
      /translate\s+["']?(.+?)["']?\s*$/i,
      /what\s+(?:does|is)\s+["']?(.+?)["']?\s+(?:mean|in)/i,
      /how\s+do\s+(?:you|i)\s+say\s+["']?(.+?)["']?\s*/i,
      /vertaal\s+["']?(.+?)["']?\s*$/i,
      /wat\s+betekent\s+["']?(.+?)["']?\s*$/i,
      /hoe\s+zeg\s+je\s+["']?(.+?)["']?\s*$/i,
    ];

    let searchTerm = null;
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) { searchTerm = m[1].trim(); break; }
    }

    if (!searchTerm) {
      // Try to find any word from vocabulary in the message
      const found = findWordInMessage(msg);
      if (found) return wordInfoResponse(found, lang);
      return `I'd be happy to translate! Try:\n• "translate hello"\n• "what does casa mean"\n• "how do you say water"`;
    }

    const word = findWordByText(searchTerm);
    if (word) {
      return wordInfoResponse(word, lang);
    }

    return `I couldn't find **"${searchTerm}"** in the vocabulary. Try a different word, or check the Study section for all ${VOCABULARY.length} words available.`;
  }

  function conjugationHelp(msg, lang) {
    if (typeof CONJUGATIONS === 'undefined') {
      return `Conjugation data is not loaded. Try refreshing the page.`;
    }

    // Try to find a verb in the message
    const word = findWordInMessage(msg);
    if (word && CONJUGATIONS.isVerb(word.id)) {
      const conj = CONJUGATIONS.conjugate(word.id);
      if (conj) {
        const subjs = CONJUGATIONS.SUBJECTS;
        let response = `📖 **${conj.infinitive}** (${word.en} / ${word.nl})\n`;
        response += `Pattern: ${conj.pattern}\n\n`;
        response += `**Presente:**\n`;
        for (let i = 0; i < 6; i++) {
          response += `• ${subjs[i]}: **${conj.forms[i]}**\n`;
        }
        if (conj.tip) response += `\n💡 ${conj.tip}`;
        return response;
      }
    }

    // General conjugation tips
    return `📖 **Conjugation Help:**\n\nTell me which verb you want to conjugate! For example:\n• "conjugate hablar"\n• "verb comer"\n\nOr check the **Verbs** tab for the full reference.\n\n💡 Spanish verbs have 3 groups: **-ar**, **-er**, and **-ir**. Each follows different ending patterns.`;
  }

  function tipsResponse(ctx, lang) {
    const tips = [];

    if (ctx.accuracy < 70) {
      tips.push(`🔄 Your recent accuracy is ${ctx.accuracy}%. Try slowing down and thinking carefully before answering.`);
      tips.push(`📝 Write down words you miss. Writing helps memory consolidation.`);
    }

    if (ctx.wordsStudied < 50) {
      tips.push(`🌱 You're just getting started! Focus on high-frequency words first — they make up 80% of daily conversation.`);
    } else if (ctx.wordsStudied < 200) {
      tips.push(`📈 Good foundation! At ${ctx.wordsStudied} words, start paying attention to word patterns and families.`);
    } else {
      tips.push(`🌟 Impressive vocabulary of ${ctx.wordsStudied} words! Start reading simple texts and watching shows with subtitles.`);
    }

    if (ctx.streak === 0) {
      tips.push(`🔥 Start a streak! Even 5 minutes daily is better than 1 hour weekly.`);
    } else if (ctx.streak >= 7) {
      tips.push(`🔥 ${ctx.streak}-day streak! Consistency is the key to fluency. Keep it up!`);
    }

    if (lang === 'es') {
      tips.push(`💡 **Spanish tip:** Listen to Spanish music, podcasts, or watch TV shows. "Destinos" and "Easy Spanish" on YouTube are great starters.`);
      tips.push(`💡 **Mnemonics:** Create silly mental images. "Perro" (dog) → imagine a *parrot* riding a dog.`);
    } else {
      tips.push(`💡 **Dutch tip:** Dutch pronunciation is tricky. Focus on the "g" and "ui" sounds early on.`);
    }

    // Pick 3 random tips
    const selected = tips.sort(() => Math.random() - 0.5).slice(0, 3);
    return `💡 **Tips for you:**\n\n${selected.join('\n\n')}`;
  }

  function grammarResponse(msg, lang) {
    if (/ser.*estar/i.test(msg)) {
      return `📖 **Ser vs Estar:**\n\n**Ser** = permanent/identity:\n• Soy profesor (I am a teacher)\n• Es grande (It is big)\n\n**Estar** = temporary/location:\n• Estoy cansado (I am tired)\n• Está en casa (He is at home)\n\n💡 Trick: If it can change → **estar**. If it defines → **ser**.`;
    }
    if (/por.*para/i.test(msg)) {
      return `📖 **Por vs Para:**\n\n**Para** = purpose/destination:\n• Para ti (for you)\n• Para aprender (in order to learn)\n\n**Por** = cause/through:\n• Por la mañana (in the morning)\n• Gracias por todo (thanks for everything)\n\n💡 Trick: Para → where it's going. Por → why/how.`;
    }
    if (/preterit|indefinido/i.test(msg)) {
      return `📖 **Pretérito Indefinido:**\n\nFor completed past actions:\n• Ayer **comí** pizza (Yesterday I ate pizza)\n• **Hablé** con ella (I spoke with her)\n\n-AR: -é, -aste, -ó, -amos, -asteis, -aron\n-ER/-IR: -í, -iste, -ió, -imos, -isteis, -ieron\n\n💡 Key signal words: ayer, anoche, la semana pasada`;
    }
    if (/imperfect/i.test(msg)) {
      return `📖 **Imperfecto:**\n\nFor habitual past / descriptions:\n• **Jugaba** al fútbol (I used to play football)\n• **Era** pequeño (I was small)\n\n-AR: -aba, -abas, -aba, -ábamos, -abais, -aban\n-ER/-IR: -ía, -ías, -ía, -íamos, -íais, -ían\n\n💡 Only 3 irregular verbs: ser, ir, ver!`;
    }

    return `📖 **Grammar Help:**\n\nI can explain:\n• "ser vs estar"\n• "por vs para"\n• "preterite" (pretérito indefinido)\n• "imperfect" (imperfecto)\n\nJust ask! Or check the **Verbs** tab for conjugation tables.`;
  }

  function exampleResponse(lang) {
    const word = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
    let response = `📝 **Example with "${word.es}" (${word.en}):**\n\n`;
    if (word.ex && word.ex.es) {
      response += `🇪🇸 ${word.ex.es}\n`;
    }
    if (word.ex && word.ex.nl) {
      response += `🇳🇱 ${word.ex.nl}\n`;
    }
    response += `\nWant another? Just say "example"!`;
    return response;
  }

  function wordOfDayResponse(lang) {
    // Use date seed for consistent daily word
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000)) % VOCABULARY.length;
    const word = VOCABULARY[dayIndex];
    let response = `🌟 **Word of the Day:**\n\n`;
    response += `• 🇪🇸 **${word.es}**\n`;
    response += `• 🇬🇧 ${word.en}\n`;
    response += `• 🇳🇱 ${word.nl}\n`;
    response += `• Type: ${word.type}\n`;
    if (word.ex && word.ex.es) {
      response += `\n_${word.ex.es}_`;
    }
    return response;
  }

  function wordInfoResponse(word, lang) {
    let response = `📖 **${word.es}**\n\n`;
    response += `• 🇬🇧 ${word.en}\n`;
    response += `• 🇪🇸 ${word.es}`;
    if (word.g) response += ` (${word.g === 'f' ? 'feminine' : 'masculine'})`;
    response += `\n• 🇳🇱 ${word.nl}\n`;
    response += `• Type: ${word.type}\n`;

    if (word.ex) {
      response += `\n**Examples:**\n`;
      if (word.ex.es) response += `🇪🇸 _${word.ex.es}_\n`;
      if (word.ex.nl) response += `🇳🇱 _${word.ex.nl}_\n`;
    }

    // Check if verb and show conjugation hint
    if (typeof CONJUGATIONS !== 'undefined' && CONJUGATIONS.isVerb(word.id)) {
      response += `\n🔗 This is a verb! Say "conjugate ${word.es}" for the full conjugation.`;
    }

    // Check progress
    const allProgress = SRS.getAllProgress();
    const pToEs = allProgress[`${word.id}_toEs`];
    const pFromEs = allProgress[`${word.id}_fromEs`];
    if (pToEs || pFromEs) {
      const reviews = (pToEs?.totalReviews || 0) + (pFromEs?.totalReviews || 0);
      const correct = (pToEs?.totalCorrect || 0) + (pFromEs?.totalCorrect || 0);
      const acc = reviews > 0 ? Math.round((correct / reviews) * 100) : 0;
      response += `\n📊 Your stats: ${reviews} reviews, ${acc}% accuracy`;
    }

    return response;
  }

  function defaultResponse(ctx, lang) {
    const responses = [
      `I'm here to help you learn ${lang === 'es' ? 'Spanish' : 'Dutch'}! Try:\n\n• **"quiz me"** — Quick vocabulary test\n• **"progress"** — See your stats\n• **"help"** — Practice difficult words\n• **"translate [word]"** — Look up a word\n• **"tips"** — Get study advice\n• **"conjugate [verb]"** — Verb forms\n• **"grammar"** — Grammar explanations\n• **"word of the day"** — Daily word`,
      `Interesting! Here's a random fact: You've learned **${ctx.wordsStudied}** words so far. With 500 core words, you can understand about 80% of everyday ${lang === 'es' ? 'Spanish' : 'Dutch'} conversation! Want to practice? Say "quiz me".`,
      `Not sure what you mean, but I'm always ready to help! Try asking me to "quiz me", check your "progress", or "translate" a word. 🎯`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // --- Word search helpers ---
  function findWordInMessage(msg) {
    const cleaned = msg.toLowerCase().replace(/[?.!,;:"']/g, '');
    const words = cleaned.split(/\s+/);

    for (const w of VOCABULARY) {
      // Check Spanish, English, Dutch
      for (const term of words) {
        if (term.length < 2) continue;
        const esTerms = w.es.toLowerCase().split(/[/,]\s*/);
        const enTerms = w.en.toLowerCase().split(/[/,]\s*/);
        const nlTerms = w.nl.toLowerCase().split(/[/,]\s*/);
        if (esTerms.some(t => t.trim() === term) ||
            enTerms.some(t => t.trim() === term) ||
            nlTerms.some(t => t.trim() === term)) {
          return w;
        }
      }
    }
    return null;
  }

  function findWordByText(text) {
    const search = text.toLowerCase().trim();
    return VOCABULARY.find(w => {
      const es = w.es.toLowerCase();
      const en = w.en.toLowerCase();
      const nl = w.nl.toLowerCase();
      return es === search || en === search || nl === search ||
             es.includes(search) || en.includes(search) || nl.includes(search);
    });
  }

  // --- Render Chat UI ---
  function renderChat() {
    const lang = getChatLang();
    const history = getHistory();
    const profile = typeof Profiles !== 'undefined' ? Profiles.getActiveProfile() : null;

    let messagesHTML = '';
    if (history.length === 0) {
      messagesHTML = `<div class="chat-welcome">
        <div class="chat-welcome-icon">🤖</div>
        <h3>${lang === 'es' ? '¡Hola!' : 'Hallo!'} I'm your language tutor</h3>
        <p>Ask me anything about ${lang === 'es' ? 'Spanish' : 'Dutch'}! I know your progress and can help you practice.</p>
        <div class="chat-suggestions">
          <button class="chat-suggestion" data-msg="How am I doing?">📊 My progress</button>
          <button class="chat-suggestion" data-msg="Quiz me!">🧠 Quiz me</button>
          <button class="chat-suggestion" data-msg="Help me with difficult words">💪 Difficult words</button>
          <button class="chat-suggestion" data-msg="Give me a tip">💡 Tips</button>
          <button class="chat-suggestion" data-msg="Word of the day">🌟 Word of the day</button>
          <button class="chat-suggestion" data-msg="Grammar help">📖 Grammar</button>
        </div>
      </div>`;
    } else {
      for (const msg of history) {
        const isUser = msg.role === 'user';
        const avatar = isUser ? (profile ? profile.avatar : '👤') : '🤖';
        messagesHTML += `<div class="chat-message ${isUser ? 'chat-user' : 'chat-bot'}">
          <div class="chat-avatar">${avatar}</div>
          <div class="chat-bubble">${isUser ? escapeHtml(msg.text) : formatMarkdown(msg.text)}</div>
        </div>`;
      }
    }

    return `
      <div class="chat-screen fade-in">
        <div class="chat-header">
          <h2>🤖 Language Tutor</h2>
          <div class="chat-lang-toggle">
            <button class="btn btn-small chat-lang-btn ${lang === 'es' ? 'active' : ''}" data-lang="es">🇪🇸 Spanish</button>
            <button class="btn btn-small chat-lang-btn ${lang === 'nl' ? 'active' : ''}" data-lang="nl">🇳🇱 Dutch</button>
            <button class="btn btn-small btn-clear-chat" id="btn-clear-chat" title="Clear chat">🗑️</button>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages">
          ${messagesHTML}
        </div>
        <div class="chat-input-bar">
          <input type="text" id="chat-input" class="chat-input" placeholder="Ask me anything about ${lang === 'es' ? 'Spanish' : 'Dutch'}..." autocomplete="off" />
          <button class="btn btn-primary chat-send" id="btn-chat-send">Send</button>
        </div>
      </div>
    `;
  }

  // ----- AI-backed reply (uses learner context for guided responses) ---------
  async function _aiReply(userText, prevHistory) {
    const lang = getChatLang();
    const langName = lang === 'es' ? 'Spanish' : 'Dutch';
    const learnerCtx = AI.buildLearnerContext({ limit: 50 });

    const system = `You are a friendly, encouraging ${langName} tutor inside a spaced-repetition app. ` +
      `Your goal is to help the learner practise what they've already studied and gently introduce new things.\n\n` +
      `LEARNER CONTEXT:\n${learnerCtx}\n\n` +
      `STYLE:\n` +
      `- Reply mostly in ${langName}, calibrated to the learner's level.\n` +
      `- For any word the learner is unlikely to know, follow it with a short English gloss in parentheses, e.g. "rápido (fast)".\n` +
      `- Keep responses 1–4 sentences unless they explicitly ask for an explanation.\n` +
      `- If they ask "how does X work?" give a short, concrete grammar tip (3–5 bullets max).\n` +
      `- If they ask to practise, give a tiny exercise (one sentence to translate, or fill in a blank) and wait for their answer.`;

    const trimmed = (prevHistory || []).slice(-8).map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    }));
    const messages = [
      { role: 'system', content: system },
      ...trimmed,
      { role: 'user', content: userText },
    ];
    return await AI.chat(messages, { temperature: 0.7, maxTokens: 400 });
  }

  function bindChatEvents() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('btn-chat-send');
    const messagesDiv = document.getElementById('chat-messages');

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      const history = getHistory();
      history.push({ role: 'user', text, ts: Date.now() });
      saveHistory(history);
      renderMessages(history);
      scrollToBottom();

      // If AI is configured, route through OpenAI with learner context for
      // guided responses. Otherwise fall back to the rule-based system.
      if (typeof AI !== 'undefined' && AI.isEnabled()) {
        // Show a "typing" placeholder
        const typingHist = [...history, { role: 'bot', text: '…', ts: Date.now(), pending: true }];
        renderMessages(typingHist);
        scrollToBottom();

        _aiReply(text, history).then(reply => {
          const h = getHistory();
          h.push({ role: 'bot', text: reply, ts: Date.now() });
          saveHistory(h);
          renderMessages(h);
          scrollToBottom();
        }).catch(err => {
          console.warn('AI reply failed, falling back to rule-based:', err);
          const fallback = generateResponse(text);
          const h = getHistory();
          h.push({ role: 'bot', text: fallback, ts: Date.now() });
          saveHistory(h);
          renderMessages(h);
          scrollToBottom();
        });
      } else {
        const response = generateResponse(text);
        const h = getHistory();
        h.push({ role: 'bot', text: response, ts: Date.now() });
        saveHistory(h);
        renderMessages(h);
        scrollToBottom();
      }
    }

    sendBtn?.addEventListener('click', sendMessage);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });

    // Language toggle
    document.querySelectorAll('.chat-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setChatLang(btn.dataset.lang);
        // Re-render the whole chat view
        const container = document.getElementById('main-content');
        container.innerHTML = renderChat();
        bindChatEvents();
      });
    });

    // Clear chat
    document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
      clearHistory();
      const container = document.getElementById('main-content');
      container.innerHTML = renderChat();
      bindChatEvents();
    });

    // Suggestion buttons
    document.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.msg;
        sendMessage();
      });
    });

    setTimeout(() => { input?.focus(); scrollToBottom(); }, 100);
  }

  function renderMessages(history) {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;
    const profile = typeof Profiles !== 'undefined' ? Profiles.getActiveProfile() : null;

    let html = '';
    for (const msg of history) {
      const isUser = msg.role === 'user';
      const avatar = isUser ? (profile ? profile.avatar : '👤') : '🤖';
      html += `<div class="chat-message ${isUser ? 'chat-user' : 'chat-bot'} fade-in">
        <div class="chat-avatar">${avatar}</div>
        <div class="chat-bubble">${isUser ? escapeHtml(msg.text) : formatMarkdown(msg.text)}</div>
      </div>`;
    }
    messagesDiv.innerHTML = html;
  }

  function scrollToBottom() {
    const messagesDiv = document.getElementById('chat-messages');
    if (messagesDiv) {
      setTimeout(() => { messagesDiv.scrollTop = messagesDiv.scrollHeight; }, 50);
    }
  }

  // --- Utility ---
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatMarkdown(text) {
    // Simple markdown: bold, italic, newlines, details
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/<details><summary>(.+?)<\/summary>/g, '<details><summary>$1</summary>')
      .replace(/<\/details>/g, '</details>')
      .replace(/\n/g, '<br>');
  }

  return {
    renderChat,
    bindChatEvents,
    getChatLang,
    setChatLang,
    getHistory,
    clearHistory,
  };
})();
