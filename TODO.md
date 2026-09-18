# ✅ SuperMind — Build TODO

Tracks the build. **v1 is complete.** **v2 Feature A (AI summaries + auto-tagging),
content extraction, and the brain map (embeddings + graph) are shipped.** Next up is the
**"compiler" layer** — connections, contradictions, and "ask your brain" (see
`docs/V2-PLAN.md` §10). See `PRD-SuperMind.md`, `docs/HLD.md`, `docs/LLD.md`,
`docs/V2-PLAN.md`, and `.claude/RULES.md`.

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

### ✅ Content extraction — SHIPPED
- [x] **Content extraction** — fetches real page content before summarizing so
      summaries reflect the actual content, not the URL. *Big quality win; verified before/after.*
  - [x] `web/lib/extract.ts` — `extractContent(url)`: Reddit `.json` special-case; else free
        **Jina Reader** (`r.jina.ai/<url>`); 8s timeout, ~12k char cap, returns '' on failure
  - [x] Wired into `enrichSave.ts` prompt (links only; graceful fallback to title/URL)
  - [x] Optional env: `EXTRACT_ENABLED` (default on), `JINA_API_KEY` (free, higher rate limit)
  - [x] Before/after verified — GitHub README + Medium article summaries now content-accurate
  - [x] Deployed to Vercel
  - Note: social (IG/LinkedIn/X) stays weak on the free path — paid Apify/Firecrawl is a later call

### ✅ Embeddings + Brain Map — SHIPPED
> **Architecture changed from the original plan.** Instead of Voyage AI + a Firestore
> vector index, we used **Gemini `gemini-embedding-001`** (768-dim) and compute cosine
> similarity **in memory** in the graph API — no vector index needed at personal scale.
- [x] `web/lib/embed.ts` — `embedText` (Gemini, 768 dims, SEMANTIC_SIMILARITY) + `cosine`
- [x] Embeddings written to `users/{uid}/vectors/{saveId}` on enrich
- [x] `GET /api/graph` — nodes + top-K similarity edges + label-propagation clusters
- [x] **`/map` page** — react-force-graph canvas, favicon nodes, cluster colors, focus
      mode, info panel (related saves + %), 1h localStorage cache, fit/rebuild controls
- [x] **Mobile Map tab** — WebView loads the deployed `/map?embed=1&token=…`; node taps
      `postMessage` back → native Detail
- [x] `npm run embed:backfill` local backfill script
- [x] Deployed (web + mobile WebView); mobile Map tab needs new APK (native WebView)

### ⬜ Next v2 features — the "compiler" layer (LLM Wiki inspired)
> **New direction** (see `docs/V2-PLAN.md` §10). Karpathy's *LLM Wiki* names the gap:
> today each save is enriched **in isolation** — a new save never changes an old one.
> That's a **library**. The next step is a **compiler**: at ingest, use the neighbors
> we *already compute* to write back connections + contradictions, and periodically
> lint the whole library. We already have every piece (embeddings, neighbor search,
> Gemini) — it's mostly wiring, not new infrastructure.
- [ ] **B. Connection write-back (Ingest touches neighbors)** — on enrich, find top-K
      neighbors (reuse graph logic) and write a short `connections` field
      ("extends X · same topic as Y") onto the save. No new infra.
- [ ] **B2. Contradiction flagging** — when high-similarity neighbors make *differing*
      claims, have Gemini flag it → `contradictions` field. The differentiator no other
      second-brain has. One extra Gemini call at ingest (neighbor text already in hand).
- [ ] **C. "Ask your brain" (Query)** — semantic Q&A. Per the LLM Wiki article, at personal
      scale feed Gemini a compact **index** of titles+summaries (no Firestore vector index
      needed) → it picks relevant saves → synthesizes an answer. Answers are **savable as
      new nodes** so explorations compound.
- [ ] **D. Lint mode + "what changed" log** — a second mode for the existing sweep:
      find contradictions, stale claims, orphan saves, missing hub topics. Append dated
      entries to a `users/{uid}/log` feed → surface a "3 new connections, 1 contradiction"
      digest on Feed/Profile (the retention payoff).
- [ ] **E. Resurfacing** — scheduled sweep surfaces forgotten-but-relevant old saves; digest
- [ ] **Deletion cascade** — deleting a save must remove its vector + derived
      connections/contradictions (compiler risk: "a bad source touches 15 pages")

---

## 🔜 Housekeeping / must-do
- [x] Merged + deployed v0.2.0 (web to Vercel; app + extension GitHub releases published)
- [x] **Rotated the exposed Firebase service-account key** (old key `df90e70d…` deleted; new key in Vercel env)
- [x] **Enrichment reliability** — `triggerEnrich` retries on cold-started shares (shipped to mobile via OTA); GitHub Actions 10-min sweep (`CRON_SECRET` secret set) backstops the daily Vercel cron
- [ ] `npm audit` pass; App Check + budget alerts before multi-user
- [ ] Optional: shrink APK (arm64-only + Proguard) — currently ~87 MB universal → ~40 MB

---

## Open decisions
- [ ] Social-link content (Instagram/LinkedIn/X): accept free-reader fragments vs. paid Apify/Firecrawl
- [ ] Auth providers: email/password only, or add Google/Apple?
- [ ] Thumbnail policy: reference remote `og:image` vs. cache to Storage
- [x] ~~Embeddings provider~~ — **RESOLVED: Gemini `gemini-embedding-001`, in-memory cosine (no vector index)**
- [ ] "Ask your brain" retrieval: index-based (Gemini picks from a titles+summaries list, per
      LLM Wiki) vs. embedding vector search. Article recommends index at personal scale.
- [ ] Contradiction detection: run on every ingest (cost) vs. only in the periodic Lint sweep
