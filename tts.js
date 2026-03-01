// Text-to-Speech Module — Multi-language support (EN, ES, NL)

const TTS = (() => {
  const voices = {};       // { en: Voice, es: Voice, nl: Voice }
  let voicesLoaded = false;
  const warnings = [];     // languages with no voice found

  // Speed presets
  const SPEED = {
    slow:   { word: 0.6,  sentence: 0.55 },
    normal: { word: 0.85, sentence: 0.8  },
    fast:   { word: 1.0,  sentence: 0.95 },
  };

  // Preferred BCP-47 tags per language (in priority order)
  const VOICE_PREFS = {
    en: ['en-GB', 'en-US', 'en'],
    es: ['es-ES', 'es-MX', 'es-US', 'es'],
    nl: ['nl-NL', 'nl-BE', 'nl'],
  };

  function init() {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        LANG_KEYS.forEach(k => warnings.push(k));
        resolve(false);
        return;
      }

      function loadVoices() {
        const available = window.speechSynthesis.getVoices();
        if (available.length === 0) return;
        voicesLoaded = true;

        for (const [lang, prefs] of Object.entries(VOICE_PREFS)) {
          let found = null;
          for (const pref of prefs) {
            found = available.find(v => v.lang === pref) ||
                    available.find(v => v.lang.startsWith(pref));
            if (found) break;
          }
          if (found) {
            voices[lang] = found;
          } else {
            warnings.push(lang);
            console.warn(`No TTS voice found for ${lang}`);
          }
        }

        resolve(Object.keys(voices).length > 0);
      }

      if (window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        setTimeout(() => {
          if (!voicesLoaded) {
            loadVoices();
            if (!voicesLoaded) {
              LANG_KEYS.forEach(k => warnings.push(k));
              resolve(false);
            }
          }
        }, 2000);
      }
    });
  }

  /**
   * Speak text in the given language.
   * @param {string} text
   * @param {string} lang  — 'en', 'es', or 'nl'
   * @param {string} type  — 'word' or 'sentence'
   * @param {string} speedSetting — 'slow', 'normal', 'fast'
   */
  function speak(text, lang = 'es', type = 'word', speedSetting = 'normal') {
    const voice = voices[lang];
    if (!window.speechSynthesis || !voice) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;

    const speeds = SPEED[speedSetting] || SPEED.normal;
    utterance.rate = type === 'word' ? speeds.word : speeds.sentence;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Chrome bug workaround: small delay after cancel()
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);

    // Chrome keepalive for long utterances
    if (type === 'sentence') {
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAlive);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
      utterance.onend = () => clearInterval(keepAlive);
      utterance.onerror = () => clearInterval(keepAlive);
    }
  }

  function speakWord(text, lang, speedSetting) {
    speak(text, lang, 'word', speedSetting);
  }

  function speakSentence(text, lang, speedSetting) {
    speak(text, lang, 'sentence', speedSetting);
  }

  function stop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function isAvailable(lang) {
    if (lang) return !!voices[lang];
    return Object.keys(voices).length > 0;
  }

  function hasWarning() {
    return warnings.length > 0;
  }

  function getWarnings() {
    return [...warnings];
  }

  return {
    init,
    speak,
    speakWord,
    speakSentence,
    stop,
    isAvailable,
    hasWarning,
    getWarnings,
  };
})();
