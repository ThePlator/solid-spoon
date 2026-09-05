# 🧠 SuperMind

**A cross-platform "second brain" for capturing and retrieving content.**

Save anything worth remembering — reels, articles, blog posts, snippets, and spontaneous ideas — from any device, and find it again with zero friction. Built solo, open-sourced so anyone can clone it and run their own instance.

> The product's job isn't just to *save* content (dozens of tools do that and become graveyards). Its job is to make saved content **reliably retrievable and worth returning to.**

---

## ✨ What it does (v1)

- **One-click save** from the browser (extension) or your phone (share sheet).
- **Quick text capture** for raw ideas — no required fields.
- **Unified library** — everything, all item types, newest first.
- **Keyword search + tags** so nothing gets lost.
- **Cross-device sync** — save on your phone, see it on the web instantly.
- **Single-player** — your data, your account, no one else's.

See [`PRD-SuperMind.md`](PRD-SuperMind.md) for the full product spec, and [`docs/`](docs/) for architecture.

---

## 🏗️ Architecture (short version)

Three thin clients, one **Firebase** backend, **no custom server**.

```
   Browser extension  ─┐
                        ├──►  Firebase (Auth + Firestore + Storage + Functions)  ◄──  Web library (React)
   Mobile app         ─┘
```

| Surface | Tech |
|---|---|
| Web library | Next.js (React) + Firebase JS SDK |
| Browser extension | Chrome Manifest V3 + React popup |
| Mobile app | React Native (Expo) |
| Backend | Firebase: Auth (email/password), Cloud Firestore, Cloud Storage, Cloud Functions |
| Shared logic | `@supermind/core` — one package all clients reuse |

Full detail: [`docs/HLD.md`](docs/HLD.md) (system design) and [`docs/LLD.md`](docs/LLD.md) (implementation spec).

---

## 🚀 Getting started (run your own instance)

### Prerequisites
- Node.js 20+
- A free [Firebase](https://firebase.google.com/) account
- (Optional) [Firebase CLI](https://firebase.google.com/docs/cli): `npm i -g firebase-tools`

### 1. Clone & install
```bash
git clone https://github.com/<your-username>/supermind.git
cd supermind
npm install
```

### 2. Create your Firebase project
1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Create a **Cloud Firestore** database (start in production mode).
4. (Optional) Enable **Storage** if you want cached thumbnails.
5. Project settings → **General** → add a **Web app** and copy the config.

### 3. Configure your keys
```bash
cp .env.example .env.local
```
Fill in the values from your Firebase web config. **Never commit `.env.local`** — it's gitignored.

### 4. Deploy security rules & indexes
```bash
firebase login
firebase use --add          # select your project
firebase deploy --only firestore:rules,firestore:indexes
```
> These rules ([`firestore.rules`](firestore.rules)) scope every user to their own data. Deploy them **before** using the app — the default Firestore rules are either wide open or fully locked.

### 5. Run the web app
```bash
npm run dev
```
Open http://localhost:3000, sign up, and you have a working second brain.

### 6. (Optional) Load the browser extension
1. `npm run build:extension`
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the built `extension/` folder.

### 7. (Optional) Run the mobile app
```bash
cd mobile
npx expo start
```
Scan the QR with Expo Go (dev), or build a standalone APK/IPA with EAS when ready.

---

## 💸 Cost

Running your own instance is effectively **free**:

| Item | Cost |
|---|---|
| Firebase (Auth + Firestore + Storage), single user | **$0** — well within the free tier |
| Cloud Functions | **$0** — requires the Blaze plan (card on file) but stays inside the free allowance; can be skipped for v1 |
| Web app on `localhost` or Firebase Hosting free tier | **$0** |
| Browser extension (loaded unpacked, dev mode) | **$0** |
| Android app (sideloaded APK) | **$0** |
| iOS app on your own device | **$0** (free Apple ID, rebuild weekly) or **$99/yr** (Apple Developer Program) |

**Total for solo self-host: ~$0/month.** Only native iOS carries an optional cost. See the cost breakdown in [`docs/HLD.md`](docs/HLD.md).

---

## 🔒 Security & self-hosting notes

- **Firebase web config is safe to expose** (it's meant to ship in client code) — your security comes from [`firestore.rules`](firestore.rules), not from hiding the config.
- **Never commit** service-account JSON keys, `google-services.json`, or `.env*` files — those grant admin access. They're in [`.gitignore`](.gitignore); keep them there.
- Set a **budget alert** in the Google Cloud console if you enable Blaze, so a runaway query can't surprise you.
- Consider enabling **Firebase App Check** before making an instance multi-user.

---

## 🗺️ Roadmap

- **v1 (current):** the capture → store → retrieve loop across web, extension, and mobile. Tracked in [`TODO.md`](TODO.md).
- **v2:** AI auto-tagging & summaries, "ask your brain" search, Reddit whole-thread capture, voice capture. (Spec'd in the PRD, not built yet.)
- **Later:** resurfacing/reminders, weekly digest, connections between saves, highlights.

Explicitly **not** in v1: any AI, voice/OCR, Reddit/LinkedIn comment scraping, sharing/collaboration. See PRD §13.

---

## 🤝 Contributing

This is a personal project shared openly. Fork it, clone it, adapt it to your needs. If you build something interesting on top, issues and PRs are welcome — but the v1 scope is deliberately small; please read the PRD before proposing features.

---

## 📄 License

MIT — see [`LICENSE`](LICENSE). Use it, change it, ship it.
