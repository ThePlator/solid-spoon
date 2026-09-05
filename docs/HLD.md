# High-Level Design — SuperMind

**Companion to:** `../PRD-SuperMind.md`
**Scope:** v1 (Tier 1) architecture on **Firebase**
**Status:** Draft v1 — for developer review
**Owner:** Sameer

> This document describes *what* the system is and how its pieces fit together at a system level. For concrete data shapes, function signatures, security rules, and per-screen flows, see `LLD.md`.

---

## 1. Purpose & context

SuperMind is a single-player second brain: capture content from any device in ≤2 seconds and reliably retrieve it later. Three thin clients talk to one managed Firebase backend. There is no custom application server — Firebase provides auth, database, sync, storage, and the one bit of server logic we need (link-metadata fetching) via Cloud Functions.

**Design principles**
1. **Managed over hand-rolled** — no server to operate; Firebase does auth, DB, sync, storage.
2. **Thin clients, shared skillset** — JavaScript/React everywhere (Next.js web, React extension, React Native mobile).
3. **Sync for free** — Firestore real-time listeners deliver cross-device sync without custom code.
4. **Retrieval is a first-class concern** — search tokens are written at save time, not bolted on later.
5. **Additive schema** — Firestore's schemaless documents let Tier 2 fields land without migrations.

---

## 2. System context (C4 — Level 1)

```mermaid
flowchart TB
    User(["Information magpie<br/>(single user)"])

    subgraph Clients["SuperMind clients"]
        EXT["Browser Extension<br/>(Chrome MV3)"]
        WEB["Web Library<br/>(Next.js / React)"]
        MOB["Mobile App<br/>(React Native / Expo)"]
    end

    subgraph Firebase["Firebase (managed backend)"]
        AUTH["Firebase Auth"]
        FS["Cloud Firestore"]
        ST["Cloud Storage"]
        FN["Cloud Functions"]
    end

    EXTSITE["Third-party pages<br/>(article / reel / post)"]

    User -->|saves & browses| EXT
    User -->|searches & organizes| WEB
    User -->|shares & captures| MOB

    EXT -->|read tab DOM| EXTSITE
    EXT --> AUTH
    EXT --> FS
    EXT --> FN

    WEB --> AUTH
    WEB --> FS
    WEB --> ST

    MOB --> AUTH
    MOB --> FS
    MOB --> FN

    FN -->|fetch og:meta| EXTSITE
    FN --> ST
    FN --> FS
```

---

## 3. Container view (C4 — Level 2)

| Container | Tech | Responsibility |
|---|---|---|
| **Web Library** | Next.js (React), Firebase JS SDK | Primary library UI: feed, search, tag filter, item detail/edit/delete, manual add, quick capture. Also hosts the auth/login page the extension opens. |
| **Browser Extension** | Chrome Manifest V3, React popup | One-click save of the active tab; reads title / canonical URL / `og:image` / selected text from the DOM; optional note + tags; writes to Firestore. |
| **Mobile App** | React Native (Expo), Firebase JS SDK | Share-sheet target (save from any app), library view, and quick text capture. |
| **Firebase Auth** | Managed | Email/password identity shared across all clients; issues the uid every query is scoped to. |
| **Cloud Firestore** | Managed NoSQL | System of record for `saves`. Real-time listeners drive cross-device sync. Security Rules enforce per-user isolation. |
| **Cloud Storage** | Managed | Cached thumbnails and uploaded images. |
| **Cloud Functions** | Node (2nd gen) | `fetchMetadata` callable: given a URL, fetch + parse title / og:image / canonical URL server-side (avoids client CORS). Optionally caches the thumbnail into Storage. |

**Key architectural choice:** clients write to Firestore **directly** through the Firebase SDK (guarded by Security Rules), *not* through an API tier. The only server-side code is the metadata function — everything else is client → Firebase SDK → Firestore.

---

## 4. Core flows (high level)

### 4.1 Save a link (extension or mobile)

```mermaid
sequenceDiagram
    participant C as Client ext-mobile
    participant FN as Cloud Function<br/>fetchMetadata
    participant Site as Source page
    participant FS as Firestore
    participant Other as Other devices

    C->>C: Capture URL (+ selected text)
    C->>FN: fetchMetadata(url)
    FN->>Site: GET page
    Site-->>FN: HTML
    FN-->>C: {title, thumbnailUrl, source, canonicalUrl}
    C->>C: User optionally adds note + tags
    C->>FS: write users/{uid}/saves/{id}
    FS-->>Other: real-time listener push
    Note over Other: Save appears in web library<br/>without a manual refresh
```

**Speed note:** the ≤2s target is met because the write is a single Firestore `set()`; metadata enrichment can complete optimistically (the card renders immediately, thumbnail fills in when the function returns).

### 4.2 Quick text capture (mobile / web)
No network round-trip for metadata — a `note`-type document is written straight to Firestore with just `text` + optional tags. One tap to open the box, type, save.

### 4.3 Browse / search / retrieve (web)
The library subscribes to `users/{uid}/saves` ordered by `createdAt desc`. Keyword search filters on the `searchTokens` array (`array-contains`); tag filter uses `array-contains` on `tags`. Real-time listeners keep the feed live.

---

## 5. Cross-cutting concerns

