import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronDown, Eye, Lock } from "lucide-react";
import { rpcRows, rpcValue } from "../lib/supabase.js";
import {
  dateKey,
  formatDateHeading,
  formatDayLabel,
  formatTime,
  kickoffSortValue,
} from "../lib/format.js";
import { Avatar, Banner, Button, Card, Flag, IconButton, Spinner, TopBar } from "../components/ui.jsx";
import { teamShort } from "../lib/teams.js";

const STAGE_DE = {
  "Round of 32": "Sechzehntelfinale",
  "Round of 16": "Achtelfinale",
  "Quarter-final": "Viertelfinale",
  "Semi-final": "Halbfinale",
  "Match for third place": "Spiel um Platz 3",
  Final: "Finale",
};

function phaseLabel(m) {
  if (m.grp) return `Gruppenphase · ${m.grp.replace("Group", "Gruppe")}`;
  return STAGE_DE[m.stage] || m.stage || "K.-o.-Runde";
}

export default function SpieleView({ token, data, selectedId, onSelect }) {
  const { matches, tips, loading, error, source, reloadTips } = data;
  const tipsMap = useMemo(() => Object.fromEntries(tips.map((t) => [t.match_id, t])), [tips]);

  const selected = useMemo(
    () => matches.find((m) => m.id === selectedId) || null,
    [matches, selectedId]
  );

  const groups = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) =>
        kickoffSortValue(a.kickoff) - kickoffSortValue(b.kickoff) ||
        String(a.id).localeCompare(String(b.id))
    );
    const out = [];
    let cur = null;
    for (const m of sorted) {
      const k = dateKey(m.kickoff);
      if (!cur || cur.key !== k) {
        cur = { key: k, heading: formatDateHeading(m.kickoff), items: [] };
        out.push(cur);
      }
      cur.items.push(m);
    }
    return out;
  }, [matches]);

  if (selected) {
    return (
      <SpieltipDetail
        match={selected}
        myTip={tipsMap[selected.id]}
        token={token}
        editable={source === "server" && !selected.locked}
        onBack={() => onSelect(null)}
        onSaved={reloadTips}
      />
    );
  }

  return (
    <div>
      <TopBar title="Spiele" />
      <div className="mx-auto max-w-md px-4 pb-2">
        {error && <Banner kind="error" className="mb-4">{error}</Banner>}
        {source === "seed" && (
          <Banner kind="info" className="mb-4">
            Vorläufiger Spielplan. Tipps lassen sich speichern, sobald der Admin synchronisiert hat.
          </Banner>
        )}

        {loading && matches.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Spinner className="text-primary" /> Spiele werden geladen…
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="mb-2 px-1 text-sm font-bold text-muted">{g.heading}</h2>
                <Card className="divide-y divide-line">
                  {g.items.map((m) => (
                    <MatchListRow
                      key={m.id}
                      match={m}
                      myTip={tipsMap[m.id]}
                      onClick={() => onSelect(m.id)}
                    />
                  ))}
                </Card>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchListRow({ match, myTip, onClick }) {
  const hasResult = match.home_score != null && match.away_score != null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-line-2"
    >
      <Flag team={match.home} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{match.home}</span>
      <div className="flex w-16 shrink-0 flex-col items-center">
        {hasResult ? (
          <span className="tnum text-sm font-bold text-ink">
            {match.home_score}:{match.away_score}
          </span>
        ) : (
          <span className="text-[11px] text-muted">{formatTime(match.kickoff)}</span>
        )}
        <StatusChip locked={match.locked} hasTip={Boolean(myTip)} />
      </div>
      <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink">
        {match.away}
      </span>
      <Flag team={match.away} size={28} />
    </button>
  );
}

function StatusChip({ locked, hasTip }) {
  if (locked) {
    return (
      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-faint">
        <Lock size={9} aria-hidden="true" /> gesperrt
      </span>
    );
  }
  if (hasTip) {
    return <span className="mt-0.5 text-[10px] font-semibold text-primary">getippt</span>;
  }
  return <span className="mt-0.5 text-[10px] font-semibold text-faint">offen</span>;
}

function tendencyOf(h, a) {
  if (h === "" || a === "") return null;
  const hi = Number(h);
  const ai = Number(a);
  if (hi > ai) return "1";
  if (hi === ai) return "X";
  return "2";
}

function SpieltipDetail({ match, myTip, token, editable, onBack, onSaved }) {
  const hasResult = match.home_score != null && match.away_score != null;
  const [home, setHome] = useState(myTip ? String(myTip.home_tip) : "");
  const [away, setAway] = useState(myTip ? String(myTip.away_tip) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const [open, setOpen] = useState(false);
  const [others, setOthers] = useState(null);
  const [othersBusy, setOthersBusy] = useState(false);
  const [othersErr, setOthersErr] = useState("");

  const tendency = tendencyOf(home, away);

  function pick(t) {
    if (t === "1") {
      setHome("1");
      setAway("0");
    } else if (t === "X") {
      setHome("1");
      setAway("1");
    } else {
      setHome("0");
      setAway("1");
    }
    setDone(false);
  }

  async function save() {
    setErr("");
    if (home === "" || away === "") {
      setErr("Bitte ein exaktes Ergebnis wählen.");
      return;
    }
    setSaving(true);
    try {
      await rpcValue("submit_tip", {
        p_token: token,
        p_match: match.id,
        p_home: Number(home),
        p_away: Number(away),
      });
      setDone(true);
      onSaved?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleOthers() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (others == null && !othersBusy) {
      setOthersBusy(true);
      setOthersErr("");
      try {
        setOthers(await rpcRows("get_match_tips", { p_token: token, p_match: match.id }));
      } catch (e) {
        setOthersErr(e.message);
      } finally {
        setOthersBusy(false);
      }
    }
  }

  return (
    <div>
      <TopBar
        left={
          <IconButton onClick={onBack} aria-label="Zurück">
            <ChevronLeft size={22} />
          </IconButton>
        }
        title="Spieltip"
      />
      <div className="mx-auto max-w-md px-4">
        {/* Spielkopf */}
        <Card className="p-4">
          <p className="text-center text-xs font-semibold text-muted">{phaseLabel(match)}</p>
          <div className="mt-3 flex items-center justify-around gap-2">
            <div className="flex flex-1 flex-col items-center gap-2">
              <Flag team={match.home} size={56} />
              <span className="text-center text-sm font-bold text-ink">{match.home}</span>
            </div>
            {hasResult ? (
              <span className="tnum text-2xl font-extrabold text-ink">
                {match.home_score}:{match.away_score}
              </span>
            ) : (
              <span className="text-sm font-bold text-faint">VS</span>
            )}
            <div className="flex flex-1 flex-col items-center gap-2">
              <Flag team={match.away} size={56} />
              <span className="text-center text-sm font-bold text-ink">{match.away}</span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            {formatDayLabel(match.kickoff)} · {formatTime(match.kickoff)} Uhr
          </p>
        </Card>

        {editable ? (
          <>
            {/* 1X2 */}
            <h2 className="mb-2 mt-6 font-bold text-ink">Tipp 1X2</h2>
            <div className="grid grid-cols-3 gap-2">
              <TendencyBtn active={tendency === "1"} big="1" small={`Sieg ${teamShort(match.home)}`} onClick={() => pick("1")} />
              <TendencyBtn active={tendency === "X"} big="X" small="Unentschieden" onClick={() => pick("X")} />
              <TendencyBtn active={tendency === "2"} big="2" small={`Sieg ${teamShort(match.away)}`} onClick={() => pick("2")} />
            </div>

            {/* Exaktes Ergebnis */}
            <h2 className="mb-2 mt-6 font-bold text-ink">
              Exaktes Ergebnis <span className="text-sm font-normal text-muted">(genau)</span>
            </h2>
            <div className="flex items-center gap-3">
              <ScoreSelect value={home} onChange={(v) => { setHome(v); setDone(false); }} label={`Tore ${match.home}`} />
              <span className="text-xl font-bold text-faint">:</span>
              <ScoreSelect value={away} onChange={(v) => { setAway(v); setDone(false); }} label={`Tore ${match.away}`} />
            </div>

            {err && <Banner kind="error" className="mt-4">{err}</Banner>}

            <Button className="mt-6 w-full" onClick={save} disabled={saving}>
              {saving ? <Spinner size={16} className="text-white" /> : done ? <Check size={16} /> : null}
              {done ? "Gespeichert" : "Tipp speichern"}
            </Button>
            {myTip && !done && (
              <p className="mt-2 text-center text-xs text-muted">
                Gespeicherter Tipp: {myTip.home_tip}:{myTip.away_tip}
              </p>
            )}
          </>
        ) : (
          <>
            {/* gesperrt / nur Anzeige */}
            <Card className="mt-4 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Dein Tipp</span>
                {myTip ? (
                  <span className="flex items-center gap-2">
                    <span className="tnum font-bold text-ink">
                      {myTip.home_tip}:{myTip.away_tip}
                    </span>
                    {myTip.points != null && <PointsPill points={myTip.points} />}
                  </span>
                ) : (
                  <span className="text-sm text-faint">kein Tipp</span>
                )}
              </div>
            </Card>

            <Banner kind="info" className="mt-3">
              {match.locked
                ? "Anpfiff vorbei – dieser Tipp ist gesperrt."
                : "Tipps lassen sich erst nach dem Admin-Sync speichern."}
            </Banner>

            {match.locked && (
              <>
                <button
                  type="button"
                  onClick={toggleOthers}
                  aria-expanded={open}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 py-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-line-2"
                >
                  <Eye size={16} aria-hidden="true" /> Tipps der Mitspieler
                  <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {open && (
                  <Card className="mt-3 p-2">
                    {othersBusy && (
                      <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted">
                        <Spinner size={15} className="text-primary" /> lädt…
                      </div>
                    )}
                    {othersErr && <Banner kind="error">{othersErr}</Banner>}
                    {others && others.length === 0 && (
                      <p className="px-2 py-2 text-sm text-faint">Niemand hat dieses Spiel getippt.</p>
                    )}
                    {others &&
                      others.map((o, i) => (
                        <div key={`${o.name}-${i}`} className="flex items-center gap-3 px-2 py-2">
                          <Avatar name={o.name} size={32} />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                            {o.name}
                          </span>
                          <span className="tnum text-sm text-ink-2">
                            {o.home_tip}:{o.away_tip}
                          </span>
                          {o.points != null && <PointsPill points={o.points} />}
                        </div>
                      ))}
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TendencyBtn({ active, big, small, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3 transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-line bg-card text-ink hover:bg-line-2"
      }`}
    >
      <span className="text-lg font-extrabold leading-none">{big}</span>
      <span className={`text-[11px] ${active ? "text-white/80" : "text-muted"}`}>{small}</span>
    </button>
  );
}

function ScoreSelect({ value, onChange, label }) {
  return (
    <div className="relative flex-1">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-line bg-card px-4 py-3 text-center text-lg font-bold text-ink focus:border-primary"
      >
        <option value="" disabled>
          –
        </option>
        {Array.from({ length: 10 }, (_, i) => (
          <option key={i} value={String(i)}>
            {i}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  );
}

function PointsPill({ points }) {
  const tone =
    points === 4
      ? "bg-primary text-white"
      : points === 3
        ? "bg-green-50 text-green"
        : points === 2
          ? "bg-line-2 text-ink-2"
          : "bg-line-2 text-faint";
  return (
    <span className={`tnum rounded-md px-1.5 py-0.5 text-xs font-bold ${tone}`} title={`${points} Punkte`}>
      +{points}
    </span>
  );
}
