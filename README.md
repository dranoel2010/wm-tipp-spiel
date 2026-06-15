# WM 2026 · Tippspiel

Multi-User-Tippspiel zur Fußball-WM 2026. Freunde treten per Code einer Liga bei,
tippen Spiele **vor Anpfiff**, eine Rangliste wertet nach Kicktipp-Standard **4/3/2**
aus. Spielplan und Ergebnisse kommen aus [openfootball](https://github.com/openfootball/worldcup.json),
mit manuellem Admin-Override als Fallback.

## Architektur & Sicherheit (kurz)

- **Identität = Token (UUID).** Beim Anlegen/Beitreten liefert eine RPC einen Token,
  der im `localStorage` (`wm_token`) liegt. Kein Login, keine E-Mail. Session-Restore
  über `whoami(token)`.
- **RPC-only.** Alle Tabellen haben RLS ohne Policies — der `anon`-Key darf
  ausschließlich die `SECURITY DEFINER`-Funktionen aus `supabase/schema.sql` ausführen.
  Der Client liest/schreibt **nie** direkt auf Tabellen (insbesondere nicht auf `tip`).
- **Anpfiff-Sperre & Tippgeheimnis serverseitig.** `submit_tip` lehnt Tipps ab
  Anpfiff ab; fremde Tipps gibt `get_match_tips` erst ab Anpfiff frei. Die UI spiegelt
  das nur.
- **Scoring** rechnet der Server (`wm_score`): 4 exakt · 3 Tordifferenz · 2 Tendenz ·
  0 sonst. Der Client zeigt nur die gelieferten `points`.
- **Override-Schutz.** Manuell gesetzte Ergebnisse (`admin_set_result`) überleben jeden
  openfootball-Sync (`admin_upsert_matches`).

## Tech-Stack

React 18 · Vite · Tailwind v4 (`@tailwindcss/vite`) · `@supabase/supabase-js` ·
`lucide-react` · pnpm. Deploy-Ziel Vercel, Supabase-Region EU (Frankfurt).

## Einrichtung — manuelle Schritte

1. **Supabase-Projekt anlegen** (Region **EU / Frankfurt**). Im **SQL Editor** das
   komplette Skript `supabase/schema.sql` ausführen. Es legt Tabellen, RLS, Scoring
   und alle RPCs an.
2. **`.env` ausfüllen** (Datei liegt im Repo, Werte aus Supabase →
   _Project Settings → API_):
   ```
   VITE_SUPABASE_URL=https://<projekt>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```
3. **Lokal testen:**
   ```
   pnpm install
   pnpm dev
   ```
4. **Vercel-Deploy:** Repo importieren, Framework „Vite", Build `pnpm build`, Output
   `dist`. Die beiden `VITE_SUPABASE_*`-Variablen unter _Settings → Environment
   Variables_ setzen (Production + Preview) und neu deployen.
5. **In der App „Liga anlegen"** → du bist Admin → im Admin-Tab einmal
   **„Synchronisieren"** (zieht den echten Spielplan + bereits gespielte Ergebnisse) →
   den angezeigten **Liga-Code** an die Freundesrunde teilen.

> Vor dem ersten Sync zeigt die App den mitgelieferten Seed-Spielplan
> (`src/data/seed-fixtures.json`) nur zur Vorschau; Tipps lassen sich erst nach dem
> ersten Admin-Sync speichern (die Spiele müssen serverseitig existieren).

## Bedienung (5 Tabs, Design 1:1 aus `UI/`)

- **Home** — Begrüßung, Liga-Card mit Mitgliedern, „Nächstes Spiel" mit „Tipp abgeben",
  Liste der kommenden Spiele.
- **Spiele** — alle Spiele nach Datum gruppiert. Antippen öffnet den Spieltip:
  1X2-Auswahl + exaktes Ergebnis (Dropdowns) + „Tipp speichern". Ab Anpfiff gesperrt
  (read-only) mit Ergebnis, eigenem Tipp/Punkten und „Tipps der Mitspieler".
- **Rangliste** — Podium für die Top 3, darunter die weiteren Plätze; deine Zeile ist
  hervorgehoben. (Zeitraum-Tabs „Woche/Monat" sind als Platzhalter angelegt; der Server
  liefert nur die Gesamtwertung.)
- **Statistiken** — Punktverlauf (Chart), Trefferquote, richtige Ergebnisse, Serien.
  Alle Werte werden aus den **vom Server gelieferten Punkten** abgeleitet (kein eigenes
  Scoring), inkl. Level & Abzeichen.
- **Profil** — Level/Fortschritt, Abzeichen, Liga-Card, Einstellungen. Der Admin
  erreicht hier **„Liga verwalten"**: Liga-Code teilen, openfootball synchronisieren,
  pro Spiel Ergebnis manuell setzen/löschen.

Flaggen werden als runde Bilder von `flagcdn.com` geladen (statisch, kein Key); für
K.-o.-Platzhalter (`2A`, `W74`, …) und unbekannte Namen gibt es einen Kürzel-Fallback.

## Datenquelle

`src/lib/openfootball.js` parst
`https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json`
(Fallback `raw.githubusercontent.com`). Der Browser lädt direkt — kein Proxy, kein
API-Key. `src/data/seed-fixtures.json` ist ein vorab geparster Snapshot für den
Offline-Start.

## Projektstruktur

```
supabase/schema.sql         Datenmodell, RLS, Scoring, RPCs  (Quelle der Wahrheit)
src/lib/openfootball.js     openfootball-Parser              (Quelle der Wahrheit)
src/data/seed-fixtures.json vorab geparster Spielplan        (Quelle der Wahrheit)
src/lib/supabase.js         Client + RPC-Helfer (rpcRow/rpcRows/rpcValue)
src/lib/useLeagueData.js    zentraler Daten-Hook (matches/tips/leaderboard)
src/lib/session.js          Token im localStorage
src/lib/format.js           Datums-/Zeit-Helfer
src/lib/teams.js            Team-Name -> Flagge (flagcdn) + Fallback
src/lib/stats.js            Statistiken/Level/Abzeichen aus Server-Punkten
src/App.jsx                 Token-Gate (whoami)
src/Shell.jsx               5-Tab-Navigation + Master/Detail "Spiele"
src/components/             AuthGate, UI-Primitive (Button/Card/TopBar/BottomNav/…)
src/views/                  Home, Spiele, Rangliste, Statistiken, Profil, Admin
```

## Hinweise

- Kein Live-Ticker, kein Polling — Ergebnisse kommen per Admin-Sync oder Override.
- Kein API-Key im Client außer dem Supabase-`anon`-Key (der nur RPCs ausführen darf).
- `supabase/schema.sql`, `src/lib/openfootball.js` und `src/data/seed-fixtures.json`
  sind vorab verifiziert und werden unverändert genutzt.
