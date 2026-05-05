# CLAUDE.md — ARISE MONARCH Project Guide

> Lies das **zuerst**, wenn du an dieser Codebase arbeitest. Hier steht alles, was du nicht aus dem Code rauslesen kannst — User-Profil, Branding-Regeln, Tech-Constraints, Recipes.

---

## Wer ist der User?

- **Melvin Sejdiu**, 24, m, 178 cm, ~102 kg → Ziel: 80 kg nachhaltig
- Wohnt in Bretten, sitzender Job
- Solo Leveling Fan — daher die ganze App-Ästhetik
- Equipment zuhause: Boxsack, Kurz- & Langhantel, Liegestütz-Griffe (kein Gym!)
- Code-Erfahrung: 2-3 Hobby-Projekte, Terminal-Basics, **kein Power-User**, **keine TS-Erfahrung**
- **Hat KEIN Node.js installiert** und will das auch nicht. **Kein Build-Step nutzen.**
- Primär-Device: iPhone (App ist eine PWA, "Zum Home-Bildschirm" hinzufügen)
- Email: melvin.sej@gmail.com

## Goldene Ernährungsregeln (für Quest-/Meal-Inhalte)

- **Kein Crash-Diät-Bullshit** — nachhaltig statt schnell
- **Verbieten geht nach hinten los** — Subway/Gyros/Döner bleiben drin, nur smarter bestellen
- **Goldformel:** Beilagen halbieren, Hauptessen behalten, Add-ons (Mayo/Käse/Pommes-XL) streichen
- **Mama kocht oft** → realistische Lösungen für Familie-Essen, kein "Tupperware mitnehmen" Bullshit
- Anrede in Notifications/Texten: "Hunter" oder "Monarch" ist okay, **kein Floskel-Bullshit** ("Du schaffst das!" → nein. "Push it, Hunter." → ja)

---

## Branding-Regeln

| Element | Wert |
|---|---|
| App-Name | ARISE MONARCH |
| short_name (Homescreen) | Arise |
| System-Banner-Prefix | `⚡ ARISE — ` |
| Drawer-Title | `⚡ ARISE MONARCH` |
| Day-Counter | `⚡ ARISE SEASON 01 · DAY {X}` |
| Theme-Color | `#050810` |
| Accent | `#a855f7` (mid) / `#c084fc` (bright) |
| Endgame-Trigger | S-Rang (Level 50) → "MONARCH ACHIEVED" 5s Special-Animation |

**Was NICHT geändert wird (in-world Lore, kein Brand):**
- Rangsystem: E ANFÄNGER → D ERWACHT → C **HUNTER** → B ELITE → A VETERAN → S MONARCH
- "Hunter" als User-Anrede in Texten ("Weiter so, Hunter")
- `localStorage`-Key `hunter_app_v2` — **NIEMALS umbenennen** (User-Daten würden verloren gehen)

---

## Tech-Stack

**No-Build Native Modules** — keine Node-Installation nötig, keine npm-Pakete, kein Vite, kein bundling.

```
arise-monarch/
├── .github/workflows/
│   ├── deploy.yml         # GitHub Pages auto-deploy on push to main
│   ├── push-notify.yml    # Cron 4×/Tag → web-push an alle Subscribers
│   └── send-push.mjs      # Helper-Script (Node, läuft nur in Actions, nicht lokal)
├── icons/
│   ├── lightning.svg              # Default Icon (Blitz)
│   ├── lightning-maskable.svg     # Android maskable purpose
│   ├── crown.svg                  # Alternative (Krone, für Switch via manifest)
│   ├── apple-touch-icon.png       # 180x180, generiert von make-apple-touch-icon.ps1
│   └── make-apple-touch-icon.ps1  # PowerShell GDI+ Generator (nur bei Bedarf neu rendern)
├── data/                  # zukünftig: quests.json, workouts.json, meals.json (Phase 5)
├── index.html             # Komplette App, Single-File mit eingebettetem CSS+JS
├── manifest.webmanifest   # PWA-Manifest
├── sw.js                  # Service Worker — cache-first für Shell, network-first für /data/*.json, push-Handler
├── notifications.js       # ES-Module, importiert von index.html: Local Scheduling + Push Subscribe Helper
├── _v6-reference.html     # Original Hunter System v6 als Backup, NIE löschen
├── CLAUDE.md              # dieses File
└── README.md              # Deploy-Anleitung für User
```

- **Chart.js** kommt via CDN (gecached vom SW). Nicht durch ein npm-Paket ersetzen.
- **localStorage** ist die einzige Persistierung. Kein IndexedDB, keine API.
- **Mobile-first** — alle Screens müssen auf 375×812 (iPhone X-Range) passen, max-width 640px Container.
- **Deutsche UI bleibt deutsch.** Keine Texte nach Englisch übersetzen.

---

## Modul-Splitting

**Aktueller Stand:** index.html ist noch single-file (~3300 Zeilen IIFE). Modul-Splittung (state.js, quests.js, training.js, etc.) ist als optionaler Schritt im Plan-File `.claude/plans/hey-ich-hab-eine-splendid-marble.md` geparkt — User entscheidet, ob/wann das nötig ist.

