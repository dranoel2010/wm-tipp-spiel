// Team-Name -> ISO-Code fuer runde Flaggen (flagcdn, statische Bilder, kein Key).
// Knockout-Platzhalter ("2A", "W74", "3A/B/C/D/F") haben keinen Code -> Fallback.
const ISO = {
  Mexico: "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czech Republic": "cz",
  Canada: "ca",
  "Bosnia & Herzegovina": "ba",
  Qatar: "qa",
  Switzerland: "ch",
  Brazil: "br",
  Morocco: "ma",
  Haiti: "ht",
  Scotland: "gb-sct",
  USA: "us",
  Paraguay: "py",
  Australia: "au",
  Turkey: "tr",
  Germany: "de",
  "Curaçao": "cw",
  Curacao: "cw",
  "Ivory Coast": "ci",
  Ecuador: "ec",
  Netherlands: "nl",
  Japan: "jp",
  Sweden: "se",
  Tunisia: "tn",
  Belgium: "be",
  Egypt: "eg",
  Iran: "ir",
  "New Zealand": "nz",
  Spain: "es",
  "Cape Verde": "cv",
  "Saudi Arabia": "sa",
  Uruguay: "uy",
  France: "fr",
  Senegal: "sn",
  Iraq: "iq",
  Norway: "no",
  Argentina: "ar",
  Algeria: "dz",
  Austria: "at",
  Jordan: "jo",
  Portugal: "pt",
  "DR Congo": "cd",
  Uzbekistan: "uz",
  Colombia: "co",
  England: "gb-eng",
  Croatia: "hr",
  Ghana: "gh",
  Panama: "pa",
};

export function flagUrl(team) {
  const iso = ISO[team];
  return iso ? `https://flagcdn.com/w160/${iso}.png` : null;
}

// Kurzform fuer Fallback-Kreis: Platzhalter -> wie er ist, sonst 3 Buchstaben.
export function teamShort(team) {
  if (!team) return "?";
  if (ISO[team]) return team.slice(0, 3).toUpperCase();
  // Platzhalter wie "2A", "W74", "3A/B/C/D/F"
  return team.length > 4 ? team.slice(0, 4) : team;
}
