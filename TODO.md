# ✅ SuperMind — Build TODO

Tracks the build. **v1 is complete** and **v2 Feature A (AI summaries + auto-tagging)
is shipped.** See `PRD-SuperMind.md`, `docs/HLD.md`, `docs/LLD.md`, `docs/V2-PLAN.md`,
and `.claude/RULES.md`.

Legend: `[x]` done · `[~]` in progress · `[ ]` todo

Current version: **0.2.0 — released** (web live on Vercel · mobile `v0.2.0` APK · extension `ext-v0.2.0`)

---

## 🚀 Releases — v0.2.0 SHIPPED
- [x] **Web** deployed to Vercel (with enrichment env vars; daily cron)
- [x] **Mobile** EAS `v0.2.0` APK built + GitHub release published (marked **Latest**)
- [x] **Extension** `ext-v0.2.0` built, zipped, and published as a GitHub release
- [x] Release notes written for app + extension
- [ ] Announce v0.2.0 externally (GitHub/socials) — one-time, so existing users get the update banner going forward
- [ ] Verify share-sheet capture + update banner in the installed APK

---

## ✅ v1 — COMPLETE

### Phase 0 — Foundation (backend + sync)
- [x] Firebase project `second-brain-1f78f` (Auth + Firestore) + Email/Password auth
- [x] `firestore.rules` (per-user isolation + validation) + `firestore.indexes.json` — deployed
- [x] `@supermind/core` shared data layer (auth, saves, tokens, RN-aware firebase init)
- [x] Sync proven end-to-end

### Phase 1 — Web library (Next.js)
- [x] Auth + route guard, live feed, add (link/note), search, tags, detail, empty state
- [x] "MIND·OS" design system + Landing page (Vercel) with SEO (favicon, OG, robots, sitemap)
- [x] Login back button + forgot-password page
- [x] **Detail page: view-then-edit** (read view with summary, Edit button) + **live-updating** (`subscribeSave`)
- [x] Search-clear race fixed; **search matches AI tags** (folded into `searchTokens`)
- [ ] Pagination / infinite scroll (deferred — `fetchFeedPage` already in core)

### Phase 2 — Chrome extension (MV3)
- [x] One-click save popup (title/canonical/og:image/selection) + login + Ctrl/Cmd+Shift+S
- [x] Enrichment wiring (`configureEnrich`) + `host_permissions` for the enrich endpoint
- [x] Built + zipped `ext-v0.2.0`
- [x] Published `ext-v0.2.0` GitHub release with the zip

### Phase 3 — Mobile app (Android · Expo SDK 57)
- [x] Expo app + RN core (AsyncStorage auth, long-polling); tabs Library/Capture/Profile + stack
- [x] Login, live feed, capture, detail (view-then-edit, live-update), share-intent
- [x] App icon + adaptive icon + splash (MIND·OS mark)
- [x] **Feed: tag filtering rail, swipe-to-delete, pull-to-refresh, stats header**
- [x] **Profile page**: library + AI stats, auto-summarize toggle, change password, copy user ID, delete-all
- [x] **Share-sheet fix** — shared link routes to Capture (prefilled), not home
- [x] **EAS monorepo entry bug fixed** (removed stray root `app.json`/`eas.json`; build from `mobile/`)
- [x] EAS `v0.2.0` APK built + GitHub release published (marked Latest)

### App updates (off-store distribution)
- [x] **In-app update banner** — checks GitHub releases, prompts download for new APK
- [x] **EAS Update (OTA)** configured — silent JS updates (`updates` block, channels in `eas.json`)

---

## v2 — Intelligence layer

### ✅ A. AI summaries + auto-tagging — SHIPPED
> **Architecture changed from the original plan.** Instead of Cloud Functions +
> Claude + the Blaze plan, we used **Gemini + a Vercel serverless route** — no Blaze,
> no card required. Enrichment fires from the shared `createSave` (client-fire), with a
> daily Vercel cron sweep as backstop.
- [x] `enrichSave` (Gemini `gemini-2.5-flash`, structured JSON) → writes `summary` + `aiTags`
- [x] `POST /api/enrich` (Vercel route, Firebase Admin, token-verified, CORS for the extension)
- [x] Client-fire from `createSave` (`triggerEnrich`) across web + extension + mobile
- [x] `GET /api/enrich-sweep` backstop + `vercel.json` cron (**daily** — Hobby tier limit)
- [x] `enrichStatus` lifecycle + `enrichedAt`; `searchTokens` include AI tags
- [x] `npm run enrich:pending` local backfill script
- [x] Data model: `summary`, `aiTags`, `enrichStatus`, `enrichedAt` on `Save`
- [x] End-to-end verified against production Firebase + Gemini

### ⬜ Next v2 features
- [x] **Content extraction — SHIPPED** — fetches real page content before summarizing so
      summaries reflect the actual content, not the URL. *Big quality win; verified before/after.*
  - [x] `web/lib/extract.ts` — `extractContent(url)`: Reddit `.json` special-case; else free
        **Jina Reader** (`r.jina.ai/<url>`); 8s timeout, ~12k char cap, returns '' on failure
  - [x] Wired into `enrichSave.ts` prompt (links only; graceful fallback to title/URL)
  - [x] Optional env: `EXTRACT_ENABLED` (default on), `JINA_API_KEY` (free, higher rate limit)
  - [x] Before/after verified — GitHub README + Medium article summaries now content-accurate
  - [ ] Deploy to Vercel (web-only change)
  - Note: social (IG/LinkedIn/X) stays weak on the free path — paid Apify/Firecrawl is a later call
- [ ] **B. Embeddings + "ask your brain"** — semantic search (Voyage AI embeddings + Firestore
      vector search). Anthropic has no embeddings API.
- [ ] **C. Connections** — related saves via embedding similarity on the detail screen
- [ ] **D. Resurfacing + notifications** — scheduled sweep surfaces old saves; digest

---

## 🔜 Housekeeping / must-do
- [x] Merged + deployed v0.2.0 (web to Vercel; app + extension GitHub releases published)
- [x] **Rotated the exposed Firebase service-account key** (old key `df90e70d…` deleted; new key in Vercel env)
- [ ] Optional: GitHub Actions cron to hit `/api/enrich-sweep` more often than daily (free)
- [ ] `npm audit` pass; App Check + budget alerts before multi-user
- [ ] Optional: shrink APK (arm64-only + Proguard) — currently ~87 MB universal → ~40 MB

---

## Open decisions
- [ ] Social-link content (Instagram/LinkedIn/X): accept free-reader fragments vs. paid Apify/Firecrawl
- [ ] Auth providers: email/password only, or add Google/Apple?
- [ ] Thumbnail policy: reference remote `og:image` vs. cache to Storage
- [ ] Embeddings provider for Feature B (Voyage AI) + when to add vector index
