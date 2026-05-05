// ARISE — sendet Web-Push an alle subscribed Devices
// Wird von push-notify.yml aufgerufen. Liest Subscriptions aus einem öffentlichen GitHub Gist.
//
// Slot-Templates kompatibel mit notifications.js NOTIF_TEMPLATES.

import webpush from 'web-push';
import fetch from 'node-fetch';

const {
  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
  GIST_ID, GIST_TOKEN, SLOT
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  console.error('VAPID keys missing — set repo secrets first.');
  process.exit(0); // exit 0 = soft fail, sonst spammt Actions failures
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

if (!GIST_ID) {
  console.warn('GIST_ID not set — no subscriptions to send to.');
  process.exit(0);
}

const gistUrl = `https://api.github.com/gists/${GIST_ID}`;
const headers = GIST_TOKEN ? { 'Authorization': `token ${GIST_TOKEN}`, 'Accept': 'application/vnd.github+json' } : {};

const res = await fetch(gistUrl, { headers });
if (!res.ok) {
  console.error('Failed to fetch gist:', res.status, await res.text());
  process.exit(0);
}
const gist = await res.json();
const file = gist.files['subscriptions.json'];
if (!file) {
  console.warn('No subscriptions.json in gist — nothing to send.');
  process.exit(0);
}

let subs;
try { subs = JSON.parse(file.content); }
catch (e) { console.error('subscriptions.json malformed:', e.message); process.exit(0); }

if (!Array.isArray(subs) || subs.length === 0) {
  console.log('No subscribers yet.');
  process.exit(0);
}

const payload = JSON.stringify({ title: tpl.title, body: tpl.body, tag: tpl.tag, url: '/' });
const results = await Promise.allSettled(
  subs.map(sub => webpush.sendNotification(sub, payload))
);
const ok = results.filter(r => r.status === 'fulfilled').length;
const fail = results.length - ok;
console.log(`[ARISE] sent ${ok}/${results.length} (failed: ${fail})`);
