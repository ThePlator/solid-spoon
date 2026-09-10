# SuperMind — Project Rules & Conventions

The rules we build by. Read before starting any work on this repo. These encode decisions
already made (see `PRD-SuperMind.md`, `docs/HLD.md`, `docs/LLD.md`) so they don't get
re-litigated or accidentally violated.

---

## 1. Scope discipline (the most important rule)

- **Hold the Tier 1 line.** v1 = capture → store → retrieve, across web + extension + mobile.
  Nothing else ships in v1. The full "do not build" list is PRD §13.
- **Deferred, not rejected.** AI (tagging/summaries/semantic search), voice/OCR,
  Reddit/LinkedIn capture, resurfacing/digests/connections, sharing/collaboration — all v2+.
  Design so they can be *added* later; do not build them now.
- Scope creep is the #1 project killer. When tempted to add "just one more feature,"
  write it in `TODO.md` under the right tier instead of building it.

## 2. Architecture

- **Firebase is the committed backend.** Auth (email/password), Cloud Firestore, Cloud
  Storage, Cloud Functions. No hand-rolled server, no other vendor.
- **Clients talk to Firestore directly** through the Firebase SDK, guarded by Security
  Rules. There is no API tier. Security Rules *are* the authorization layer.
- **One shared data layer: `@supermind/core`.** All Firestore/auth logic lives here.
  Clients (web, extension, mobile) differ only in UI and capture mechanism — never
  duplicate `createSave`/`subscribeFeed`/query logic into a client.
- **Build order is fixed:** Backend → Web → Extension → Mobile. Never build surfaces in
  parallel. Always keep one working thing.
- **No Cloud Function unless required.** The extension reads metadata from the page DOM.
  `fetchMetadata` is only needed for mobile/web link previews; add it lazily to stay on the
  free plan.

## 3. Data model

- Path: `users/{userId}/saves/{saveId}`. Per-user nesting = trivial rules + auto-scoped queries.
- Firestore is schemaless — **add fields, never migrate.** New Tier 2 fields (`summary`,
  `aiTags`, `comments`) must be additive.
- Every save carries `searchTokens` (derived at write time) for keyword search. Keep this
  in `@supermind/core`, never inline in a client.
- Fields use `camelCase`. Timestamps via `serverTimestamp()`.

## 4. Security & secrets (non-negotiable)

- **Never commit secrets.** Service-account JSON, `google-services.json`,
  `GoogleService-Info.plist`, `.env*` (except `.env.example`) stay gitignored. A leaked
  service-account key = full project compromise.
- Firebase **web config is public-safe** — security comes from `firestore.rules`, not from
  hiding config. Do not obfuscate it; do not rely on it being secret.
- **Rules are code.** Never deploy `firestore.rules` without testing against the emulator.
  Validate shape *and* size limits in rules (`isValidSave`).
- Enable a **budget alert** on Blaze; consider **App Check** before any instance goes
  multi-user.

## 5. Frontend / UI

- **Design from fixed scales**, never ad-hoc values (Refactoring UI):
  spacing `4 8 12 16 24 32 48 64 96 128`, type `12 14 16 18 20 24 32 44 64`, one border radius.
- **Current design system: "MIND · OS"** — near-black canvas, single electric-lime accent
  (`--accent`), Bricolage Grotesque (display) + Familjen Grotesk (UI) + JetBrains Mono
  (telemetry). One accent per view. Tokens live in `web/app/globals.css` `:root`.
- **Accessibility is a gate, not a nicety:** text ≥ 4.5:1 contrast, `:focus-visible` on all
  interactive elements, `prefers-reduced-motion` respected, icon-only buttons get labels.
- **Animation:** compositor props only (`transform`, `opacity`), ≤ 200ms, `ease-out`. Never
  animate layout properties. No gradients, no glow-as-affordance.
- **Empty states must offer one clear next action.**
- Distinctive over generic — no Inter/Roboto/system-default look, no purple-on-white.

## 6. Workflow

- **Verify in the browser** before claiming a UI change works — don't assert "it works" from
  code alone. Report failures with the actual output.
- Keep `TODO.md` current: mark items `[x]` as completed, note what was deferred and why.
- Manual steps (Firebase console, loading the extension, app-store) are the human's to do —
  call them out explicitly, don't pretend they're done.
- Commit only when asked. Branch off `main` for anything non-trivial.
- Every client reads Firebase config from env (`NEXT_PUBLIC_*` web, `VITE_*` extension,
  `EXPO_PUBLIC_*` mobile) — never hardcode config in committed source.

## 7. Open decisions (resolve before the relevant phase — see LLD §7)

- Auth providers: email/password only, or add Google/Apple? (Apple Sign-In becomes
  App-Store-mandatory if any social login is added.)
- Thumbnail policy: reference remote `og:image` vs. always cache to Storage.
- Multi-token search ranking is a v1 compromise (`array-contains-any` + client rank).
- Chrome-only vs. Chrome + Firefox for the extension.

---

*When a rule here conflicts with a request, surface the conflict rather than silently
breaking the rule.*
