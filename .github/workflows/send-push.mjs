// ARISE — sendet Web-Push an alle subscribed Devices
// Liest Subscriptions aus subscriptions.json im Repo-Root.
// Slot-Templates synchron mit notifications.js NOTIF_TEMPLATES.

import webpush from 'web-push';
import fs from 'node:fs/promises';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SLOT } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  console.error('VAPID keys missing — set repo secrets first.');
  process.exit(0);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const TEMPLATES = {
  water_0900:      { title: '⚡ ARISE',          body: 'Tag startet. Wasser-Quest aktivieren.',   tag: 'arise-water' },
  lunch_1230:      { title: '☀ MITTAGSPAUSE',   body: 'Smart bestellen — Goldformel.',           tag: 'arise-lunch' },
  questCheck_1800: { title: '🌙 EVENING CHECK',  body: 'Quests offen. Push it, Hunter.',          tag: 'arise-evening' },
  streakRisk_2100: { title: '🔥 STREAK GEFAHR',  body: 'Streak in Gefahr. Last call.',            tag: 'arise-streak' },
  test:            { title: '⚡ ARISE — Test',   body: 'GitHub Actions push works, Hunter.',      tag: 'arise-test' }
};

const tpl = TEMPLATES[SLOT] || TEMPLATES.test;
console.log(`[ARISE] Slot=${SLOT}, sending: ${tpl.title} — ${tpl.body}`);

let subs = [];
try {
  const raw = await fs.readFile('subscriptions.json', 'utf8');
  subs = JSON.parse(raw);
} catch (e) {
  console.warn('subscriptions.json not found or invalid — nothing to send.');
  process.exit(0);
}

if (!Array.isArray(subs) || subs.length === 0) {
  console.log('No subscribers yet. Add one via the App → Drawer → 📡 Garantierte Push aktivieren.');
  process.exit(0);
}

const payload = JSON.stringify({ title: tpl.title, body: tpl.body, tag: tpl.tag, url: '/' });
const results = await Promise.allSettled(
  subs.map(sub => webpush.sendNotification(sub, payload))
);
const ok = results.filter(r => r.status === 'fulfilled').length;
const fail = results.length - ok;
results.forEach((r, i) => {
  if (r.status === 'rejected') {
    console.warn(`[ARISE] sub #${i} failed:`, r.reason?.statusCode || r.reason?.message || r.reason);
  }
});
console.log(`[ARISE] sent ${ok}/${results.length} (failed: ${fail})`);
