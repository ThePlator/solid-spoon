# Product Requirements Document — "SuperMind"

**A cross-platform second brain for capturing and retrieving content.**

| | |
|---|---|
| **Status** | Draft v1 — for developer review |
| **Owner** | *Sameer* |
| **Last updated** | *05/09/2026* |
| **Target** | Buildable v1 (MVP) with a defined path to v2 |

> **How to read this doc:** Tier 1 is the contract for v1 — build all of it, ship nothing less. Tiers 2 and 3 are the roadmap, spec'd enough to plan around but **not** in v1 scope. The "Open Questions" section at the end contains decisions that must be made before or during the build; flag them early.

---

## 1. Summary

SuperMind is a personal "second brain": a single place to capture anything worth remembering — reels, articles, blog posts, snippets of text, and spontaneous ideas — from any device, and find it again with zero friction.

It ships as three surfaces backed by one cloud service:

- A **browser extension** (desktop) for one-click saving while browsing.
- A **mobile app** for saving via the share sheet and capturing ideas on the go.
- A **web library** where everything lives, is searched, and is organized.

The product's job is not just to *save* content — dozens of tools do that and become graveyards. Its job is to make saved content **reliably retrievable and worth returning to.**

---

## 2. Problem statement

Interesting content and ideas arrive constantly and scatter immediately: a reel while scrolling, a half-read blog, a thought while walking. They end up spread across app bookmarks, browser tabs, screenshots, and memory — and most are lost. There is no single, low-friction home for "things I want to keep and actually find later."

**The core insight:** capture is the easy, obvious half. The hard, valuable half is **retrieval** — surfacing the right saved thing at the right moment so the library doesn't rot into a dumping ground. v1 must nail both the capture loop *and* basic reliable retrieval; the "magic" retrieval features come after.

---

## 3. Goals & non-goals

### Goals (v1)
1. Let a user save content from desktop and mobile in **under ~2 seconds**.
2. Store every save in **one unified, cross-device library**.
3. Make any save **findable** via keyword search and tags.
4. Prove the core loop: *people capture, and they come back.*

### Non-goals (explicitly out of v1)
- AI features (auto-tagging, summaries, natural-language search).
- Voice capture, screenshot OCR.
- Comment-section gathering (Reddit or LinkedIn).
- Resurfacing, digests, connections between saves.
- Social/sharing/collaboration features. This is single-player.

> These are deferred, not rejected. They are spec'd in Tier 2/3 below so the architecture can accommodate them.

---

## 4. Target user

A single primary persona for v1:

**The "information magpie."** Consumes a lot of content across platforms, constantly finds things worth keeping, and is frustrated that saved things vanish. Comfortable with apps, wants speed over configurability. Building for *one* such user — likely yourself — first.

