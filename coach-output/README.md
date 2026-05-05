# 🤖 Coach-Output

Hier landen die täglichen Outputs der ARISE MONARCH Coach-Agents:

| Datei | Wer | Wann |
|---|---|---|
| `today-fitness.md` | 🏋️ Fitness-Coach | Täglich 06:30 |
| `today-nutrition.md` | 🥗 Nutrition-Coach | Täglich 07:30 |
| `weekly-review.md` | 📊 Progress-Analyst | Sonntag 19:00 |
| `weekly-mindset.md` | 🔥 Mindset-Coach | Sonntag 20:00 |
| `daily-check.md` | 📊 Progress (kurz, optional) | Bei Bedarf |
| `today-mindset.md` | 🔥 Mindset (Daily Push) | Bei Bedarf |
| `state-export.json` | 📊 Progress liest hier | User exportiert manuell wenn gefragt |

Archiv-Files: `YYYY-MM-DD-{fitness,nutrition,mindset}.md` und `YYYY-WW-review.md`.

## Wie kommt der Output in die App?

Die ARISE MONARCH PWA fetched `today-fitness.md` und `today-nutrition.md` aus diesem Ordner und zeigt sie im Dashboard als "🤖 COACH HEUTE" Card.

## Wie kommen Coaches an State-Daten?

Wenn Progress-Coach echte Zahlen braucht: in der App-DevTools Console:
```js
copy(localStorage.getItem('hunter_app_v2'))
```
→ Inhalt in `state-export.json` einfügen.
