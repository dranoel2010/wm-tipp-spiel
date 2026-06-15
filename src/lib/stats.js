import { kickoffSortValue } from "./format.js";

// Leitet Spieler-Statistiken aus SERVER-gelieferten Punkten ab (kein eigenes
// Scoring!). Eingaben: tips = get_my_tips, matches = get_matches.
const POINTS_PER_LEVEL = 200;

export function deriveStats(tips, matches) {
  const byId = new Map(matches.map((m) => [m.id, m]));

  // gewertete Tipps (points != null) chronologisch nach Anpfiff
  const scored = tips
    .filter((t) => t.points != null && byId.has(t.match_id))
    .map((t) => ({ ...t, kickoff: byId.get(t.match_id)?.kickoff }))
    .sort((a, b) => kickoffSortValue(a.kickoff) - kickoffSortValue(b.kickoff));

  const total = scored.reduce((s, t) => s + (t.points || 0), 0);
  const played = scored.length;
  const correct = scored.filter((t) => t.points > 0).length; // Tendenz oder besser
  const exact = scored.filter((t) => t.points === 4).length; // exaktes Ergebnis
  const accuracy = played ? Math.round((correct / played) * 100) : 0;

  // kumulierter Punkteverlauf
  let run = 0;
  const series = scored.map((t) => {
    run += t.points || 0;
    return { kickoff: t.kickoff, value: run };
  });

  // Serien (aufeinanderfolgende Treffer mit points > 0)
  let best = 0;
  let acc = 0;
  for (const t of scored) {
    if (t.points > 0) {
      acc += 1;
      if (acc > best) best = acc;
    } else acc = 0;
  }
  // aktuelle Serie: von hinten
  let current = 0;
  for (let i = scored.length - 1; i >= 0; i--) {
    if (scored[i].points > 0) current += 1;
    else break;
  }

  // Punkte der letzten 7 Tage
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekPoints = scored
    .filter((t) => {
      const ko = t.kickoff ? new Date(t.kickoff).getTime() : 0;
      return ko >= weekAgo;
    })
    .reduce((s, t) => s + (t.points || 0), 0);

  const level = Math.floor(total / POINTS_PER_LEVEL) + 1;
  const levelFloor = (level - 1) * POINTS_PER_LEVEL;
  const levelCap = level * POINTS_PER_LEVEL;

  return {
    total,
    played,
    correct,
    exact,
    accuracy,
    series,
    bestStreak: best,
    currentStreak: current,
    weekPoints,
    level,
    levelFloor,
    levelCap,
    levelProgress: Math.min(1, (total - levelFloor) / POINTS_PER_LEVEL),
  };
}

// Abzeichen aus echten Werten ableiten (earned + Fortschrittstext).
export function deriveBadges(s) {
  return [
    {
      key: "treffer",
      label: "Treffsicher",
      sub: "5 exakte Treffer",
      tone: "primary",
      earned: s.exact >= 5,
      progress: `${Math.min(s.exact, 5)}/5`,
    },
    {
      key: "taktik",
      label: "Taktiker",
      sub: "10 richtige Tipps",
      tone: "danger",
      earned: s.correct >= 10,
      progress: `${Math.min(s.correct, 10)}/10`,
    },
    {
      key: "serie",
      label: "Seriensieger",
      sub: "5 in Folge",
      tone: "gold",
      earned: s.bestStreak >= 5,
      progress: `${Math.min(s.bestStreak, 5)}/5`,
    },
    {
      key: "punkte",
      label: "Punktejäger",
      sub: "100 Punkte",
      tone: "green",
      earned: s.total >= 100,
      progress: `${Math.min(s.total, 100)}/100`,
    },
  ];
}
