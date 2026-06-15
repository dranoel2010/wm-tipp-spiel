// Datums-/Zeit-Helfer (deutsch). kickoff kommt als ISO mit Offset
// (z. B. "2026-06-18T12:00:00-04:00"); Anzeige in der lokalen Zeitzone des
// Betrachters — bewusst, "wann startet das Spiel fuer mich".

const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTH = [
  "Jan", "Feb", "März", "Apr", "Mai", "Juni",
  "Juli", "Aug", "Sept", "Okt", "Nov", "Dez",
];

export function parseKickoff(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Gruppierungsschluessel pro Kalendertag (lokal). Spiele ohne Termin: "open".
export function dateKey(iso) {
  const d = parseKickoff(iso);
  if (!d) return "open";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function formatDateHeading(iso) {
  const d = parseKickoff(iso);
  if (!d) return "Termin offen";
  return `${WEEKDAY[d.getDay()]} · ${d.getDate()}. ${MONTH[d.getMonth()]}`;
}

export function formatTime(iso) {
  const d = parseKickoff(iso);
  if (!d) return "--:--";
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// Sortierschluessel: Spiele ohne Termin ans Ende.
export function kickoffSortValue(iso) {
  const d = parseKickoff(iso);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}
