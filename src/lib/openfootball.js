// openfootball/worldcup.json -> normalisiertes Match-Array.
// Wird sowohl zur Laufzeit (Admin-Sync) als auch zur Seed-Generierung benutzt,
// damit IDs deterministisch identisch sind.

const PRIMARY =
  "https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json";
const FALLBACK =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

function slug(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "13:00 UTC-6" + "2026-06-11" -> ISO mit Offset "2026-06-11T13:00:00-06:00"
function toIso(date, time) {
  if (!date) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time || "");
  const hh = m ? m[1].padStart(2, "0") : "00";
  const mm = m ? m[2] : "00";
  const tz = /UTC([+-])(\d{1,2})/.exec(time || "");
  let off = "+00:00";
  if (tz) off = `${tz[1]}${tz[2].padStart(2, "0")}:00`;
  return `${date}T${hh}:${mm}:00${off}`;
}

// Stabile ID:
//  - Knockout: hat "num" (100..104 etc.) -> "m{num}" (bleibt stabil, auch wenn
//    Platzhalter W95 spaeter zum echten Team wird)
//  - Gruppenphase: kein "num", aber feste Teams -> aus Datum + Teams
function matchId(m) {
  if (m.num != null) return `m${m.num}`;
  return `g-${slug(m.team1)}_${slug(m.team2)}_${m.date}`;
}

export function parseWorldcup(json) {
  const arr = Array.isArray(json?.matches) ? json.matches : [];
  return arr.map((m) => {
    const ft = m?.score?.ft;
    const hasScore = Array.isArray(ft) && ft.length === 2;
    return {
      id: matchId(m),
      stage: m.round || null,
      grp: m.group || null,
      home: m.team1,
      away: m.team2,
      kickoff: toIso(m.date, m.time),
      home_score: hasScore ? ft[0] : null,
      away_score: hasScore ? ft[1] : null,
      // "finished" nur als Hinweis aus der Quelle; serverseitig entscheidet die RPC,
      // ob ein bereits manuell gesetztes Ergebnis ueberschrieben werden darf.
      source_finished: hasScore,
    };
  });
}

export async function fetchFixtures() {
  for (const url of [PRIMARY, FALLBACK]) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      return parseWorldcup(json);
    } catch {
      /* naechste Quelle */
    }
  }
  throw new Error("openfootball nicht erreichbar (jsDelivr und raw fehlgeschlagen)");
}
