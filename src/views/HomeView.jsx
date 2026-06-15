import { useMemo } from "react";
import { Bell, Lock, Menu } from "lucide-react";
import { Avatar, Banner, Button, Card, Flag, IconButton, Spinner } from "../components/ui.jsx";
import { formatDayLabel, formatTime, kickoffSortValue } from "../lib/format.js";

export default function HomeView({ profile, data, onTip, onTab }) {
  const { matches, tips, leaderboard, loading, error, source } = data;

  const tipsMap = useMemo(
    () => Object.fromEntries(tips.map((t) => [t.match_id, t])),
    [tips]
  );
  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => !m.locked)
        .sort((a, b) => kickoffSortValue(a.kickoff) - kickoffSortValue(b.kickoff)),
    [matches]
  );

  const next = upcoming[0];
  const rest = upcoming.slice(1, 5);
  const members = leaderboard.length;
  const firstName = (profile.name || "").split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-md px-4">
      <div className="flex items-center justify-between py-3">
        <IconButton onClick={() => onTab("profil")} aria-label="Profil">
          <Menu size={22} />
        </IconButton>
        <IconButton aria-label="Benachrichtigungen">
          <Bell size={20} />
        </IconButton>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-ink">Hallo, {firstName} 👋</h1>
      <p className="text-sm text-muted">Willkommen zurück!</p>

      {error && <Banner kind="error" className="mt-4">{error}</Banner>}
      {source === "seed" && (
        <Banner kind="info" className="mt-4">
          Vorläufiger Spielplan. Tipps lassen sich speichern, sobald der Admin einmal synchronisiert hat.
        </Banner>
      )}

      {/* Liga-Card */}
      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink">{profile.league_name}</span>
          <Lock size={16} className="text-faint" aria-hidden="true" />
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {members} {members === 1 ? "Mitglied" : "Mitglieder"}
        </p>
        <div className="mt-3 flex items-center">
          {leaderboard.slice(0, 5).map((p, i) => (
            <span key={i} className="-ml-2 first:ml-0">
              <Avatar name={p.name} size={32} ring />
            </span>
          ))}
          {members > 5 && (
            <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-line-2 text-xs font-semibold text-muted ring-2 ring-white">
              +{members - 5}
            </span>
          )}
        </div>
      </Card>

      {/* Nächstes Spiel */}
      <section className="mt-6">
        <h2 className="mb-2 font-bold text-ink">Nächstes Spiel</h2>
        {loading && !next ? (
          <Card className="flex items-center justify-center gap-2 p-8 text-muted">
            <Spinner className="text-primary" /> lädt…
          </Card>
        ) : next ? (
          <Card className="p-4">
            <p className="text-center text-xs text-muted">
              {formatDayLabel(next.kickoff)} · {formatTime(next.kickoff)} Uhr
            </p>
            <div className="mt-3 flex items-center justify-around gap-2">
              <TeamCol team={next.home} />
              <span className="text-sm font-bold text-faint">VS</span>
              <TeamCol team={next.away} />
            </div>
            <Button className="mt-4 w-full" onClick={() => onTip(next.id)}>
              {tipsMap[next.id] ? "Tipp ändern" : "Tipp abgeben"}
            </Button>
          </Card>
        ) : (
          <Card className="p-6 text-center text-sm text-muted">
            Aktuell kein offenes Spiel zum Tippen.
          </Card>
        )}
      </section>

      {/* Kommende Spiele */}
      {rest.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-bold text-ink">Kommende Spiele</h2>
          <Card className="divide-y divide-line">
            {rest.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onTip(m.id)}
                className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-line-2"
              >
                <Flag team={m.home} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {m.home}
                </span>
                <span className="shrink-0 text-center text-[11px] leading-tight text-muted">
                  {formatDayLabel(m.kickoff)}
                  <br />
                  {formatTime(m.kickoff)}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink">
                  {m.away}
                </span>
                <Flag team={m.away} size={28} />
              </button>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function TeamCol({ team }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <Flag team={team} size={56} />
      <span className="text-center text-sm font-bold text-ink">{team}</span>
    </div>
  );
}
