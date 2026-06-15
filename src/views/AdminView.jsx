import { useMemo, useState } from "react";
import { Check, ChevronLeft, Copy, RefreshCw, Search, Trash2 } from "lucide-react";
import { rpcValue } from "../lib/supabase.js";
import { fetchFixtures } from "../lib/openfootball.js";
import { formatTime } from "../lib/format.js";
import { Banner, Button, Card, Flag, IconButton, Spinner, TopBar } from "../components/ui.jsx";

export default function AdminView({ token, profile, data, onBack }) {
  const { matches, reload } = data;
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("");

  async function sync() {
    setSyncing(true);
    setSyncMsg("");
    setError("");
    try {
      const fixtures = await fetchFixtures();
      const n = await rpcValue("admin_upsert_matches", { p_token: token, p_matches: fixtures });
      setSyncMsg(`${n} Spiele synchronisiert.`);
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(profile.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) =>
      [m.home, m.away, m.grp, m.stage, m.id]
        .filter(Boolean)
        .some((str) => String(str).toLowerCase().includes(q))
    );
  }, [matches, filter]);

  return (
    <div>
      <TopBar
        left={
          <IconButton onClick={onBack} aria-label="Zurück">
            <ChevronLeft size={22} />
          </IconButton>
        }
        title="Liga verwalten"
      />
      <div className="mx-auto max-w-md space-y-5 px-4">
        {/* Code teilen */}
        <Card className="p-4">
          <p className="text-sm font-bold text-ink">Liga-Code teilen</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="tnum text-3xl font-extrabold tracking-[0.2em] text-primary">
              {profile.join_code}
            </span>
            <Button variant="subtle" onClick={copyCode} className="px-3 py-2">
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Kopiert" : "Kopieren"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">Freunde geben diesen Code beim Beitreten ein.</p>
        </Card>

        {/* Sync */}
        <Card className="p-4">
          <p className="text-sm font-bold text-ink">Spielplan &amp; Ergebnisse</p>
          <p className="mt-1 text-xs text-muted">
            Lädt aktuelle Daten aus openfootball. Manuell gesetzte Ergebnisse bleiben erhalten.
          </p>
          <Button onClick={sync} disabled={syncing} className="mt-3 w-full">
            {syncing ? <Spinner size={16} className="text-white" /> : <RefreshCw size={16} />}
            {syncing ? "Synchronisiere…" : "Jetzt synchronisieren"}
          </Button>
          {syncMsg && <Banner kind="success" className="mt-3">{syncMsg}</Banner>}
        </Card>

        {error && <Banner kind="error">{error}</Banner>}

        {/* Ergebnisse manuell */}
        <div>
          <p className="mb-2 text-sm font-bold text-ink">Ergebnis manuell setzen</p>
          <div className="relative mb-3">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Team, Gruppe oder Phase suchen…"
              className="w-full rounded-xl border border-line bg-card py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-primary"
            />
          </div>

          {matches.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted">
              Noch keine Spiele in der Datenbank. Erst synchronisieren.
            </Card>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-faint">Kein Spiel passt zur Suche.</p>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((m) => (
                <AdminMatchRow
                  key={`${m.id}:${m.home_score}:${m.away_score}:${m.finished}`}
                  match={m}
                  token={token}
                  onChanged={reload}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminMatchRow({ match, token, onChanged }) {
  const [home, setHome] = useState(match.home_score != null ? String(match.home_score) : "");
  const [away, setAway] = useState(match.away_score != null ? String(match.away_score) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function clean(v) {
    return String(v).replace(/[^\d]/g, "").slice(0, 2);
  }

  async function setResult() {
    setErr("");
    if (home === "" || away === "") {
      setErr("Bitte beide Werte eintragen.");
      return;
    }
    setBusy(true);
    try {
      await rpcValue("admin_set_result", {
        p_token: token,
        p_match: match.id,
        p_home: Number(home),
        p_away: Number(away),
      });
      onChanged?.();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function clearResult() {
    setErr("");
    setBusy(true);
    try {
      await rpcValue("admin_clear_result", { p_token: token, p_match: match.id });
      onChanged?.();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-muted">
          {match.grp ? match.grp.replace("Group", "Gruppe") : match.stage} · {formatTime(match.kickoff)}
        </span>
        {match.finished && (
          <span className="rounded-md bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            fixiert
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Flag team={match.home} size={24} />
        <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink" title={match.home}>
          {match.home}
        </span>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Tore ${match.home}`}
          value={home}
          onChange={(e) => setHome(clean(e.target.value))}
          placeholder="–"
          className="tnum h-10 w-10 shrink-0 rounded-lg border border-line bg-line-2 text-center font-bold text-ink placeholder:text-faint focus:border-primary focus:bg-card"
        />
        <span className="font-bold text-faint">:</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Tore ${match.away}`}
          value={away}
          onChange={(e) => setAway(clean(e.target.value))}
          placeholder="–"
          className="tnum h-10 w-10 shrink-0 rounded-lg border border-line bg-line-2 text-center font-bold text-ink placeholder:text-faint focus:border-primary focus:bg-card"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={match.away}>
          {match.away}
        </span>
        <Flag team={match.away} size={24} />
      </div>
      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={clearResult}
          disabled={busy || (match.home_score == null && match.away_score == null)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-50 px-2.5 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={14} aria-hidden="true" /> Löschen
        </button>
        <button
          type="button"
          onClick={setResult}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Spinner size={14} className="text-white" /> : null} Setzen
        </button>
      </div>
      {err && <Banner kind="error" className="mt-2.5">{err}</Banner>}
    </Card>
  );
}
