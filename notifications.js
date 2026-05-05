// ARISE MONARCH — Notifications Module
// Phase 6a: Lokale Notifications via Notification API + setTimeout (App muss offen sein)
// Phase 6b: Web-Push via VAPID — Subscriptions liegen in subscriptions.json im Repo,
//           GitHub Actions Cron sendet die Pushes 4×/Tag.

// Public VAPID-Key für ARISE MONARCH (Private-Key liegt als GitHub Secret im Repo)
export const ARISE_VAPID_PUBLIC_KEY = 'BLyMAdOydy5aQcSwYlCMNZFl3f4rOyXgskGXLwTzUz-eY3aPFHpJxuA5NOFr1tyfKi1yhTCRWknZtVZCx1E1g_U';

const ARISE_NOTIF_KEY = 'arise_notif_settings_v1';
const ARISE_PUSH_KEY = 'arise_push_subscription_v1';

const DEFAULT_SETTINGS = {
  enabled: false,         // Master-Switch (auto-set wenn permission granted)
  water_0900: true,
  lunch_1230: true,
  questCheck_1800: true,
  streakRisk_2100: true,
  workoutReminder: false, // 1h vor Trainingszeit, default off bis User Time setzt
  workoutTime: '18:00',
  pushSubscribed: false   // Phase 6b — echte Push via GitHub Actions
};

const NOTIF_TEMPLATES = {
  water_0900: { title: '⚡ ARISE', body: 'Tag {DAY} startet. Wasser-Quest aktivieren.', tag: 'arise-water' },
  lunch_1230: { title: '☀ MITTAGSPAUSE', body: 'Smart bestellen — Goldformel.', tag: 'arise-lunch' },
  questCheck_1800: { title: '🌙 EVENING CHECK', body: '{OPEN} Quests offen. Push it, Hunter.', tag: 'arise-evening' },
  streakRisk_2100: { title: '🔥 STREAK GEFAHR', body: 'Streak {STREAK} Tage. Last call.', tag: 'arise-streak' },
  workoutReminder: { title: '💪 WORKOUT', body: 'In 1h: Training. Hunter-Modus on.', tag: 'arise-workout' }
};

let scheduledTimeouts = [];
let midnightRollover = null;

export const Notif = {
  // ---------- Settings ----------
  loadSettings() {
    try {
      const saved = localStorage.getItem(ARISE_NOTIF_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings) {
    try { localStorage.setItem(ARISE_NOTIF_KEY, JSON.stringify(settings)); } catch (e) {}
  },

  // ---------- Permission ----------
  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (e) {
      return 'error';
    }
  },

  hasPermission() {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  // ---------- Test ----------
  async test() {
    const perm = await this.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: perm };
    new Notification('⚡ ARISE — Test', {
      body: 'Notifications funktionieren. Welcome to the climb, Hunter.',
      icon: 'icons/apple-touch-icon.png',
      tag: 'arise-test'
    });
    return { ok: true };
  },

  // ---------- Local Scheduling ----------
  // ctx ist ein Objekt mit Live-State der App: { day, openQuests, streak }
  // Damit die Notifications dynamische Werte einsetzen können
  scheduleAll(ctx) {
    this.cancelAll();
    const settings = this.loadSettings();
    if (!settings.enabled || !this.hasPermission()) return;

    const slots = [
      ['water_0900', 9, 0],
      ['lunch_1230', 12, 30],
      ['questCheck_1800', 18, 0],
      ['streakRisk_2100', 21, 0]
    ];

    for (const [key, hh, mm] of slots) {
      if (!settings[key]) continue;
      this._scheduleAt(hh, mm, () => this._fire(key, ctx));
    }

    if (settings.workoutReminder && settings.workoutTime) {
      const [wh, wm] = settings.workoutTime.split(':').map(Number);
      // 1h vorher
      let h = wh - 1, m = wm;
      if (h < 0) { h += 24; }
      this._scheduleAt(h, m, () => this._fire('workoutReminder', ctx));
    }

    // Re-arm um Mitternacht (alle Slots gelten ab dann für den neuen Tag)
    midnightRollover = this._scheduleAt(0, 0, () => this.scheduleAll(ctx), 5);
  },

  cancelAll() {
    scheduledTimeouts.forEach(clearTimeout);
    scheduledTimeouts = [];
    if (midnightRollover) clearTimeout(midnightRollover);
    midnightRollover = null;
  },

  _scheduleAt(hh, mm, fn, plusSec = 0) {
    const now = new Date();
    const target = new Date();
    target.setHours(hh, mm, plusSec, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target.getTime() - now.getTime();
    const id = setTimeout(fn, delay);
    scheduledTimeouts.push(id);
    return id;
  },

  _fire(key, ctx) {
    if (!this.hasPermission()) return;
    const settings = this.loadSettings();
    const tpl = NOTIF_TEMPLATES[key];
    if (!tpl) return;

    // Predicates: 18:00 nur wenn weniger als 5 Quests done; 21:00 nur bei Streak-Gefahr
    const open = ctx?.openQuests ?? 0;
    const streak = ctx?.streak ?? 0;
    const done = ctx?.doneToday ?? 0;
    if (key === 'questCheck_1800' && done >= 5) return;
    if (key === 'streakRisk_2100' && (streak < 3 || done >= 5)) return;

    const body = tpl.body
      .replace('{DAY}', String(ctx?.day ?? '?'))
      .replace('{OPEN}', String(open))
      .replace('{STREAK}', String(streak));

    try {
      new Notification(tpl.title, {
        body,
        icon: 'icons/apple-touch-icon.png',
        tag: tpl.tag
      });
    } catch (e) {
      // Page potentially closing — ask SW to fire
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'show-notification',
          payload: { title: tpl.title, body, tag: tpl.tag }
        });
      }
    }
  },

  // ---------- Phase 6b: GitHub-Actions-Push Subscription ----------
  // Erstellt eine Push-Subscription via VAPID. Returned die Subscription-JSON,
  // die dann ins Repo (subscriptions.json) committed werden muss damit der
  // GitHub Actions Cron sie findet.
  async subscribePush(vapidPublicKey = ARISE_VAPID_PUBLIC_KEY) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, reason: 'Push API nicht unterstützt — App muss als PWA installiert sein.' };
    }
    if (Notification.permission !== 'granted') {
      const r = await this.requestPermission();
      if (r !== 'granted') return { ok: false, reason: 'Permission nicht erteilt: ' + r };
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this._urlBase64ToUint8Array(vapidPublicKey)
        });
      }
      const json = sub.toJSON();
      try { localStorage.setItem(ARISE_PUSH_KEY, JSON.stringify(json)); } catch (e) {}
      return { ok: true, subscription: json };
    } catch (e) {
      return { ok: false, reason: String(e?.message || e) };
    }
  },

  hasPushSubscription() {
    try { return !!localStorage.getItem(ARISE_PUSH_KEY); }
    catch (e) { return false; }
  },

  _urlBase64ToUint8Array(b64) {
    const padding = '='.repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
  }
};

// Globale Verfügbarkeit für inline-Scripts in v6 (wird später durch Modul-Imports abgelöst)
if (typeof window !== 'undefined') window.AriseNotif = Notif;
