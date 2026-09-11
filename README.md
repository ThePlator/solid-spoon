# SuperMind

A cross-platform "second brain" for capturing and retrieving content. Save links, articles, and ideas from any device and find them again with minimal friction. Built as an open-source, self-hosted application backed by a single managed Firebase project.

The product's goal is not merely to store content, but to keep it reliably retrievable, so a personal library does not decay into an unused archive.

---

## Overview

SuperMind ships as three client surfaces backed by one cloud service:

- **Web library** — the primary interface for browsing, searching, and organizing saved items.
- **Browser extension** — one-click saving of the current page while browsing on desktop.
- **Mobile application** — capturing ideas on the go and saving shared content via the Android share sheet.

All three clients share a single data layer and synchronize in real time through Cloud Firestore.

---

## Features (v1)

- One-click save from the browser extension and mobile share sheet.
- Quick text capture for unstructured ideas.
- A unified, reverse-chronological library across all devices.
- Keyword search across titles, text, and tags.
- Manual tagging and tag-based filtering.
- Real-time cross-device synchronization tied to a user account.
- Email and password authentication with per-user data isolation.

---

## Architecture

Three clients communicate directly with a single Firebase backend. There is no custom server; authorization is enforced by Firestore Security Rules.

```
Browser extension ─┐
                   ├──► Firebase (Auth · Firestore · Storage · Functions) ◄── Web library
Mobile application ─┘
```

| Layer | Technology |
| --- | --- |
| Backend | Firebase: Authentication, Cloud Firestore, Cloud Storage, Cloud Functions |
| Web library | Next.js (React) |
| Browser extension | Chrome Manifest V3 |
| Mobile application | React Native (Expo SDK 57) with React Navigation |
| Shared data layer | `@supermind/core` — a single package consumed by all clients |

Refer to `docs/HLD.md` for the high-level design and `docs/LLD.md` for the implementation-level design, both of which include diagrams.

### Repository layout

```
.
├── packages/core/     Shared Firebase data layer (auth, saves, search tokens)
├── web/               Next.js web library
├── extension/         Chrome Manifest V3 extension
├── mobile/            Expo (Android) application
├── docs/              High- and low-level design documents
├── firestore.rules    Security rules (per-user isolation)
└── firestore.indexes.json
```

---

## Prerequisites

- Node.js 20 or later
- A Firebase account (the free tier is sufficient for personal use)
- Firebase CLI (`npm install -g firebase-tools`)
- For the mobile application: the Expo Go app, or Android Studio for local native builds

---

## Getting started

### 1. Clone and install

```
git clone https://github.com/<your-username>/supermind.git
cd supermind
npm install
```

### 2. Create a Firebase project

1. In the [Firebase Console](https://console.firebase.google.com/), create a new project.
2. Enable **Authentication** with the Email/Password sign-in method.
3. Create a **Cloud Firestore** database in production mode.
4. Register a **Web app** and copy the configuration values.

### 3. Configure credentials

Copy the example environment file and populate it with your Firebase web configuration:

```
cp .env.example web/.env.local
```

The Firebase web configuration is safe to expose in client code; security is enforced by Firestore Security Rules, not by keeping the configuration secret. Service-account keys and other secrets must never be committed.

### 4. Deploy security rules and indexes

```
firebase login
firebase use --add
npm run deploy:rules
```

Deploy the rules before using the application. The default Firestore rules are either fully open or fully closed.

### 5. Run the web library

```
npm run dev --workspace web
```

The application is served at `http://localhost:3000`.

---

## Browser extension

```
npm run build --workspace extension
```

Then load it in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose the `extension/dist` directory.

Sign in through the popup once; the session persists across uses.

---

## Mobile application

The mobile client uses Expo. Configure the Firebase values in `mobile/app.json` under `expo.extra`.

Run in Expo Go (auth, library, and capture; the share sheet requires a native build):

```
cd mobile
npx expo start --go
```

### Building an installable Android APK

The APK is built in the cloud by EAS and requires a free Expo account. No local Android SDK is needed.

```
cd mobile
npx eas-cli login
npx eas-cli build -p android --profile preview
```

When the build completes, EAS provides a download link for the APK. The resulting build includes the full feature set, including share-sheet capture.

---

## Cost

Running a personal instance is effectively free. Firebase's free tier covers single-user usage of Authentication, Firestore, and Storage. Cloud Functions require the pay-as-you-go plan but remain within the free allowance at this scale. The only optional cost is an Apple Developer account for native iOS distribution, which does not apply to the Android build.

---

## Security and self-hosting

- The Firebase web configuration is intended to ship in client code; security is enforced by `firestore.rules`.
- Never commit service-account keys, `google-services.json`, `GoogleService-Info.plist`, or `.env` files. These are excluded by `.gitignore`.
- Deploy and unit-test Firestore Security Rules before exposing an instance.
- Enable a budget alert and Firebase App Check before making an instance available to multiple users.

---

## Roadmap

Version 1 delivers the capture, storage, and retrieval loop across web, extension, and mobile. Planned subsequent work includes automated tagging and summarization, semantic search over the library, related-item connections, and resurfacing of older items. These are documented in `PRD-SuperMind.md` and are not part of the version 1 scope.

---

## Contributing

This is a personal project released openly. Contributions are welcome, but the version 1 scope is intentionally narrow; please review `PRD-SuperMind.md` before proposing new features.

---

## License

Released under the MIT License. See `LICENSE`.
