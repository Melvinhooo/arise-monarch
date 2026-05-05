// ARISE — sendet Web-Push an alle subscribed Devices
// Liest Subscriptions aus subscriptions.json im Repo-Root.
// Detailed logging für Debugging. Auto-cleanup invalider Subs (commit zurück).

import webpush from 'web-push';
import fs from 'node:fs/promises';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SLOT } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
  console.error('❌ VAPID keys missing — set repo secrets first.');
  process.exit(0);
}

console.log(`✅ VAPID configured (subject=${VAPID_SUBJECT})`);
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const TEMPLATES = {
  water_0900:      { title: '⚡ ARISE',          body: 'Tag startet. Wasser-Quest aktivieren.',   tag: 'arise-water' },
  lunch_1230:      { title: '☀ MITTAGSPAUSE',   body: 'Smart bestellen — Goldformel.',           tag: 'arise-lunch' },
  questCheck_1800: { title: '🌙 EVENING CHECK',  body: 'Quests offen. Push it, Hunter.',          tag: 'arise-evening' },
  streakRisk_2100: { title: '🔥 STREAK GEFAHR',  body: 'Streak in Gefahr. Last call.',            tag: 'arise-streak' },
  test:            { title: '⚡ ARISE — Test',   body: 'GitHub Actions push works, Hunter.',      tag: 'arise-test' }
};

const tpl = TEMPLATES[SLOT] || TEMPLATES.test;
console.log(`📡 Slot=${SLOT}, Template: "${tpl.title}" — "${tpl.body}"`);

let subs = [];
try {
  const raw = await fs.readFile('subscriptions.json', 'utf8');
  subs = JSON.parse(raw);
} catch (e) {
  console.warn('⚠ subscriptions.json not found or invalid:', e.message);
  process.exit(0);
}

if (!Array.isArray(subs) || subs.length === 0) {
  console.log('⚠ No subscribers yet. Add one via App → Drawer → 📡 Garantierte Push aktivieren.');
  process.exit(0);
}

console.log(`📨 ${subs.length} subscription(s) loaded`);

const payload = JSON.stringify({ title: tpl.title, body: tpl.body, tag: tpl.tag, url: '/' });
console.log(`📦 Payload: ${payload}`);

const results = [];
const stillValid = [];

for (let i = 0; i < subs.length; i++) {
  const sub = subs[i];
  const endpointShort = sub.endpoint?.substring(0, 60) + '...';
  console.log(`\n[${i + 1}/${subs.length}] Sending to: ${endpointShort}`);
  try {
    const res = await webpush.sendNotification(sub, payload);
    console.log(`  ✅ HTTP ${res.statusCode} — body: ${res.body?.substring(0, 100) || '(empty)'}`);
    results.push({ ok: true, status: res.statusCode });
    stillValid.push(sub);
  } catch (err) {
    const code = err.statusCode || 'unknown';
    console.log(`  ❌ HTTP ${code} — ${err.body || err.message}`);
    results.push({ ok: false, status: code, error: err.body || err.message });
    // 410 Gone = subscription expired/unsubscribed → remove
    // 404 Not Found = endpoint dead → remove
    if (code === 410 || code === 404) {
      console.log(`  🗑 Removing dead subscription (status ${code})`);
    } else {
      // andere Errors: behalten, könnte temporär sein
      stillValid.push(sub);
    }
  }
}

const ok = results.filter(r => r.ok).length;
const fail = results.length - ok;
console.log(`\n═══ Summary: sent ${ok}/${results.length} (failed: ${fail}) ═══`);

// Wenn Subscriptions entfernt wurden: subscriptions.json updaten + commit (autocleanup)
if (stillValid.length !== subs.length) {
  console.log(`\n🧹 Cleanup: ${subs.length - stillValid.length} dead subscription(s) removed`);
  await fs.writeFile('subscriptions.json', JSON.stringify(stillValid, null, 2) + '\n', 'utf8');
  console.log('  → subscriptions.json updated. Commit will follow in workflow step.');
}

if (ok === 0 && results.length > 0) {
  console.error('\n⚠ All sends failed. Check VAPID keys + subscription validity.');
  process.exit(1);
}
