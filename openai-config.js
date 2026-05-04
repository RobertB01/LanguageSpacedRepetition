// OpenAI configuration — copy this to `openai-config.js` and fill in your key.
//
// `openai-config.js` is git-ignored so your real key never gets committed.
//
// SETUP:
// 1. Get a key at https://platform.openai.com/api-keys
//    (you'll need to add a payment method, but usage for this app is pennies)
// 2. Save this file as `openai-config.js` (same folder as index.html).
// 3. Paste your key below.
//
// SECURITY NOTE: Calling OpenAI directly from the browser exposes the key to
// anyone who views your site. For a personal app on a private GitHub Pages
// URL this is usually fine — you can also set a tight monthly spending cap
// in your OpenAI dashboard. For a public app, move the call to a Supabase
// Edge Function or a Cloudflare Worker so the key stays server-side.
//
// If this file is missing or the key is blank, the app silently falls back
// to the rule-based chatbot and disables AI features.

window.OPENAI_CONFIG = {
    provider: 'groq',
  apiKey: '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',
  model: 'llama-3.3-70b-versatile',  // cheap + good. swap for 'gpt-4o' if you want stronger.
};
