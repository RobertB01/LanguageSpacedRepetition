# 🇪🇸 Spanish SRS — Vocabulary Trainer

A browser-based Spanish vocabulary learning app that uses **spaced repetition**, **active recall**, **text-to-speech**, and other evidence-based memory techniques to help you learn the top 500 most frequent Spanish words.

## Features

- **500 Most Frequent Spanish Words** — with translations, example sentences, word types, and gender markers
- **Spaced Repetition (SM-2 Algorithm)** — intelligent scheduling with per-word tracking of ease factor, intervals, and review history
- **Active Recall** — Recognition mode (see Spanish, think of English) and Production mode (type the Spanish word)
- **Text-to-Speech** — Native browser TTS with Spanish voice for words and sentences, adjustable speed
- **Accent Tolerance** — "cafe" is accepted for "café" in production mode
- **Elaborative Encoding** — Example sentences shown after every answer with the target word highlighted
- **Interleaving** — Words are mixed randomly across types (nouns, verbs, adjectives, etc.)
- **Desirable Difficulty** — Due cards sorted hardest-first; new cards limited per session
- **Dark Theme** — High contrast, minimal, responsive design for desktop and mobile
- **Persistent Progress** — All data saved to localStorage; export/import as JSON
- **Session Tracking** — Cards reviewed, accuracy, streaks, response times
- **Dashboard** — Visual progress bar, daily streaks, 7-day accuracy, forecast, struggled words

## Getting Started

1. Open `index.html` in a modern browser (Chrome or Edge recommended for best TTS support)
2. Start studying! The app will present new cards and schedule reviews automatically
3. Your progress is saved in the browser's localStorage

**No build step, no dependencies, no server required** — just open the HTML file.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Reveal answer (recognition mode) |
| `Enter` | Check answer (production mode) |
| `1` | Rate: Again |
| `2` | Rate: Hard |
| `3` | Rate: Good |
| `4` | Rate: Easy |

## File Structure

```
index.html      — Main HTML entry point
styles.css      — Dark theme CSS with responsive design
app.js          — UI controller and study flow logic
srs.js          — SM-2 spaced repetition algorithm and data persistence
tts.js          — Web Speech API text-to-speech module
vocabulary.js   — 500 word vocabulary dataset
```

## Settings

- **New cards per session** (5-30)
- **Auto-pronounce** on/off
- **Speech speed** — Slow / Normal / Fast
- **Study mode** — Recognition / Production / Mixed
- **Export/Import** progress as JSON backup
- **Reset** all progress

## Memory Science Principles

| Technique | Implementation |
|-----------|---------------|
| Spaced Repetition (Ebbinghaus/SM-2) | Per-word interval tracking with exponential growth |
| Active Recall (Karpicke & Roediger) | Recognition and production modes; never just shows the answer |
| Elaborative Encoding (Craik & Lockhart) | Example sentences with highlighted target word |
| Dual Coding (Paivio) | Visual text + audio TTS for words and sentences |
| Interleaving (Rohrer & Taylor) | Random mixing of word types in each session |
| Desirable Difficulty (Bjork) | Hardest cards first; production mode weighted higher |

## Browser Compatibility

- **Chrome / Edge** — Full support (best TTS voices)
- **Firefox** — Works, limited TTS voice selection
- **Safari** — Works, may have TTS quirks
- **Mobile browsers** — Responsive design, touch-friendly

## License

MIT