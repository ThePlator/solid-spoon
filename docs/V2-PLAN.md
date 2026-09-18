# SuperMind v2 — Intelligence Layer Plan

**Companion to:** `../PRD-SuperMind.md`, `HLD.md`, `LLD.md`
**Status:** Partly shipped — see the banner below
**Owner:** Sameer
**Premise:** v1 (capture → store → retrieve) is complete across web, extension, and mobile. v2 adds the intelligence layer that stops the library becoming a graveyard: summaries, auto-tags, semantic search, connections, and resurfacing.

> This is a plan, not an implementation. It commits the architecture and sequencing so the build is additive and doesn't require reworking v1.

> ## ⚠️ ARCHITECTURE PIVOT — read `§10` first
> **§2–§9 below are the ORIGINAL plan and are now historical.** The shipped
> architecture is different and **avoids the Blaze plan entirely**:
> - ❌ ~~Cloud Functions~~ → ✅ **Vercel serverless routes** + client-fire from `createSave`
> - ❌ ~~Claude (Haiku 4.5)~~ → ✅ **Gemini** (`gemini-2.5-flash` summaries/tags, `gemini-embedding-001` embeddings)
> - ❌ ~~Voyage AI + Firestore vector index~~ → ✅ **Gemini embeddings + in-memory cosine**
> - ❌ ~~Blaze plan~~ → ✅ **free tier** (no card)
>
> **Shipped:** Feature A (summaries + tags), content extraction, embeddings, and the
> **brain map**. **Next:** the "compiler" layer (§10). Keep §2–§9 for the reasoning trail,
> but build against §10.

---

## 1. Why v2 (the thesis)

v1 makes saving fast and retrieval basic. But a keyword-only library still rots — you forget *what* you saved and *why*. The anti-graveyard features are specifically:

- **Summaries** → remember why you saved something without reopening it.
- **Auto-tags** → remove the manual-organizing friction that makes people quit.
- **"Ask your brain"** → find by meaning, not exact words.
- **Connections** → related saves surface each other.
- **Resurfacing** → old saves come *back* to you (the single most direct fix).

Native mobile is *not* on this list. It's deferred — it does the least for the "connected brain" vision per unit of effort.

---

## 2. What changes architecturally

v1's "clients talk to Firestore directly, no server" model **stops being sufficient** for v2 — three things now require server-side code:

1. **Secrets.** The Claude API key and embeddings key must never ship in a client. They live in Cloud Functions config.
2. **Triggers.** Enrichment should run automatically when a save is created, not when a client remembers to ask.
3. **Scheduled work.** Resurfacing runs on a timer with no user present.

So v2 introduces **Cloud Functions as the de-facto backend** — exactly what the HLD predicted ("you're not avoiding a backend, you're deferring it").

```
                         ┌─────────────────────────────────────────────┐
   client writes save ──►│ Firestore  users/{uid}/saves/{id}           │
                         └───────┬─────────────────────────────────────┘
                                 │ onCreate / onUpdate trigger
                                 ▼
                    ┌────────────────────────────┐
                    │ enrichSave (Cloud Function) │
                    │  1. fetch page text (links) │
                    │  2. Claude → summary + tags │──► Claude API (Haiku 4.5)
                    │  3. embeddings → vector      │──► Embeddings provider (Voyage)
                    │  4. write back to the doc    │
                    └────────────────────────────┘

   scheduled (cron) ──► resurface (Cloud Function) ──► email digest / push
```

### New infrastructure
- **Blaze plan** — required for Functions + outbound network calls (already needed for `fetchMetadata`).
- **Cloud Functions** — `enrichSave` (Firestore trigger), `askBrain` (callable), `resurface` (scheduled).
- **Firestore vector index** — for embedding similarity search (native feature, no extra service).
- **Secrets** — Claude API key + embeddings key in Functions secret config (never in a client).

---

## 3. Data model additions (all additive)

Firestore is schemaless, so these are new fields on existing `saves` docs — **no migration**, only a backfill script for old saves.

| Field | Type | Written by | Feature |
|---|---|---|---|
| `summary` | string \| null | `enrichSave` | AI summaries |
| `aiTags` | array<string> | `enrichSave` | auto-tagging (kept separate from user `tags`) |
| `embedding` | vector<768/1024> | `enrichSave` | semantic search + connections |
| `enrichment` | `{ status, model, at, error? }` | `enrichSave` | observability / retries |
| `lastSurfacedAt` | timestamp \| null | `resurface` | resurfacing (spaced repetition) |
| `surfaceCount` | number | `resurface` | resurfacing weighting |

