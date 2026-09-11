# ✅ SuperMind — Build TODO

Tracks the build. **v1 (Tier 1) is complete** across all four surfaces. v2 (the AI
intelligence layer) is next. See `PRD-SuperMind.md`, `docs/HLD.md`, `docs/LLD.md`,
and `.claude/RULES.md`.

Legend: `[x]` done · `[~]` in progress · `[ ]` todo

---

## ✅ v1 — COMPLETE

### Phase 0 — Foundation (backend + sync)
- [x] Firebase project `second-brain-1f78f` (Auth + Firestore)
- [x] Email/Password auth enabled
- [x] `firestore.rules` (per-user isolation + validation) + `firestore.indexes.json` — deployed
- [x] `@supermind/core` shared data layer (auth, saves, tokens, RN-aware firebase init)
- [x] Emulator config + open-source files (LICENSE, .gitignore, .env.example)
- [x] Sync proven end-to-end

### Phase 1 — Web library (Next.js)
- [x] Auth + route guard, live feed, add (link/note), search, tags, detail/edit/delete, empty state
- [x] "MIND·OS" design system (dark console, lime accent, Bricolage/Familjen/JetBrains fonts)
- [x] Verified end-to-end in browser
- [ ] Pagination / infinite scroll (deferred — `fetchFeedPage` already in core)

### Phase 2 — Chrome extension (MV3)
- [x] One-click save popup; reads title/canonical/og:image/selection via `chrome.scripting`
- [x] Popup email/password login (Firebase persistence keeps session)
- [x] Writes via `@supermind/core`; Ctrl/Cmd+Shift+S shortcut
- [x] Build verified (`vite build` → loadable `extension/dist/`)
- [ ] Load unpacked in your Chrome & save a real page *(manual)*

### Phase 3 — Mobile app (Android · Expo SDK 57)
- [x] Expo app + RN-adapted core (AsyncStorage auth persistence, long-polling)
- [x] React Navigation: bottom tabs **Library / Capture / Profile** + stack for detail
- [x] Login, live feed + search, capture (note/link), detail (edit/delete), profile (stats, sign out)
- [x] Share-intent registered (Expo-Go-safe stub; real in APK build)
- [x] **App icon + adaptive icon + splash screen** (MIND·OS mark) wired in `app.json`
- [x] Runs on device via Expo Go — full in-app UX verified
- [ ] Build sideloadable **APK** via EAS (see README / "How to build the APK" below)
- [ ] Verify share-sheet capture in the APK build

---

## ⬜ v2 — Intelligence layer (the "no graveyard" features)

Dependency-ordered. Needs Blaze plan + Claude API key (held server-side in Cloud Functions).

- [ ] **A. AI summaries + auto-tagging on save** — Cloud Function calls Claude API on ingest;
      writes `summary` + `aiTags`. Highest anti-graveyard value.
- [ ] **B. Embeddings + "ask your brain"** — semantic search via Firestore vector search.
- [ ] **C. Connections** — related saves via embedding similarity on the detail screen.
- [ ] **D. Resurfacing + notifications** — scheduled function + email digest brings old saves back.

---

## 🔜 Cross-cutting / housekeeping
- [ ] **Commit** Phases 0–3 (currently uncommitted)
- [ ] `fetchMetadata` Cloud Function (richer link previews for mobile/web) — optional, needs Blaze
- [ ] `npm audit` pass before any public release
- [ ] App Check + budget alert before multi-user

---

## Open decisions (see LLD §7 / PRD §12)
- [ ] Auth providers: email/password only, or add Google/Apple?
- [ ] Thumbnail policy: reference remote `og:image` vs. cache to Storage
- [ ] Chrome-only vs. Chrome + Firefox extension
- [ ] v2 flagship for the demo identity: Reddit thread capture vs. "ask your brain"
