# Claude Code Prompt — WM 2026 Tippspiel

> Diesen kompletten Text in Claude Code einfügen. Die drei mitgelieferten Dateien
> (`supabase/schema.sql`, `src/lib/openfootball.js`, `src/data/seed-fixtures.json`)
> liegen im Repo und sind **vorab verifiziert**. Sie sind die Quelle der Wahrheit.

## Ziel
Baue ein Multi-User WM-2026-Tippspiel als deploybare Web-App. Freunde treten per
Code bei, tippen Spiele vor Anpfiff, eine Rangliste wertet aus. Spielplan und
Ergebnisse kommen aus openfootball, mit manuellem Admin-Override als Fallback.

## NICHT verhandelbar (nicht neu erfinden, nicht „verbessern")
1. **Datenmodell und Sicherheit stecken in `supabase/schema.sql`. Diese Datei
   unverändert übernehmen.** Sie ist gegen echtes Postgres getestet (Scoring,
   Tippgeheimnis, Anpfiff-Sperre, Override-Schutz, Admin-Guard). Schreibe keine
   eigenen Tabellen, kein eigenes RLS, keine eigenen RPCs. Wenn etwas fehlt:
   erst fragen, nicht umbauen.
2. **Kein Direktzugriff auf Tabellen vom Client.** Jeder Lese- und Schreibzugriff
   läuft ausschließlich über die RPCs (`supabase.rpc(...)`). RLS verbietet alles
   andere. Der `tip`-Tabelle darf der Client nie direkt lesen oder schreiben.
3. **Identität = `player.token` (UUID).** Beim Beitreten/Anlegen liefert die RPC
   einen Token, der in `localStorage` landet (`wm_token`). Es gibt KEIN
   Supabase-Auth, KEIN E-Mail-Login. Session-Restore über `whoami(token)`.
4. **Anpfiff-Sperre und Tippgeheimnis sind serverseitig** (in den RPCs). Die UI
   spiegelt das nur, verlässt sich aber nicht darauf.
5. **`openfootball`-Parsing steckt in `src/lib/openfootball.js`. Unverändert
   nutzen.** Insbesondere die ID-Logik (Gruppenphase hat kein `num` → ID aus
   Datum+Teams; Knockout hat `num` → `m{num}`) und die Zeitzonen-Behandlung
   (`"13:00 UTC-6"`). Nicht neu schreiben, sonst brechen IDs.
6. **Scoring ist Kicktipp-Standard 4/3/2** und liegt als `wm_score()` im Schema:
   4 exakt, 3 richtige Tordifferenz (Remis-Tipp auf Remis fällt hierunter),
   2 richtige Tendenz, 0 sonst. Nicht im Client nachrechnen für die Wertung;
   der Client zeigt nur die vom Server gelieferten `points`.

## Tech-Stack (Pflicht)
- React 18 + Vite + Tailwind v4 (`@tailwindcss/vite`, `@import "tailwindcss";`)
- `@supabase/supabase-js`
- Deploy-Ziel Vercel, Supabase-Region EU (Frankfurt)
- pnpm
- Keine weiteren Libs außer `lucide-react` für Icons. Keine UI-Kit-Frameworks.

## Verifizierte Datenquelle (Fakten, nicht erneut recherchieren)
- Datei: `https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json`
  (Fallback `raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`)
- 104 Spiele, `{ matches: [...] }`, Felder: `round, group, date, time, team1,
  team2, score.ft:[h,a]` (nur bei gespielten Spielen), `num` nur im Knockout.
- `src/data/seed-fixtures.json` ist ein bereits geparster Snapshot (Offline-Start).
  Beim ersten Admin-Sync wird live nachgeladen.

## RPC-Vertrag (genau diese Namen und Parameter, via `supabase.rpc`)
- `create_league(p_league_name, p_admin_name)` → `{ token, join_code, league_id }`
- `join_league(p_code, p_name)` → `{ token, league_id, name }`
- `whoami(p_token)` → `{ player_id, name, league_id, league_name, join_code, is_admin }`
- `get_matches(p_token)` → Zeilen `{ id, stage, grp, home, away, kickoff,
  home_score, away_score, finished, locked }`