**Design decisions:**
- Keep `aiTags` **separate** from user `tags` — never overwrite the user's own tags; merge only for filtering/search.
- `embedding` uses Firestore's native `Vector` type; a vector index is declared in `firestore.indexes.json`.
- `enrichment.status`: `pending` → `done` → `error`, so failed enrichments are retryable and visible.

---

## 4. Features, in dependency order

### Step A — AI summaries + auto-tagging *(build first)*
**Highest anti-graveyard value per unit effort; unblocks nothing else.**

- **Trigger:** Firestore `onCreate` for `users/{uid}/saves/{id}`.
- **Flow:** for a `link`, fetch page text (reuse/extend `fetchMetadata`); for a `note`, use the text directly → send to Claude → get `{ summary, tags }` → write back.
- **Model:** **Claude Haiku 4.5** (`claude-haiku-4-5`, $1/$5 per 1M tokens) — summaries/tagging are simple, high-volume, cost-sensitive. (Opus 5 is the default for hard reasoning; Haiku is the right call here. Sonnet 5 if quality needs a bump.)
- **Reliability:** use **structured outputs** (`output_config.format` with a JSON schema) so `tags` is always a valid string array and `summary` a string — no parsing guesswork.
- **UI:** summaries show on the card and detail view; `aiTags` render as suggested tags the user can accept/reject.

### Step B — Embeddings + "Ask your brain" *(the flagship)*
**Semantic retrieval — find by meaning.**