| Concern | v1 approach |
|---|---|
| **Auth & identity** | Firebase Auth email/password. Same uid across surfaces. Extension delegates login to the hosted web page, then shares the session. |
| **Authorization** | Firestore Security Rules: a user may read/write only under `users/{their-uid}/**`. No cross-user access path exists. |
| **Sync** | Firestore real-time listeners + on-device offline cache (SDK default). Save-then-see-on-another-device is inherent, not built. |
| **Search** | Firestore-native: `searchTokens` array written at save time, queried with `array-contains`. Prefix/token match only — full-text (Algolia/Typesense) is deferred to v2. |
| **Offline** | Firestore's local persistence queues writes and replays them on reconnect (covers the extension/mobile "offline save" edge case in Phase 4). |
| **Media** | Thumbnails referenced by URL; remote `og:image` used directly when possible, cached to Cloud Storage only when needed. |
| **Cost/scale** | Single-user v1 sits comfortably in Firebase's free tier. Firestore reads dominate cost; the live-listener feed is the main read source. |
| **Observability** | Firebase console (Auth, Firestore usage, Functions logs) is sufficient for v1. |

---

## 6. Architecture risks & mitigations (the no-server trade-off)

Going client → Firebase directly with **no API tier** is the biggest bet in this design. It's what makes v1 cheap and fast to build, but it moves certain responsibilities onto Security Rules, Cloud Functions, and you. Each row is one dimension of that trade-off.

| Dimension | ✅ Benefit | ⚠️ Risk | 🛠️ What to do |
|---|---|---|---|
| **Backend code** | No server to build, deploy, or operate — Firebase is auth + DB + sync + storage in one | Security Rules *are* your only enforcement; one wrong rule exposes all data (config is public) | Keep the `users/{uid}/saves` nesting; write **rules unit tests** with the emulator; never deploy rules untested |
| **Input validation** | Ship faster — no request-validation layer to write | Client can write oversized/malformed/spoofed docs; only rules can stop it | Extend `isValidSave()` with size/length/field limits; accept rules can't cover complex logic in v1 |
| **Sync** | Real-time cross-device sync "for free" via Firestore listeners | Live listeners re-read on every change — a runaway listener silently multiplies cost | Always `limit()` + paginate the feed; watch the usage dashboard |
| **Cost** | Free tier easily covers single-user v1 | Billed per read; no server to cache/throttle; cost scales with reads, not users | Set a **budget alert**; paginate; profile read counts before multi-user |
| **Abuse / rate limiting** | Nothing to configure to start | No natural chokepoint — anyone with your config can hit Firestore/Functions directly | Enable **Firebase App Check**; cap Function concurrency/timeout |
| **Search & queries** | No query layer to build | Firestore only: no full-text, no `OR`, no joins, no aggregation | Use `searchTokens` + `array-contains` for v1; plan Algolia/Typesense for v2 |
| **Complex / secret logic** | Simple flows need zero server | Anything atomic, secret-bearing, or external-API-based can't run on the client | Put it in **Cloud Functions** (already done for `fetchMetadata`); expect Functions to grow into the backend for Tier 2 |
| **Speed to ship** | Weeks, not months — one skillset across all clients | You're *deferring* a backend, not avoiding it | Fine for v1; treat rules with the seriousness of server auth code |
| **Portability** | Move fast now on a proven platform | Vendor lock-in: rules, query model, SDK are Firebase-specific — leaving is a rewrite | Keep data logic in `@supermind/core` so clients are insulated; accept lock-in as a conscious v1 trade |
| **Schema changes** | Schemaless — *adding* fields needs no migration | *Changing* existing data has no migration layer — it's on you | Write one-off backfill scripts/Functions when you rename or reshape fields |

**Bottom line:** for a single-player, low-traffic v1 where speed matters most, this is the right call. Only two rows can hurt you *today* — **Security Rules correctness** and **runaway reads/cost** — and both are cheap to defend. Everything else is a "when you go multi-user or build Tier 2" concern. You're not avoiding a backend; you're **deferring** it — Cloud Functions + Security Rules gradually *become* the backend as the product grows.

---

## 7. Environments & deployment (high level)

```mermaid
flowchart LR
    subgraph Dev["Local dev"]
        EMU["Firebase Emulator Suite<br/>(Auth + Firestore + Functions)"]
    end
    subgraph Prod["Firebase project (prod)"]
        PAUTH[Auth]
        PFS[Firestore]
        PFN[Functions]
        PST[Storage]
        HOST["Firebase Hosting<br/>(Next.js web)"]
    end

    CI["CI (GitHub Actions)"] -->|deploy rules + functions + web| Prod
    Dev -.->|parity| Prod
```

- **Web** → Firebase Hosting (or Vercel; Hosting keeps everything in one console).
- **Functions & Security Rules** → deployed via `firebase deploy` from CI.
- **Extension** → packaged & uploaded to the Chrome Web Store.
- **Mobile** → EAS Build (Expo) → TestFlight / Play Console.

---

## 8. Architecture decisions (summary)

| # | Decision | Why | Alternative rejected |
|---|---|---|---|
| AD-1 | Firebase as the sole backend | One managed service covers auth+DB+sync+storage+functions | Supabase (equivalent; team chose Firebase) |
| AD-2 | Clients write Firestore directly (no API tier) | Less code; Security Rules are the authz boundary | Custom Node/Express API |
| AD-3 | Firestore native search via `searchTokens` | Zero extra infra/cost for v1 | Algolia/Typesense (deferred to v2) |
| AD-4 | `fetchMetadata` as a Cloud Function | Consistent parsing across clients; avoids CORS | Per-client client-side parsing |
| AD-5 | React Native (Expo) for mobile | Reliable native share sheet; shared React skillset | PWA (weaker share-sheet support) |
| AD-6 | Data nested under `users/{uid}/saves` | Trivial per-user rules; automatic query scoping | Flat top-level `saves` + `where(userId==)` |

---

## 9. Out of scope for v1 (see PRD §13)

AI (tagging/summaries/semantic search), voice/OCR, Reddit/LinkedIn comment capture, resurfacing/digests/connections, sharing/collaboration, and any hand-rolled backend. The architecture is deliberately additive so these can land later without restructuring.
