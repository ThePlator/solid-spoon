# ✅ SuperMind — Build TODO

Tracks the v1 build. Ordered by phase — **finish a phase before starting the next.** The golden rule: always have one working thing. Backend → Web → Extension → Mobile.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation (backend + sync)
*Goal: an item written by one client is readable by another.*

- [x] Create Firebase project (`second-brain-1f78f`, alias `brain`)
- [ ] Enable Email/Password auth *(manual — Firebase console → Authentication)*
- [~] Set up repo scaffolding (monorepo: `web/`, `extension/`, `mobile/`, `packages/core/`) — root `package.json` workspaces + `packages/core` done; client folders pending their phases
- [x] Add open-source hygiene files: `LICENSE` (MIT), `.gitignore`, `.env.example`
- [x] Write `firestore.rules` (per-user isolation) — done; ⏳ still needs emulator unit test
- [x] Write `firestore.indexes.json` (tags + searchTokens composite indexes)
- [x] Build `@supermind/core`: `firebase.ts`, `types.ts`, `auth.ts`, `saves.ts`, `tokens.ts`, `index.ts`
- [x] Add `firebase.json` (rules + indexes + emulator ports)
- [x] Deploy rules + indexes to `second-brain-1f78f` (`npm run deploy:rules`)
- [x] Register Web app + capture config
- [x] **Prove sync:** save written in one tab appeared live in another (`sync-test.html`) ✔
- [ ] Install deps (`npm install`) for the client builds
- [ ] Decide: ship `fetchMetadata` Cloud Function now, or defer (extension reads DOM directly)?

> **Phase 0 complete** — backend live, secured, and sync-proven on `second-brain-1f78f`.

## Phase 1 — Web library
*Goal: a usable (if manual) second brain on desktop.*

- [x] Next.js app + Firebase config from `.env.local`
- [x] Auth: signup / login / logout + route guard
- [x] Feed page: live `subscribeFeed`, reverse-chronological cards
- [x] Manual "add save" (link + note) — proves the write path before the extension exists
- [x] Quick text capture box (Note mode in composer)
- [x] Keyword search (`searchTokens` + `array-contains`)
- [x] Tag filter (auto-generated chips)
- [x] Item detail view: full text, link out, edit tags/note, delete
- [x] Empty state that explains how to save the first item
- [ ] Pagination (`limit` + infinite scroll) — deferred to Phase 4 polish

> **Phase 1 complete** — verified end-to-end in the browser against `second-brain-1f78f`. Only pagination deferred.

## Phase 2 — Browser extension (Chrome MV3)
*Goal: saving from any page lands in the web library.*

- [x] MV3 `manifest.json` (activeTab, scripting; action popup + keyboard command)
- [x] Page reader: title, canonical URL, `og:image`, selected text (via `chrome.scripting`, no content script needed)
- [x] Popup (React): preview + editable title + note/tags + Save button
- [x] Auth: popup has its own email/password login; Firebase persistence keeps session (simpler than web handoff)
- [x] Write to Firestore via `@supermind/core` `createSave` (no service worker needed)
- [x] Keyboard shortcut to open popup (Ctrl/Cmd+Shift+S)
- [x] Build verified (`vite build` → loadable `dist/`)
- [ ] **Load unpacked & verify** saves appear in the web library *(manual — needs your Chrome)*

> **Phase 2 built** — `extension/dist/` ready to load unpacked. Chosen popup-login over web token handoff (LLD §7 open Q) for reliability.

## Phase 3 — Mobile app (React Native / Expo)
*Goal: close the "save a reel while moving" loop.*

- [ ] Expo app + Firebase config
- [ ] Auth screens (reuse `@supermind/core`)
- [ ] Library screen: live feed list
- [ ] Quick capture FAB → note in ≤2 taps
- [ ] Share intent / share extension registered as a share target
- [ ] Save sheet prefilled from shared URL/text
- [ ] Build & run on device (Expo Go dev build → later sideload APK)

## Phase 4 — Polish
*Goal: pleasant to live in daily.*

- [ ] Offline write queue (Firestore local persistence)
- [ ] Duplicate detection by canonical URL (warn, don't block)
- [ ] Multi-token search ranking tuning
- [ ] Collections / better tag management
- [ ] Thumbnail caching to Cloud Storage on `og:image` failure
- [ ] Loading / error / `status:"error"` states everywhere

---

## Open decisions to resolve early
*(from PRD §12 and LLD §7 — flag at kickoff)*

- [ ] Extension ↔ web auth token sharing mechanism (before Phase 2)
- [ ] Thumbnail policy: reference remote `og:image` vs. always cache to Storage
- [ ] Auth providers: email/password only, or add Google/Apple? (Apple Sign-In becomes App-Store-mandatory if any social login exists)
- [ ] Chrome-only, or Chrome + Firefox for the first extension release
- [ ] Monorepo tooling: pnpm workspaces vs. turborepo

---

## Right now — next 3 steps
1. [ ] Create the Firebase project + enable Email/Password auth.
2. [ ] Scaffold the repo + open-source files (`LICENSE`, `.gitignore`, `.env.example`).
3. [ ] Write & emulator-test `firestore.rules`, then prove a cross-client write syncs.