- ⚠️ **Anthropic has no embeddings API.** Use a dedicated provider — **Voyage AI** (Anthropic's recommended partner); confirm current model + pricing before building.
- **Ingest:** `enrichSave` also generates an embedding of `title + summary + text` and stores it as a Firestore `Vector`.
- **Query:** a callable `askBrain` function embeds the user's natural-language query and runs a Firestore **`findNearest`** vector query scoped to `users/{uid}/saves`, returning the top-k by cosine distance.
- **Optional:** feed the top-k back through Claude to synthesize a direct answer ("According to 3 things you saved…") — RAG over your own library.
- **UI:** a second search mode ("Ask" vs "Search") on web and mobile.

### Step C — Connections *(nearly free once B exists)*
- On the detail screen, run a `findNearest` against the current save's own `embedding` → "Related saves."
- No new model calls, no new data — pure reuse of Step B's vectors.

### Step D — Resurfacing + notifications *(the direct graveyard killer)*
- **Scheduled Cloud Function** (cron, e.g. daily) selects saves to resurface using a spaced-repetition-ish weighting (`createdAt` age, `lastSurfacedAt`, `surfaceCount`, maybe tag/embedding relevance to recent activity).
- **Delivery:**
  - **Email digest first** — cheap, no device permissions (send via a transactional email provider or a Firebase extension). "3 things worth revisiting."
  - **Push later** — needs FCM + notification permission on mobile/web; more setup.
- Updates `lastSurfacedAt` / `surfaceCount` so the same items don't repeat.

---

## 5. Cost model (honest)

v2 is **no longer $0**, but stays cheap at personal scale.

| Item | Cost driver | Solo estimate |
|---|---|---|
| Cloud Functions (Blaze) | invocations + compute | ~$0 (within free allowance) |
| Claude Haiku 4.5 (summaries+tags) | ~1–2K tokens per save | fractions of a cent per save → **a few $/month** even at heavy use |
| Embeddings (Voyage) | tokens per save + per query | **cents/month** at personal scale |
| Firestore vector search | reads per query | negligible solo |
| Email digest | per email | free tier covers a daily solo digest |

**Realistic:** **~$1–5/month** for a single heavy user. Set a **budget alert**. For open-source cloners, document that v2 features require their own Claude + Voyage keys and a Blaze project.

---

## 6. Security additions

- **API keys server-side only** — Claude + Voyage keys in Cloud Functions secret config; never in `NEXT_PUBLIC_*`, `VITE_*`, `EXPO_PUBLIC_*`, or `app.json`.
- **Rules unchanged** for user data; new AI fields are written by the Function (admin SDK bypasses rules) and read-only to clients (tighten rules so clients can't forge `aiTags`/`summary`).
- **`askBrain` is a callable** requiring `request.auth` — scope every vector query to the caller's uid.
- **Rate/cost guard** — cap enrichment retries; consider a per-user daily enrichment ceiling so a runaway loop can't rack up API spend.
- Add these to `.claude/RULES.md` when the build starts.

---

## 7. Build sequence (maps to features)

| Phase | Deliverable | Proves |
|---|---|---|
| **v2.0** | Blaze + Cloud Functions scaffold + secrets + `enrichSave` skeleton (writes `enrichment.status`) | the trigger fires and can write back |
| **v2.1** | **Step A** — summaries + auto-tags via Haiku 4.5 (structured outputs); UI surfaces them | the anti-graveyard core works |
| **v2.2** | Backfill script for existing saves; retry path for `enrichment.status = error` | old library gets enriched |
| **v2.3** | **Step B** — embeddings on ingest + `askBrain` callable + Firestore vector index + "Ask" UI | semantic retrieval works |
| **v2.4** | **Step C** — related saves on detail screen | connections |
| **v2.5** | **Step D** — scheduled resurfacing + email digest | the graveyard fix |
| **v2.6** | Push notifications (FCM), digest tuning | polish |

**Prerequisite for a meaningful build:** ~50–100 real saves. AI features on 5 test items prove nothing; enrichment quality and semantic search are only demonstrable on a real library. Keep using v1 to accumulate them while v2.0 is scaffolded.

---

## 8. Open decisions (resolve before/early in build)

1. ~~**Model for enrichment.**~~ **RESOLVED → configurable, default Haiku 4.5.** The model ID is read from Functions config (`ENRICH_MODEL`, default `claude-haiku-4-5`) so it can be swapped to `claude-sonnet-5` per-deploy without a code change. Compare output on real saves before committing.
2. **Embeddings provider:** Voyage AI (Anthropic-recommended) vs an open/self-hostable model. Confirm current Voyage model + pricing.
3. **Flagship for the demo identity (PRD §12 Q2):** "Ask your brain" (Step B) vs Reddit whole-thread capture. This plan assumes "ask your brain."
4. **Digest channel first:** email (recommended, cheap, no permissions) vs push (needs FCM + permissions).
5. **Enrichment on edit:** re-enrich when a user edits a save's text, or only on create? (Affects cost.)
6. **Backfill trigger:** one-off script vs a "enrich now" button per save.

---

## 9. Explicitly still out of scope

Even in v2: native mobile parity for the AI features can lag web; voice capture and screenshot OCR remain later; Reddit/LinkedIn comment capture is a separate track (PRD Tier 2/3) not required by the intelligence layer. Hold the line — v2 is the five features in §4, not everything at once.

---

*The decision that still gates the build is §8.2 (embeddings provider). Everything else can start once v2.0 scaffolding + a Blaze upgrade are in place.*

---

## Appendix A — `enrichSave` design (Step A + B, detailed)

The heart of v2. One Firestore-triggered function does summary, tags, and (Step B) embedding. Designed to be **idempotent, cheap, and self-healing**.

### Trigger & guard
- **Trigger:** `onDocumentCreated("users/{uid}/saves/{saveId}")`. (Also `onDocumentUpdated` later, gated on whether `text`/`url` actually changed — see §8.5.)
- **Idempotency guard:** exit immediately if `enrichment.status === "done"`. Prevents double-spend if the trigger re-fires (retries, backfill overlap).
- **Cost guard:** before calling the API, check a per-user daily counter (`users/{uid}.enrichCountToday`, reset by the scheduled function). If over the ceiling (e.g. 200/day), mark `enrichment.status = "deferred"` and stop — a runaway client loop can't rack up spend.

### Flow (pseudocode — not final code)
```
on save created (uid, saveId, data):
  if data.enrichment?.status == "done": return
  set enrichment.status = "pending"

  # 1. gather source text
  if data.type == "link":
     text = fetchPageText(data.url)         # reuse/extend fetchMetadata; cap ~8k tokens
  else:
     text = data.text

  # 2. summarize + tag in ONE Claude call (structured output)
  result = claude.messages.create(
     model = config.ENRICH_MODEL,            # default claude-haiku-4-5
     max_tokens = 1024,
     output_config = { format: { type: "json_schema", schema: ENRICH_SCHEMA } },
     system = ENRICH_SYSTEM_PROMPT,
     messages = [{ role: "user", content: buildPrompt(data.title, text) }],
  )
  # result.summary : string, result.tags : string[]   (guaranteed by schema)

  # 3. embed (Step B)
  vec = voyage.embed(data.title + "\n" + result.summary + "\n" + text)

  # 4. write back (single update, admin SDK)
  update save:
     summary   = result.summary
     aiTags    = normalize(result.tags)      # lowercase, dedupe, cap 8
     embedding = FieldValue.vector(vec)
     enrichment = { status:"done", model:config.ENRICH_MODEL, at: now }
  increment users/{uid}.enrichCountToday

on error e:
  update save.enrichment = { status:"error", at: now, error: e.message }
  # retried by the reconcile pass (v2.2) or a manual "enrich now" button
```

### Structured-output schema (guarantees valid JSON)
```jsonc
ENRICH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },            // 1–3 sentences, why-you-saved-it framing
    tags:    { type: "array", items: { type: "string" } }  // 3–6 lowercase topical tags
  },
  required: ["summary", "tags"]
}
```
Using `output_config.format` means `result.tags` is **always** a valid string array — no `JSON.parse` guessing, no malformed-output branch.

### Notes
- **One API call** does both summary and tags (cheaper than two).
- **`aiTags` stays separate from user `tags`** — the UI offers them as accept/reject chips; accepted ones move into `tags`.
- **Embedding text** is `title + summary + text` so semantic search matches on the distilled meaning, not just raw body.
- **Failure is non-fatal** — the save still exists and is usable; enrichment just retries.

---

## Appendix B — resurfacing algorithm (Step D, detailed)

Goal: bring back a *small, well-chosen* set of old saves — not random, not everything. Runs daily as a scheduled Cloud Function.

### Candidate selection per user
Score each save and pick the top N (e.g. 3–5) for the digest:

```
score(save) =
      age_weight        # older-but-not-ancient scores higher (spaced repetition curve)
    * novelty_weight    # penalize recently surfaced (lastSurfacedAt close → low)
    * unfinished_weight # saves never opened/edited since creation score higher
    * relevance_weight  # optional: embedding similarity to the user's recent saves
```

- **age_weight:** a curve that peaks around "long enough to forget, not so old it's irrelevant" (e.g. 1 week – 3 months), tapering after.
- **novelty_weight:** `0` if surfaced in the last ~14 days, ramping to `1`; multiply by a decay on `surfaceCount` so the same item doesn't dominate.
- **unfinished_weight:** boost saves whose `updatedAt == createdAt` (never revisited) — the graveyard candidates.
- **relevance_weight (optional, needs Step B):** cosine similarity of the save's `embedding` to the centroid of the user's last ~10 saves → surfaces things related to what they're currently into.

### Delivery & bookkeeping
- Compose a digest ("3 things worth revisiting") → send via email (Step D.1) or push (Step D.2).
- For each surfaced save: set `lastSurfacedAt = now`, `surfaceCount += 1`.
- Skip users with no eligible candidates (don't send empty digests).

### Why this over "random old save"
Random resurfacing feels like noise and trains users to ignore the digest. The weighting specifically targets **forgotten-but-relevant** items, which is what makes resurfacing the graveyard fix rather than more clutter.

### Tuning
The weights are guesses until there's real usage. Ship with sensible defaults, make them config constants, and adjust based on whether surfaced items actually get opened (track a `surfacedOpened` event later).

---

## 10. The compiler layer — LLM Wiki direction *(current plan)*

> Supersedes §2–§9's *provider* choices (see the banner at the top). The **operations**
> below are the live roadmap. Inspired by Karpathy's *LLM Wiki* pattern.

### 10.1 The thesis: library → compiler

Everything shipped so far (summaries, tags, embeddings, the brain map) enriches each save
**in isolation**. A new save never changes an old one. In the LLM Wiki framing that makes
SuperMind a **library** (store + retrieve; meaning re-derived at query time), not a
**compiler** (integrate each source into the existing knowledge; synthesis kept current).

The gap — and the whole opportunity — is the **middle layer that gets rewritten as sources
arrive**. We don't have it yet.

| LLM Wiki layer | SuperMind today | Status |
|---|---|---|
| **Raw sources** (immutable) | `users/{uid}/saves` (link/note + extracted content) | ✅ |
| **The wiki** (LLM-owned, interlinked synthesis) | — per-save summaries only, no cross-save synthesis | ❌ **the frontier** |
| **The schema** (how to maintain) | — no per-user profile guiding enrichment | ⬜ cheap add |

### 10.2 The three operations (our roadmap)

**Ingest** ✅ *(exists, but stops at the save)* — enrich pipeline: extract → summarize →
tag → embed. The LLM Wiki ingest "touches 10–15 pages"; ours touches 1. **Next: make ingest
touch neighbors** (10.3-B).

**Query** ⬜ *(unbuilt — "ask your brain")* — natural-language Q&A over the library. Key
insight we were missing: **good answers get filed back as new saves**, so explorations
compound instead of vanishing into chat. Article's scale note: at ~100 sources, feeding the
LLM a **compact index** (titles + summaries) works "surprisingly well" and **avoids
embedding-RAG infrastructure** — so Query does *not* require a Firestore vector index. We
keep Gemini embeddings for the *map*; Query can be index-based.

**Lint** ⬜ *(unbuilt — the differentiator)* — periodic health-check: contradictions between
saves, stale claims superseded by newer sources, orphans (no similar neighbors), missing hub
topics. Our GitHub Actions sweep already runs every 10 min — **Lint is a second mode for it**.

### 10.3 Concrete build order (all reuse existing infra)

| Step | Deliverable | Reuses |
|---|---|---|
| **B — Connection write-back** | On enrich, compute top-K neighbors and write a `connections` field ("extends X · same topic as Y") | graph API's cosine + top-K logic |
| **B2 — Contradiction flagging** | When high-similarity neighbors make *differing* claims, Gemini flags → `contradictions` field | neighbor text already fetched at ingest; one extra Gemini call |
| **C — Ask your brain (Query)** | Index-based Q&A (Gemini picks from titles+summaries list); answers savable as new nodes | Gemini; no vector index |
| **D — Lint + log** | Sweep's second mode finds contradictions/stale/orphans; appends dated entries to `users/{uid}/log`; surfaces a "what changed" digest on Feed/Profile | existing sweep + GH Actions cron |
| **E — Resurfacing** | Scheduled sweep surfaces forgotten-but-relevant saves (see Appendix B algorithm) | sweep |

### 10.4 New data model additions (additive, no migration)

| Field | Type | Written by | Feature |
|---|---|---|---|
| `connections` | array<`{id, relation, title}`> | enrich (B) | related-save write-back |
| `contradictions` | array<`{id, note, title}`> | enrich (B2) / lint (D) | contradiction flagging |
| `profile` (doc: `users/{uid}/meta/profile`) | `{ interests, projects, notes }` | user + LLM | schema layer — injected into enrich prompt so summaries are personal |
| `log` (subcollection: `users/{uid}/log`) | `{ ts, kind, text }` append-only | ingest / lint | chronological "what changed" feed |

### 10.5 Two constraints the article makes non-negotiable

1. **Value only appears at ~50–100 sources.** A 5-node map/graph looks *broken*, not smart.
   Onboarding should set the expectation; consider gating the map until there's density.
2. **"A bad source touches 15 pages."** Once we write back synthesis, **deletion must
   cascade** — deleting a save removes its vector *and* any `connections`/`contradictions`
   that referenced it. Design the un-compile path from day one (tracked in `TODO.md`).

### 10.6 What we deliberately DON'T take from LLM Wiki

Obsidian / Web Clipper / Dataview / Marp / graph plugins, `qmd` and file-based search,
local image-download hotkeys, and the one-at-a-time-human-reviews-every-edit ritual — all
artifacts of a **manual markdown-vault** workflow. SuperMind is a real app with Firestore
and its **own** graph view (the brain map *is* Obsidian's graph view). We take the
**compile loop idea**, not the file metaphor. And we hold the line on **free + self-hosted**
— we do not adopt the "requires a paid plan to be good" posture.

### 10.7 The one-line version

> Stop enriching saves in isolation. At ingest, use the neighbors we already compute to
> write back **connections and contradictions**, and add a **Lint** mode to the sweep —
> that's what turns the library into a compiler, using infrastructure that already exists.

