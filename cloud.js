// Cloud sync via Supabase — stores one row per profile in the `progress` table.
// If supabase-config.js is missing or invalid, this module is a no-op and the
// app falls back to localStorage-only.

const Cloud = (() => {
  let client = null;
  let enabled = false;

  function init() {
    try {
      const cfg = window.SUPABASE_CONFIG;
      if (!cfg || !cfg.url || !cfg.anonKey) return false;
      if (cfg.url.includes('YOUR-PROJECT') || cfg.anonKey.includes('YOUR-ANON')) return false;
      if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.warn('Supabase SDK not loaded; cloud sync disabled.');
        return false;
      }
      client = window.supabase.createClient(cfg.url, cfg.anonKey);
      enabled = true;
      console.log('Cloud sync enabled.');
      return true;
    } catch (e) {
      console.warn('Cloud init failed:', e);
      return false;
    }
  }

  function isEnabled() { return enabled; }

  // Load cloud snapshot for a profile. Returns the stored payload or null.
  async function load(profileId) {
    if (!enabled || !profileId) return null;
    try {
      const { data, error } = await client
        .from('progress')
        .select('data, updated_at')
        .eq('profile_id', profileId)
        .maybeSingle();
      if (error) {
        console.warn('Cloud load failed:', error.message || error);
        return null;
      }
      if (!data) return null;
      return { payload: data.data, updatedAt: data.updated_at };
    } catch (e) {
      console.warn('Cloud load error:', e);
      return null;
    }
  }

  // Save (upsert) a payload for a profile.
  async function save(profileId, payload) {
    if (!enabled || !profileId) return false;
    try {
      const { error } = await client
        .from('progress')
        .upsert({
          profile_id: profileId,
          data: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'profile_id' });
      if (error) {
        console.warn('Cloud save failed:', error.message || error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Cloud save error:', e);
      return false;
    }
  }

  return { init, isEnabled, load, save };
})();