Deliberately **not** targeting teams, researchers with heavy citation needs, or note-taking power users (that's Notion/Obsidian territory) in v1.

---

## 5. Scope: feature tiers

### Tier 1 — MVP (v1 scope; all required)

| # | Feature | Description | Acceptance criteria |
|---|---|---|---|
| 1.1 | **One-click save** | Save the current page (extension) or shared content (mobile share sheet) in one action. | A save completes in ≤2 taps/clicks and appears in the library within a few seconds. |
| 1.2 | **Auto-grab context** | On save, capture title, source/domain, canonical URL, and thumbnail/preview image automatically. | A saved item is recognizable at a glance without opening it. Missing fields degrade gracefully. |
| 1.3 | **Quick text/idea capture** | A fast note box (mobile + web) for typing a raw idea with no required fields. | User can capture a plain text thought in ≤2 taps from app open. |
| 1.4 | **Unified library** | One reverse-chronological feed showing all item types together. | All saves from all surfaces appear in one feed, newest first. |
| 1.5 | **Keyword search** | Search across title + text (+ tags). | Query returns matching items; empty state is clear. |
| 1.6 | **Manual tags / collections** | User can add tags and group items. | User can tag an item and filter the feed by tag. |
| 1.7 | **Cross-device sync** | Save on one device, see it on another, tied to a user account. | An item saved on phone appears in the web library after refresh/sync. |
| 1.8 | **Auth** | Email-based signup/login. | User can create an account, log in on all three surfaces, and see only their own data. |

### Tier 2 — Differentiators (v2 roadmap, NOT v1)

| Feature | Notes for planning |
|---|---|
| **Whole-conversation capture — Reddit** | Save a post *plus its full comment section*. Reddit has a real public API; **verify current access, rate limits, and cost before committing** (terms changed significantly in the past). This is the flagship differentiator. |
| **AI auto-tagging** | Categorize each save automatically on ingest. Removes the #1 friction (manual organizing). |
| **AI summaries** | Condense a long article / reel / thread into a few lines so the user remembers *why* they saved it. Pairs naturally with Reddit comment capture (summarize a 300-comment thread into consensus + dissent). |
| **Voice capture + transcription** | Speak an idea; transcribe to text. Directly serves the "ideas while moving" use case. |
| **"Ask your brain" search** | Natural-language retrieval over the library. The strongest "super mind" feeling; also the heaviest to build. |
| **Screenshot OCR** | Extract text from saved images so screenshots become searchable. |

### Tier 3 — Later / with caveats (post-v2)

| Feature | Notes |
|---|---|
| **Whole-conversation capture — LinkedIn** | ⚠️ **High-risk.** No open public API for reading arbitrary post comments; LinkedIn actively blocks scraping; doing so may violate its Terms of Service and has been the subject of litigation. **Do not build the product's promise around this.** Safe fallback: save the post + visible text only. |
| **Resurfacing / smart reminders** | Nudge old saves back at the right time — the primary weapon against the "graveyard" problem. |
| **Weekly digest** | Summary of what was captured, prompting action. |
| **Connections between saves** | Link related items into a web rather than a flat list. |
| **Actionable saves** | Mark a save as a to-do. |
| **Highlights** | Save a specific paragraph rather than a whole page. |

---

## 6. Detailed v1 feature specs

### 6.1 Save flow — browser extension
1. User clicks the extension icon (or a keyboard shortcut) on any page.
2. Extension reads the current tab: title, URL, primary image (`og:image` / first prominent image), and any user-selected text.
3. A small popup lets the user optionally add a note and tags, then confirm.
4. Extension posts the item to the backend; user gets a success confirmation.
5. Item appears in the web library.

**Edge cases:** page with no image (use a placeholder/domain favicon); not logged in (prompt login); offline (queue and retry — can be deferred to Phase 4 polish).

### 6.2 Save flow — mobile
1. From any app (Instagram, YouTube, browser, etc.), user taps **Share → SuperMind**.
2. App receives the shared URL/text, fetches preview metadata (title, image).
3. User optionally adds a note/tags, confirms.
4. Item syncs to the library.

Plus an in-app **quick capture** button for typing a raw idea directly.

### 6.3 Library (web)
- Reverse-chronological feed of cards (thumbnail, title, source, tags, date).
- Search bar (keyword) and tag filter.
- Item detail view: full text/note, link out to source, edit tags/note, delete.
- Empty state that explains how to save the first item.

---

## 7. Proposed architecture

Three clients, one **Firebase** backend. **Chosen to minimize custom server code and let a small team move fast — not to be trendy.**

```
   Browser extension  ─┐
                        ├──►  Firebase (Auth + Firestore + Storage + Functions)  ◄──  Web library (React)
   Mobile app         ─┘
```

| Layer | Choice | Rationale |
|---|---|---|
| **Backend** | **Firebase** | Managed auth, database, real-time sync, and file storage in one service. Minimal backend code — the single biggest time-saver. |
| ├ Auth | Firebase Authentication (email/password) | Same identity across all three surfaces; social login deferrable. |
| ├ Database | Cloud Firestore | Real-time listeners give cross-device sync "for free"; per-user security rules scope data. |
| ├ File storage | Cloud Storage for Firebase | Holds cached thumbnails / uploaded images. |
| └ Server logic | Cloud Functions (2nd gen) | One callable function fetches & parses link metadata server-side (avoids CORS, keeps clients thin). |
| **Web library + auth surface** | React (Next.js) | Doubles as the desktop library and the login/settings page the extension opens into. |
| **Browser extension** | Chrome, Manifest V3 | Ship Chrome-only first. Shares the React/JS skillset. |
| **Mobile** | React Native (Expo) | Reliable native share-sheet capture; reuses React knowledge; Expo simplifies share-extension setup and builds. |

**Through-line:** JavaScript/React across all surfaces + Firebase = one skillset, minimal infrastructure. This is what makes it feasible for a small team.

> The constraint that matters is *managed backend + shared client skillset*. Firebase is the committed vendor for v1; see `docs/HLD.md` and `docs/LLD.md` for the full architecture and low-level design.

---

## 8. Data model (starting point)

A single core collection. Keep it flat for v1. Firestore path: **`users/{userId}/saves/{saveId}`** — nesting under the user makes per-user security rules trivial and scopes every query automatically.

**`saves`** (document fields)

| Field | Type | Notes |
|---|---|---|
| `id` | string (doc id) | Firestore document id |
| `userId` | string | owner (Firebase Auth uid); redundant with path but handy for collection-group queries later |
| `type` | string enum | `link` \| `note` \| `image` (extensible) |
| `title` | string | auto-grabbed or user-entered |
| `url` | string \| null | null for notes |
| `source` | string | domain / platform |
| `thumbnailUrl` | string \| null | Cloud Storage URL or remote og:image; nullable |
| `text` | string | note body or extracted/selected text |
| `tags` | array<string> | start as an array; normalize later if needed |
| `searchTokens` | array<string> | lowercased title/text/tag tokens for Firestore `array-contains` keyword search |
| `createdAt` | timestamp | feed ordering (`serverTimestamp()`) |
| `updatedAt` | timestamp | |

Firestore **Security Rules** ensure a user can only read/write documents under their own `users/{uid}` path. Design the schema so Tier 2 fields (`summary`, `aiTags`, `comments`) can be added later without migration pain — Firestore's schemaless documents make this additive by nature.

---

## 9. Build plan & milestones

Sequenced so there is **always a working thing**. Build the capture→store→retrieve loop end-to-end before widening.

| Phase | Deliverable | Definition of done |
|---|---|---|
| **0 — Foundation** | Backend, auth, `saves` table, sync proven | An item written by one client is readable by another. Verified with a throwaway test button before real UI. |
| **1 — Web library** | React app reading the library + manual add + search + tags | A usable (if manual) second brain on desktop. |
| **2 — Extension** | Chrome MV3 one-click save | Saving from any page lands in the web library. First "magic" moment. |
| **3 — Mobile** | RN/Expo app: login, library view, quick capture, **share-sheet save** | The "save a reel while moving" loop is closed. |
| **4 — Polish** | Better search, collections, offline/duplicate edge cases | The product is pleasant to live in daily. |

**Ordering rule:** Backend → Web → Extension → Mobile. Never build all surfaces in parallel — that yields three broken things instead of one working one.

---

## 10. Rough effort & timeline

**No honest single number exists** — it depends on the builder's experience and hours/week. Ranges for a **competent full-stack developer, part-time (~10–15 hrs/wk):**

| Phase | Ballpark |
|---|---|
| 0 — Backend + sync | 1–2 weeks |
| 1 — Web library | 2–3 weeks |
| 2 — Extension | 1–2 weeks |
| 3 — Mobile app | 3–5 weeks (dominated by app-store friction, not code) |
| 4 — Polish | open-ended |

**Full-time roughly halves these. A developer new to this stack should multiply by ~1.5–2×.**

**Estimate-wreckers to budget for:** app-store review/signing/provisioning (days, unrelated to code), the "last 20%" reliability work, and scope creep (the single biggest killer — hold the Tier 1 line).

**Fastest path to something real:** web + extension only, skip native mobile, cover phone with a PWA → a working desktop second brain in ~3–5 weeks part-time. Add native mobile only after the tool has proven itself in daily use.

---

## 11. Success criteria

v1 is successful if, for its first real user:
- Saving is fast enough that it becomes a **habit** (used unprompted, multiple times a week).
- Saved items are **found again** rather than forgotten (search/tags actually get used).
- The user **returns** to the library rather than treating it as a write-only dump.

If people save but never return, the product has failed *regardless of feature count* — and that signals investing in Tier 3 resurfacing next.

---

## 12. Open questions (decide before/early in build)

1. ~~**Native app vs PWA for v1?**~~ **RESOLVED → React Native (Expo).** Native chosen for reliable share-sheet capture, accepting the ~3–5 week + app-store cost. See mobile design in `docs/LLD.md`.
2. **Flagship Tier 2 feature:** Reddit whole-conversation capture, or "ask your brain" search? A small team can't polish both at once; the chosen one becomes the product's demo identity.
3. **Reddit API viability:** confirm current access, rate limits, and pricing *before* committing to the comment-capture feature.
4. **Auth scope:** email/password only for v1, or social login (Google/Apple)? Apple login is often required by the App Store if any social login exists.
5. **Chrome-only, or Chrome + Firefox** for the first extension release?

---

## 13. Explicit "do not build in v1" list

To protect the timeline, these are off the table until v1 ships and proves the loop:

- ❌ Any AI (tagging, summaries, semantic search)
- ❌ Voice capture / OCR
- ❌ Reddit **or** LinkedIn comment gathering
- ❌ Resurfacing, digests, connections, highlights, to-dos
- ❌ Sharing, collaboration, multi-user features
- ❌ A hand-rolled custom backend (use a managed one)

---

*End of PRD. Sections 5, 9, and 12 are the parts a developer will push back on first — bring them into the kickoff conversation.*
