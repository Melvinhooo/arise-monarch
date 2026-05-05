# ⚡ ARISE MONARCH

Solo-Leveling-styled Fitness-Tracker als iPhone-PWA. Daily Quests, XP, Ränge E→S, Charts, Trainingsplan, Goldformel-Ernährung.

> **No-Build Setup:** keine Node-Installation, keine npm-Pakete, kein Build-Step. Alles statisch, läuft direkt aus dem Repo.

---

## 🚀 Quickstart — Lokal testen

Einfach `index.html` doppelklicken — läuft im Browser. **Aber:** Service Worker und PWA-Install funktionieren nur über HTTPS oder localhost.

**Für iPhone-Test im selben WLAN** — VS Code Live Server Extension oder ein simpler Python-HTTP-Server tun's:

```bash
# Wenn Python da ist:
python -m http.server 8080

# Dann auf iPhone Safari: http://<dein-laptop-ip>:8080
```

> Auf der iPhone-Seite klappt der Add-to-Homescreen-Flow nicht ohne HTTPS. Für echten Test: deployed auf GitHub Pages (siehe unten).

---

## 📦 Deployment auf GitHub Pages

### One-Time Setup

1. **GitHub Repo erstellen** (public empfohlen — unlimited Actions-Minutes):
   ```bash
   git init
   git add -A
   git commit -m "ARISE MONARCH — initial PWA build"
   git branch -M main
   git remote add origin git@github.com:<dein-user>/arise-monarch.git
   git push -u origin main
   ```

2. **GitHub Pages aktivieren:**
   - Repo → Settings → Pages
   - Source: **GitHub Actions**
   - Beim ersten Push läuft `.github/workflows/deploy.yml` automatisch
   - Nach ~60s: App live unter `https://<dein-user>.github.io/arise-monarch/`

### Auf iPhone installieren

1. Safari öffnen → URL aus Schritt 2 oben
2. Share-Button (Quadrat mit Pfeil hoch) → **Zum Home-Bildschirm**
3. Name "Arise" bestätigen
4. App erscheint mit ⚡-Icon, voll-screen, ohne Browser-UI

---

## 🔔 Push-Notifications

### Phase 6a — Lokal (sofort funktioniert)

Drawer öffnen → Settings-Panel → Toggles aktivieren. Beim ersten Toggle wird iOS um Permission fragen.

**Limit:** iOS pausiert installierte Web-Apps im Hintergrund. Lokale Erinnerungen feuern zuverlässig nur, wenn die App in den letzten ~30 Min offen war. Für 09:00-Reminder bei geschlossener App → Phase 6b.

### Phase 6b — Echte Background-Push via GitHub Actions

Setup-Anleitung in [`CLAUDE.md`](./CLAUDE.md#phase-6b--echte-background-push-aktivieren). Kurzfassung:
1. VAPID-Keys generieren (vapidkeys.com)
2. Repo Secrets setzen (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, GIST_ID)
3. Public Gist mit `subscriptions.json: []` anlegen
4. `await window.AriseNotif.subscribePush(PUBLIC_KEY, GIST_ENDPOINT)` einmalig in DevTools
5. GitHub Actions Cron läuft 4× pro Tag

---

## 🗂 Projekt-Struktur

```
arise-monarch/
├── index.html             # die ganze App (Single-File HTML+CSS+JS)
├── manifest.webmanifest   # PWA-Manifest
├── sw.js                  # Service Worker (offline-cache + push-handler)
├── notifications.js       # Reminder-Scheduler (ES-Module)
├── icons/                 # ⚡ Lightning + 👑 Crown SVGs + apple-touch PNG
├── .github/workflows/     # GitHub Pages Deploy + Cron-Push
├── _v6-reference.html     # Backup des originalen Hunter System v6
├── CLAUDE.md              # Branding-Guide + Setup-Recipes für Claude
└── README.md              # diese Datei
```

---

## 🛠 Quest-Texte / Workouts / Meals ändern

Aktuell sind die Quests in `index.html` (~Z. 1925-1943) hardcoded. Phase 5 zieht sie nach `data/quests.json` raus, dann kann man sie direkt im GitHub-Web-Editor ändern → commit → 60s später live auf dem iPhone.

---

## 🎨 Icon-Variante wechseln

`icons/` enthält zwei Sets: **Lightning** (Default, ⚡) und **Crown** (👑). In `manifest.webmanifest` + `index.html` die Pfade tauschen — siehe [`CLAUDE.md` → "Icon wechseln"](./CLAUDE.md#icon-zwischen-lightning--und-crown--wechseln).

---

## ⚖ License

Persönliches Projekt. Solo Leveling ist Eigentum von Chugong / D&C Media — diese App ist eine Hommage, kein offizielles Produkt.
