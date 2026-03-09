// Profile System — Separate data per user
// Each profile stores its own SRS progress, settings, history, and stats

const Profiles = (() => {
  const PROFILES_KEY = 'srs_profiles';
  const ACTIVE_PROFILE_KEY = 'srs_active_profile';

  // Predefined profiles
  const DEFAULT_PROFILES = [
    { id: 'ines', name: 'Inés', avatar: '👩‍🎓', color: '#e84393' },
    { id: 'robert', name: 'Robert', avatar: '👨‍💻', color: '#0984e3' },
  ];

  // Storage keys that are profile-scoped
  const PROFILE_SCOPED_KEYS = [
    'srs_word_progress',
    'srs_global_stats',
    'srs_settings',
    'srs_review_history',
    'srs_session',
    'srs_bidirectional_migrated',
    'srs_chat_history',
  ];

  function getProfiles() {
    try {
      const saved = localStorage.getItem(PROFILES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    // Initialize with defaults
    localStorage.setItem(PROFILES_KEY, JSON.stringify(DEFAULT_PROFILES));
    return [...DEFAULT_PROFILES];
  }

  function getActiveProfileId() {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) || null;
  }

  function getActiveProfile() {
    const id = getActiveProfileId();
    if (!id) return null;
    return getProfiles().find(p => p.id === id) || null;
  }

  function setActiveProfile(profileId) {
    const prev = getActiveProfileId();
    if (prev && prev !== profileId) {
      // Save current data under previous profile prefix
      _saveCurrentToProfile(prev);
    }
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
    // Load this profile's data
    _loadProfileData(profileId);
  }

  // Prefix a storage key for a specific profile
  function _profileKey(profileId, key) {
    return `profile_${profileId}_${key}`;
  }

  // Save current localStorage keys to a profile namespace
  function _saveCurrentToProfile(profileId) {
    for (const key of PROFILE_SCOPED_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        localStorage.setItem(_profileKey(profileId, key), val);
      } else {
        localStorage.removeItem(_profileKey(profileId, key));
      }
    }
  }

  // Load a profile's data into the main localStorage keys
  function _loadProfileData(profileId) {
    for (const key of PROFILE_SCOPED_KEYS) {
      const val = localStorage.getItem(_profileKey(profileId, key));
      if (val !== null) {
        localStorage.setItem(key, val);
      } else {
        localStorage.removeItem(key);
      }
    }
  }

  // Save on unload to persist current profile data
  function enableAutoSave() {
    window.addEventListener('beforeunload', () => {
      const id = getActiveProfileId();
      if (id) _saveCurrentToProfile(id);
    });
  }

  // Explicitly persist the current profile's data (call after reviews, etc.)
  function saveCurrentProfile() {
    const id = getActiveProfileId();
    if (id) _saveCurrentToProfile(id);
  }

  // Get summary stats for a profile (for profile selection screen)
  function getProfileStats(profileId) {
    const progressKey = _profileKey(profileId, 'srs_word_progress');
    const statsKey = _profileKey(profileId, 'srs_global_stats');
    try {
      const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
      const stats = JSON.parse(localStorage.getItem(statsKey) || '{}');
      const wordCount = Object.keys(progress).length;
      return {
        wordsStudied: Math.floor(wordCount / 2), // ~2 directions per word
        totalReviews: stats.totalReviews || 0,
        streak: stats.dailyStreak || 0,
      };
    } catch (e) {
      return { wordsStudied: 0, totalReviews: 0, streak: 0 };
    }
  }

  return {
    getProfiles,
    getActiveProfileId,
    getActiveProfile,
    setActiveProfile,
    enableAutoSave,
    saveCurrentProfile,
    getProfileStats,
  };
})();