**Wichtig wenn du splittest:** Storage-Key `hunter_app_v2` bleibt überall identisch. v6 hat alle Funktionen in einem IIFE — beim Refactor IIFE-Wrapping entfernen, einzelne Module exportieren, in `main.js` zusammenfügen.

---

## Recipes

### Quest-Texte ändern (ohne Code anzufassen)

Aktuell sind Quests in index.html hardcoded (Z. ~1925-1943). Sobald data/quests.json existiert (Phase 5):

1. GitHub-Web-UI → `data/quests.json` → Bleistift-Icon
2. Text editieren, commit message "tweak: ..."
3. Auto-Deploy via deploy.yml ist binnen 60s live
4. Auf iPhone: App schließen, neu öffnen — Service-Worker pullt frische JSON (network-first)

### Icon zwischen Lightning ⚡ und Crown 👑 wechseln

In `manifest.webmanifest` und `index.html` die Pfade ändern:
- `icons/lightning.svg` → `icons/crown.svg`
- `icons/lightning-maskable.svg` → `icons/crown-maskable.svg` (falls noch zu generieren)
- apple-touch-icon.png muss neu generiert werden (PowerShell-Script anpassen für Crown-Polygon)

### Phase 6b — Echte Background-Push aktivieren

iOS pausiert lokale Notifications wenn die App geschlossen ist. Für garantierte Pushes (auch bei geschlossener App) brauchst du Web-Push via VAPID + GitHub Actions Cron. Setup einmalig:

1. **VAPID-Keys generieren** — auf https://vapidkeys.com/ klicken oder lokal `npx web-push generate-vapid-keys` (braucht aber Node auf dem Rechner). Web-Generator ist einfacher.

2. **GitHub Repo → Settings → Secrets and variables → Actions**:
   - `VAPID_PUBLIC_KEY` = der publicKey aus Schritt 1
   - `VAPID_PRIVATE_KEY` = der privateKey aus Schritt 1
   - `VAPID_SUBJECT` = `mailto:melvin.sej@gmail.com`
   - `GIST_ID` = ID eines public Gist mit einer Datei `subscriptions.json` (Inhalt: `[]` initial)
   - `GIST_TOKEN` = optional, nur nötig wenn Gist privat oder Schreiben gewünscht

3. **Public-Key ins Frontend** — am sichersten als Konstante in `notifications.js` (oder als data-Attribut im HTML). Beispiel inline in DevTools-Konsole 1× ausführen:
   ```js
   await window.AriseNotif.subscribePush('PUBLIC_KEY_HIER', 'GIST_WRITE_ENDPOINT');
   ```
   Subscription wird im Gist gespeichert.

4. **Cron-Zeiten anpassen** in `.github/workflows/push-notify.yml` — aktuell auf MESZ-Sommer kalibriert (UTC-2). Im Winter musst du auf UTC-1 wechseln, oder beide Slots einbauen.

5. **Test:** GitHub → Actions → "ARISE — Push Notifications" → Run workflow → slot "test" → Push sollte aufs iPhone kommen.

### iOS-PWA installieren

1. iPhone öffnet `https://<username>.github.io/arise-monarch/` in Safari
2. Share-Button (Quadrat mit Pfeil) → "Zum Home-Bildschirm"
3. Name "Arise" bestätigen → Hinzufügen
4. App erscheint mit Lightning-Icon, full-screen launch ohne Safari-Chrome
5. Beim ersten Öffnen: 1 Quest erledigen → kurz darauf wird Notification-Permission gefragt
6. Drawer öffnen → Settings-Panel → Toggles aktivieren → "Test-Notification senden" zur Verifikation

### iPhone Web-Push-Voraussetzung

iOS ≥ 16.4 + **PWA installiert (zum Home-Bildschirm hinzugefügt)**. In Safari-Tab funktioniert kein Push. Wenn `Notification.requestPermission()` direkt `denied` returned ohne Prompt → meist ist die App nicht als PWA installiert.

---

## Bekannte Limits / Caveats

- **Cron-Genauigkeit:** GitHub Actions Cron kann 5-15 min Verzögerung haben. Für 09:00 = 09:00-09:15.
- **Sommerzeit:** Cron-Zeiten in `push-notify.yml` müssen 2× pro Jahr manuell geshiftet werden (UTC ↔ MESZ).
- **Gist-Subscription-Store:** wenn der User mehrere Devices subscribed, wachsen die Subscriptions im Gist. Periodisch alte/abgelaufene rausräumen wenn nötig.
- **Apple-Touch-Icon:** ist ein bewusst einfaches PNG, generiert via .NET GDI+ (PowerShell). Wenn du was Schöneres willst, nimm `lightning.svg` und schick es durch realfavicongenerator.net.

---

## Wenn du was änderst

- Storage-Format ändern? **Migration einbauen, NICHT Key ändern**. Default: `state[neuesFeld] ?? defaultwert`.
- Neue Animation? CSS in den `<style>`-Block, nutzt vorhandene Color-Variablen `#a855f7` / `#c084fc` / `#fbbf24` (Gold für Endgame).
- Neue Notification? Template in `notifications.js` `NOTIF_TEMPLATES` UND in `.github/workflows/send-push.mjs` `TEMPLATES` synchron halten.
- v6-Referenz nicht löschen — `_v6-reference.html` ist die Rollback-Versicherung.
