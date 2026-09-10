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
- [ ] Install deps (`npm install`) and configure the Firebase Emulator Suite
- [ ] **Prove sync:** throwaway button writes a save → appears on another client/tab
- [ ] Decide: ship `fetchMetadata` Cloud Function now, or defer (extension reads DOM directly)?

## Phase 1 — Web library
*Goal: a usable (if manual) second brain on desktop.*

- [ ] Next.js app + Firebase config from `.env.local`
- [ ] Auth: signup / login / logout + route guard
- [ ] Feed page: live `subscribeFeed`, reverse-chronological cards
- [ ] Manual "add save" (link + note) — proves the write path before the extension exists
- [ ] Quick text capture box
- [ ] Keyword search (`searchTokens` + `array-contains`)
- [ ] Tag filter
- [ ] Item detail view: full text, link out, edit tags/note, delete
- [ ] Empty state that explains how to save the first item
- [ ] Pagination (`limit` + infinite scroll)

## Phase 2 — Browser extension (Chrome MV3)
*Goal: saving from any page lands in the web library.*

- [ ] MV3 `manifest.json` (activeTab, scripting, storage; action popup)
- [ ] Content script: read title, canonical URL, `og:image`, selected text
- [ ] Popup (React): preview + note/tags + Save button
- [ ] Auth handoff between extension and hosted web login
- [ ] Service worker: perform the Firestore write
- [ ] Keyboard shortcut to save
- [ ] Load unpacked & verify saves appear in the web library

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
