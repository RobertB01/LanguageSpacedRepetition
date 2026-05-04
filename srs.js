// Spaced Repetition System — SM-2 Algorithm Implementation
// Bidirectional tracking: each word has separate progress for toEs and fromEs directions
// Includes review history with timestamps

const SRS = (() => {
  const STORAGE_KEY = 'srs_word_progress';
  const STATS_KEY = 'srs_global_stats';
  const SESSION_KEY = 'srs_session';
  const SETTINGS_KEY = 'srs_settings';
  const HISTORY_KEY = 'srs_review_history';
  const MIGRATION_KEY = 'srs_bidirectional_migrated';

  const API_URL = '/api/progress';

  // Only sync with the local server.py when actually running on localhost.
  // On GitHub Pages, /api/progress would resolve to a static file (e.g. a
  // committed progress.json) and silently overwrite the user's real progress.
  const IS_LOCAL = typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  // Default settings
  const DEFAULT_SETTINGS = {
    newCardsPerSession: 10,
    autoPronounce: true,
    speechSpeed: 'normal',
    studyMode: 'mixed',
  };

  // --- Sync (Cloud + optional local server) ---
  let _syncTimer = null;
  function scheduleSyncToServer() {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
      _syncTimer = null;
      _pushToServer();
    }, 2000);
  }

  function _buildPayload() {
    return {
      progress: getAllProgress(),
      stats: getGlobalStats(),
      settings: getSettings(),
      history: getReviewHistory(),
      lastSaved: new Date().toISOString(),
    };
  }

  function _pushToServer() {
    try {
      // Also persist to active profile
      if (typeof Profiles !== 'undefined') Profiles.saveCurrentProfile();

      const payload = _buildPayload();

      // Cloud sync (Supabase) — works on GitHub Pages and localhost.
      if (typeof Cloud !== 'undefined' && Cloud.isEnabled()) {
        const profileId = (typeof Profiles !== 'undefined')
          ? Profiles.getActiveProfileId()
          : null;
        if (profileId) {
          Cloud.save(profileId, payload);
        }
      }

      // Local dev server — only when actually running on localhost.
      if (IS_LOCAL) {
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(err => console.warn('Local server sync failed (save):', err));
      }
    } catch (e) {
      console.warn('Sync error:', e);
    }
  }

  // Apply a payload (from cloud or local server) into localStorage.
  function _applyPayload(data) {
    if (!data) return false;
    if (!data.progress && !data.stats && !data.settings && !data.history) {
      return false;
    }
    if (data.progress) saveAllProgress(data.progress, true);
    if (data.stats) saveGlobalStats(data.stats, true);
    if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings }, true);
    if (data.history) saveReviewHistory(data.history, true);
    return true;
  }

  // Load latest data into localStorage. Cloud takes priority when configured;
  // otherwise falls back to the local server.py (only on localhost).
  async function loadFromServer() {
    try {
      // 1. Cloud first (works on Pages).
      if (typeof Cloud !== 'undefined' && Cloud.isEnabled()) {
        const profileId = (typeof Profiles !== 'undefined')
          ? Profiles.getActiveProfileId()
          : null;
        if (profileId) {
          const result = await Cloud.load(profileId);
          if (result && result.payload) {
            _applyPayload(result.payload);
            migrateToBidirectional();
            return true;
          }
        }
      }

      // 2. Local dev server (only on localhost — never on Pages).
      if (IS_LOCAL) {
        const resp = await fetch(API_URL);
        if (resp.ok) {
          const data = await resp.json();
          _applyPayload(data);
        }
      }

      migrateToBidirectional();
      return true;
    } catch (e) {
      console.warn('Could not sync from cloud/server, using localStorage:', e);
      migrateToBidirectional();
      return false;
    }
  }

  // --- Migration: convert old wordId keys to wordId_toEs / wordId_fromEs ---
  function migrateToBidirectional() {
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const allProgress = getAllProgress();
    const newProgress = {};
    let hasMigrated = false;

    for (const [key, value] of Object.entries(allProgress)) {
      // Already migrated key
      if (key.endsWith('_toEs') || key.endsWith('_fromEs')) {
        newProgress[key] = value;
        continue;
      }

      // Old format: just wordId — duplicate to both directions
      newProgress[`${key}_toEs`] = { ...value, wordId: `${key}_toEs` };
      newProgress[`${key}_fromEs`] = { ...value, wordId: `${key}_fromEs` };
      hasMigrated = true;
    }

    if (hasMigrated) {
      saveAllProgress(newProgress);
    }

    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('Bidirectional migration complete:', hasMigrated ? 'data migrated' : 'no migration needed');
  }

  // --- Utility ---
  function now() {
    return Date.now();
  }

  function daysBetween(ts1, ts2) {
    return (ts2 - ts1) / (1000 * 60 * 60 * 24);
  }

  // --- Settings ---
  function getSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) { }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(settings, skipSync) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (!skipSync) scheduleSyncToServer();
  }

  // --- Review History ---
  function getReviewHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return [];
  }

  function saveReviewHistory(history, skipSync) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save review history');
    }
    if (!skipSync) scheduleSyncToServer();
  }

  function appendHistory(wordId, direction, wasCorrect, responseTime) {
    const history = getReviewHistory();
    history.push({
      ts: now(),
      id: wordId,
      dir: direction,
      ok: wasCorrect,
      rt: responseTime,
    });
    // Keep last 5000 entries to manage storage
    if (history.length > 5000) {
      history.splice(0, history.length - 5000);
    }
    saveReviewHistory(history);
  }

  // --- Word Progress ---
  function getDefaultProgress(wordId) {
    return {
      wordId,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: 0,
      totalReviews: 0,
      totalCorrect: 0,
      averageResponseTime: 0,
      lastSeen: 0,
      status: 'new',
    };
  }

  function getAllProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) { }
    return {};
  }

  function saveAllProgress(progress, skipSync) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('localStorage full, cannot save progress');
    }
    if (!skipSync) scheduleSyncToServer();
  }

  // direction: 'toEs' or 'fromEs'
  function getWordProgress(wordId, direction) {
    const all = getAllProgress();
    if (direction) {
      const key = `${wordId}_${direction}`;
      return all[key] || getDefaultProgress(key);
    }
    // Legacy fallback (no direction)
    return all[wordId] || getDefaultProgress(wordId);
  }

  function computeStatus(interval, easeFactor) {
    if (interval === 0) return 'new';
    if (interval < 1) return 'learning';
    if (interval >= 21 && easeFactor > 2.0) return 'mastered';
    return 'review';
  }

  /**
   * SM-2 Algorithm implementation
   * quality: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
   * direction: 'toEs' or 'fromEs'
   */
  function reviewWord(wordId, direction, quality, responseTime, isProduction) {
    const key = direction ? `${wordId}_${direction}` : String(wordId);
    const allProgress = getAllProgress();
    const progress = allProgress[key] || getDefaultProgress(key);

    const wasCorrect = quality >= 2;

    progress.totalReviews++;
    if (wasCorrect) progress.totalCorrect++;
    progress.lastSeen = now();

    if (progress.averageResponseTime === 0) {
      progress.averageResponseTime = responseTime;
    } else {
      progress.averageResponseTime = Math.round(
        progress.averageResponseTime * 0.8 + responseTime * 0.2
      );
    }

    if (quality === 0) {
      progress.repetitions = 0;
      progress.interval = 0;
      progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.2);
      progress.nextReview = now() + 60 * 1000;
    } else if (quality === 1) {
      progress.repetitions = Math.max(0, progress.repetitions - 1);
      progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.15);

      if (progress.interval <= 0) {
        progress.interval = 1 / 144;
        progress.nextReview = now() + 10 * 60 * 1000;
      } else {
        progress.interval = Math.max(progress.interval * 0.5, 1 / 144);
        progress.nextReview = now() + progress.interval * 24 * 60 * 60 * 1000;
      }
    } else if (quality === 2) {
      progress.repetitions++;
      progress.easeFactor = Math.max(1.3, progress.easeFactor - 0.05 + 0.1);

      if (progress.repetitions === 1) {
        progress.interval = 1 / 144;
        progress.nextReview = now() + 10 * 60 * 1000;
      } else if (progress.repetitions === 2) {
        progress.interval = 1 / 24;
        progress.nextReview = now() + 60 * 60 * 1000;
      } else if (progress.repetitions === 3) {
        progress.interval = 1;
        progress.nextReview = now() + 24 * 60 * 60 * 1000;
      } else {
        progress.interval = Math.round(progress.interval * progress.easeFactor * 10) / 10;
        progress.nextReview = now() + progress.interval * 24 * 60 * 60 * 1000;
      }

      if (isProduction) {
        progress.interval = Math.round(progress.interval * 1.1 * 10) / 10;
        progress.nextReview = now() + progress.interval * 24 * 60 * 60 * 1000;
      }
    } else if (quality === 3) {
      progress.repetitions++;
      progress.easeFactor = Math.max(1.3, progress.easeFactor + 0.15);

      if (progress.repetitions === 1) {
        progress.interval = 1;
        progress.nextReview = now() + 24 * 60 * 60 * 1000;
      } else if (progress.repetitions === 2) {
        progress.interval = 3;
        progress.nextReview = now() + 3 * 24 * 60 * 60 * 1000;
      } else {
        progress.interval = Math.round(progress.interval * progress.easeFactor * 1.3 * 10) / 10;
        progress.nextReview = now() + progress.interval * 24 * 60 * 60 * 1000;
      }

      if (isProduction) {
        progress.interval = Math.round(progress.interval * 1.15 * 10) / 10;
        progress.nextReview = now() + progress.interval * 24 * 60 * 60 * 1000;
      }
    }

    // Cap interval at 365 days
    progress.interval = Math.min(progress.interval, 365);
    progress.status = computeStatus(progress.interval, progress.easeFactor);

    // Save
    allProgress[key] = progress;
    saveAllProgress(allProgress);

    // Record in history
    if (direction) {
      appendHistory(wordId, direction, wasCorrect, responseTime);
    }

    return progress;
  }

  // --- Queue Building (Bidirectional) ---
  function buildQueue(vocabulary, settings) {
    const allProgress = getAllProgress();
    const currentTime = now();
    const directions = ['toEs', 'fromEs'];

    const dueCards = [];
    const newCards = [];

    for (const word of vocabulary) {
      for (const dir of directions) {
        const key = `${word.id}_${dir}`;
        const progress = allProgress[key];

        if (!progress || progress.status === 'new') {
          newCards.push({ word, direction: dir });
        } else if (progress.nextReview <= currentTime) {
          const overdueDays = daysBetween(progress.nextReview, currentTime);
          dueCards.push({
            word,
            direction: dir,
            progress,
            overdueDays,
            priority: overdueDays * (3.0 - progress.easeFactor)
          });
        }
      }
    }

    // Sort due cards: hardest first (highest priority)
    dueCards.sort((a, b) => b.priority - a.priority);

    // Shuffle new cards for interleaving
    shuffleArray(newCards);

    const newCardLimit = settings.newCardsPerSession || 10;
    const limitedNewCards = newCards.slice(0, newCardLimit);

    const queue = [
      ...dueCards.map(d => ({ word: d.word, direction: d.direction, isNew: false })),
      ...limitedNewCards.map(c => ({ word: c.word, direction: c.direction, isNew: true }))
    ];

    return queue;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- Global Stats ---
  function getGlobalStats() {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {
      totalReviews: 0,
      dailyStreak: 0,
      lastStudyDate: null,
      dailyAccuracy: {},
      totalTimeToday: 0,
      todayDate: null,
    };
  }

  function saveGlobalStats(stats, skipSync) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    if (!skipSync) scheduleSyncToServer();
  }

  function getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  function updateGlobalStats(wasCorrect, timeSpent) {
    const stats = getGlobalStats();
    const today = getTodayKey();

    stats.totalReviews++;

    if (!stats.dailyAccuracy[today]) {
      stats.dailyAccuracy[today] = { correct: 0, total: 0 };
    }
    stats.dailyAccuracy[today].total++;
    if (wasCorrect) stats.dailyAccuracy[today].correct++;

    const keys = Object.keys(stats.dailyAccuracy).sort();
    while (keys.length > 30) {
      delete stats.dailyAccuracy[keys.shift()];
    }

    if (stats.lastStudyDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];

      if (stats.lastStudyDate === yesterdayKey) {
        stats.dailyStreak++;
      } else if (stats.lastStudyDate !== today) {
        stats.dailyStreak = 1;
      }
      stats.lastStudyDate = today;
    }

    if (stats.todayDate !== today) {
      stats.todayDate = today;
      stats.totalTimeToday = 0;
    }
    stats.totalTimeToday += timeSpent;

    saveGlobalStats(stats);
    return stats;
  }

  // --- Computed Stats (Bidirectional) ---
  function getComputedStats(vocabulary) {
    const allProgress = getAllProgress();
    const globalStats = getGlobalStats();
    const today = getTodayKey();
    const directions = ['toEs', 'fromEs'];

    const totalCards = vocabulary.length * 2;
    let totalNew = 0, totalLearning = 0, totalReview = 0, totalMastered = 0;
    let totalSeen = 0;
    const masteredWordIds = new Set();
    const knownWordIds = new Set();
    const struggledWords = [];

    for (const word of vocabulary) {
      for (const dir of directions) {
        const key = `${word.id}_${dir}`;
        const progress = allProgress[key];
        if (!progress || progress.status === 'new') {
          totalNew++;
        } else {
          totalSeen++;
          if (progress.status === 'learning') totalLearning++;
          else if (progress.status === 'review') totalReview++;
          else if (progress.status === 'mastered') totalMastered++;

          if (progress.interval > 7) knownWordIds.add(word.id);
          if (progress.status === 'mastered') {
            // Track per direction; only count as mastered word if both are mastered
            if (!masteredWordIds.has(word.id)) masteredWordIds.set ? null : masteredWordIds.add(word.id);
          }

          if (progress.totalReviews >= 2 && progress.easeFactor < 2.2) {
            struggledWords.push({ word, progress, direction: dir });
          }
        }
      }
    }

    struggledWords.sort((a, b) => a.progress.easeFactor - b.progress.easeFactor);

    // Accuracy over last 7 days
    let last7Correct = 0, last7Total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const day = globalStats.dailyAccuracy?.[key];
      if (day) {
        last7Correct += day.correct;
        last7Total += day.total;
      }
    }

    // Forecast: how many reviews due tomorrow
    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    let dueTomorrow = 0;
    for (const word of vocabulary) {
      for (const dir of directions) {
        const key = `${word.id}_${dir}`;
        const progress = allProgress[key];
        if (progress && progress.nextReview > 0 && progress.nextReview <= tomorrowEnd.getTime()) {
          dueTomorrow++;
        }
      }
    }

    return {
      totalWords: vocabulary.length,
      totalCards,
      totalNew,
      totalLearning,
      totalReview,
      totalMastered,
      totalSeen,
      estimatedVocab: knownWordIds.size,
      dailyStreak: globalStats.dailyStreak,
      totalReviewCount: globalStats.totalReviews,
      last7Accuracy: last7Total > 0 ? Math.round((last7Correct / last7Total) * 100) : 0,
      last7Total,
      dueTomorrow,
      struggledWords: struggledWords.slice(0, 10),
      totalTimeToday: globalStats.totalTimeToday || 0,
      todayAccuracy: globalStats.dailyAccuracy?.[today] || { correct: 0, total: 0 },
    };
  }

  // --- Session Tracking ---
  function initSession() {
    const session = {
      cardsReviewed: 0,
      correctCount: 0,
      currentStreak: 0,
      totalResponseTime: 0,
      newWordsIntroduced: 0,
      startTime: now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getSession() {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return initSession();
  }

  function updateSession(wasCorrect, responseTime, isNewWord) {
    const session = getSession();
    session.cardsReviewed++;
    if (wasCorrect) {
      session.correctCount++;
      session.currentStreak++;
    } else {
      session.currentStreak = 0;
    }
    session.totalResponseTime += responseTime;
    if (isNewWord) session.newWordsIntroduced++;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  // --- Export / Import ---
  function exportProgress() {
    return JSON.stringify({
      progress: getAllProgress(),
      stats: getGlobalStats(),
      settings: getSettings(),
      history: getReviewHistory(),
      exportDate: new Date().toISOString(),
    }, null, 2);
  }

  function importProgress(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.progress) saveAllProgress(data.progress);
      if (data.stats) saveGlobalStats(data.stats);
      if (data.settings) saveSettings(data.settings);
      if (data.history) saveReviewHistory(data.history);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  function resetProgress() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(MIGRATION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    scheduleSyncToServer();
  }

  return {
    getSettings,
    saveSettings,
    getWordProgress,
    getAllProgress,
    reviewWord,
    buildQueue,
    getGlobalStats,
    updateGlobalStats,
    getComputedStats,
    initSession,
    getSession,
    updateSession,
    exportProgress,
    importProgress,
    resetProgress,
    loadFromServer,
    getReviewHistory,
    DEFAULT_SETTINGS,
  };
})();