- `get_my_tips(p_token)` → Zeilen `{ match_id, home_tip, away_tip, points }`
- `submit_tip(p_token, p_match, p_home, p_away)` → void (wirft bei Anpfiff vorbei)
- `get_match_tips(p_token, p_match)` → Zeilen `{ name, home_tip, away_tip, points }`
  (wirft vor Anpfiff, außer Admin)
- `get_leaderboard(p_token)` → Zeilen `{ name, total, played, exact_hits, is_me }`
- `admin_set_result(p_token, p_match, p_home, p_away)` → void
- `admin_clear_result(p_token, p_match)` → void
- `admin_upsert_matches(p_token, p_matches)` → int  (p_matches = Array aus dem Parser)

RPC-Fehler kommen als `error.message` zurück (z. B. „Anpfiff vorbei, Tipp
gesperrt"). Diese Texte direkt als Inline-Fehler anzeigen.

## App-Aufbau
Single-Page mit Token-Gate. Ohne Token: Start-Screen (Liga beitreten per Code +
Name, oder Liga anlegen). Mit Token: drei Tabs.
1. **Tippen** — Spiele nach Datum gruppiert. Pro Spiel zwei Zahlenfelder + Speichern.
   Gesperrte Spiele (`locked`) sind read-only und zeigen Ergebnis + eigene Punkte.
   Nach Anpfiff: Button „Tipps ansehen" ruft `get_match_tips`.
2. **Rangliste** — sortiert nach `total`, eigene Zeile (`is_me`) hervorgehoben,
   Spalten Punkte / getippt / exakte Treffer.
3. **Admin** (nur wenn `is_admin`) — Button „Spielplan & Ergebnisse synchronisieren"
   (`fetchFixtures()` aus `openfootball.js` → `admin_upsert_matches`), plus pro Spiel
   manuelles Ergebnis setzen/löschen (`admin_set_result` / `admin_clear_result`).
   Join-Code prominent zum Teilen.

## Design (knapp, kein Default-Look)
Dunkle Anzeigetafel-Ästhetik, zurückhaltend. Tiefes Grün-Schwarz als Grund,
Bernstein nur für Live/Punkte, Teal für „getippt/gesperrt". Display-Schrift
kräftig und schmal (z. B. Archivo 800), Body Hanken Grotesk, Ergebnisse in
Monospace (Scoreboard-Optik). Keine warmen Cream/Serif-Defaults, kein Acid-Green.
Mobil zuerst, sichtbarer Fokus, `prefers-reduced-motion` respektieren.

## Build-Reihenfolge mit Checkpoints
1. Vite + Tailwind v4 Scaffold, `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`),
   `src/lib/supabase.js`. **Checkpoint:** App startet, leerer Screen.
2. Token-Gate + `create_league`/`join_league`/`whoami`, Token in localStorage.
   **Checkpoint:** Liga anlegen, Reload hält Session.
3. Tippen-Tab mit `get_matches` (Seed bis erster Sync) + `get_my_tips` + `submit_tip`,
   Sperre/locked sauber. **Checkpoint:** Tipp speichern, Reload zeigt ihn.
4. Rangliste. **Checkpoint:** nach gesetztem Ergebnis stimmen Punkte.
5. Admin-Tab: Sync + manuelles Ergebnis. **Checkpoint:** Sync zieht Ergebnisse,
   manuelles Override bleibt nach erneutem Sync erhalten.
6. Responsiveness + Fehlerzustände + leere Zustände.

## Was du NICHT tun sollst
- Keinen API-Key im Client ausliefern, keinen Proxy bauen (openfootball braucht keinen).
- Keine Minuten-Live-Anzeige, kein Polling-Ticker. Ergebnisse kommen per Sync/Override.
- Kein Supabase-Auth, keine E-Mail-Flows, keine zusätzlichen Tabellen.
- Den `anon`-Key nicht für Direktzugriff auf Tabellen verwenden.

## Manuelle Schritte (kannst du nicht selbst, in README dokumentieren)
1. Supabase-Projekt (EU) anlegen, `supabase/schema.sql` im SQL-Editor ausführen.
2. Project URL + anon-Key in `.env` eintragen.
3. `pnpm install && pnpm dev` lokal testen.
4. Vercel-Deploy, Env-Vars dort setzen.
5. In der App „Liga anlegen" → du bist Admin → einmal „Synchronisieren" → Code teilen.

Lege am Ende eine `README.md` mit genau diesen Schritten an.
