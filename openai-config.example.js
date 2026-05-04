// LLM provider configuration — copy this to `openai-config.js` (yes, keep the
// filename as openai-config.js for backwards compat) and fill in for whatever
// provider you want to use.
//
// `openai-config.js` is git-ignored so your real key never gets committed.
//
// =========================================================================
// CHOOSE A PROVIDER (uncomment ONE block):
// =========================================================================

// --- GROQ (free, no credit card, very fast) ---
// 1. Sign up at https://console.groq.com
// 2. Create an API key under "API Keys"
// 3. Uncomment this block:
// window.OPENAI_CONFIG = {
//   provider: 'groq',
//   apiKey: 'gsk_YOUR-KEY-HERE',
//   model: 'llama-3.3-70b-versatile',  // or 'llama-3.1-8b-instant' (faster)
// };

// --- MISTRAL (free tier, no credit card needed for La Plateforme) ---
// 1. Sign up at https://console.mistral.ai
// 2. Create an API key under "API Keys"
// 3. Uncomment this block:
// window.OPENAI_CONFIG = {
//   provider: 'mistral',
//   apiKey: 'YOUR-KEY-HERE',
//   model: 'mistral-small-latest',  // or 'open-mistral-7b' (free tier model)
// };

// --- OPENAI (requires payment method) ---
// window.OPENAI_CONFIG = {
//   provider: 'openai',
//   apiKey: 'sk-YOUR-KEY-HERE',
//   model: 'gpt-4o-mini',
// };

// --- OPENROUTER (one key for many models, supports more payment methods) ---
// window.OPENAI_CONFIG = {
//   provider: 'openrouter',
//   apiKey: 'sk-or-YOUR-KEY-HERE',
//   model: 'meta-llama/llama-3.3-70b-instruct',
// };

// --- CUSTOM (any OpenAI-compatible endpoint) ---
// window.OPENAI_CONFIG = {
//   provider: 'custom',
//   baseUrl: 'https://your-endpoint/v1',
//   apiKey: 'YOUR-KEY',
//   model: 'your-model',
// };

// SECURITY NOTE: Calling these APIs directly from the browser exposes the key
// to anyone who views your site. For a personal app this is usually fine —
// most providers let you set a tight monthly spending cap.
//
// If this file is missing or apiKey is blank, the app falls back to the
// rule-based chatbot and disables AI features.
