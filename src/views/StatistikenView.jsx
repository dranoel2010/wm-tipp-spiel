import { useMemo, useState } from "react";
import { Flame, Info, Star } from "lucide-react";
import { Banner, Card, IconButton, Segmented, Spinner, TopBar } from "../components/ui.jsx";
import { deriveStats } from "../lib/stats.js";

export default function StatistikenView({ data }) {
  const { tips, matches, loading, error } = data;
  const [view, setView] = useState("uebersicht");
  const s = useMemo(() => deriveStats(tips, matches), [tips, matches]);

  return (
    <div>
      <TopBar
        title="Statistiken"
        right={
          <IconButton aria-label="Info">
            <Info size={18} />
          </IconButton>
        }
      />
      <div className="mx-auto max-w-md px-4">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "uebersicht", label: "Übersicht" },
            { value: "verlauf", label: "Verlauf" },
            { value: "analyse", label: "Analyse" },
          ]}
        />

        {error && <Banner kind="error" className="mt-4">{error}</Banner>}

        {loading && tips.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Spinner className="text-primary" /> lädt…
          </div>
        ) : view !== "uebersicht" ? (
          <Banner kind="info" className="mt-4">
            Diese Ansicht folgt – die Übersicht zeigt deine Kennzahlen.
          </Banner>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Punktverlauf */}
            <Card className="p-4">
              <p className="text-sm font-bold text-ink">Punktverlauf</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="tnum text-3xl font-extrabold text-ink">{s.total}</span>
                <span className="text-sm text-muted">Punkte</span>
              </div>
              {s.weekPoints > 0 && (
                <p className="text-sm font-semibold text-green">+{s.weekPoints} diese Woche</p>
              )}
              <div className="mt-3">
                <LineChart series={s.series} />
              </div>
            </Card>

            {/* Quote + exakte */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="flex flex-col items-center p-4">
                <p className="self-start text-sm font-bold text-ink">Trefferquote</p>
                <Ring pct={s.accuracy} />
                <p className="text-xs text-muted">von {s.played} Spielen</p>
              </Card>
              <Card className="flex flex-col p-4">
                <p className="text-sm font-bold text-ink">Richtige Ergebnisse</p>
                <div className="flex flex-1 flex-col items-center justify-center">
                  <span className="tnum text-4xl font-extrabold text-ink">{s.exact}</span>
                  <span className="text-xs text-muted">von {s.played}</span>
                </div>
              </Card>
            </div>

            {/* Serien */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-50 text-danger">
                  <Flame size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Aktuelle Serie</p>
                  <p className="text-xs text-muted">{s.currentStreak} richtige Tipps</p>
                </div>
              </Card>
              <Card className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary">
                  <Star size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">Beste Serie</p>
                  <p className="text-xs text-muted">{s.bestStreak} richtige Tipps</p>
                </div>
              </Card>
            </div>

            {s.played === 0 && (
              <p className="pt-2 text-center text-sm text-faint">
                Sobald Spiele gewertet sind, erscheinen hier deine Statistiken.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LineChart({ series }) {
  const W = 320;
  const H = 120;
  const pad = 10;
  if (!series || series.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-lg bg-line-2 text-sm text-faint">
        Noch zu wenig Daten für einen Verlauf.
      </div>
    );
  }
  const max = Math.max(...series.map((s) => s.value), 1);
  const n = series.length;
  const xAt = (i) => pad + (i * (W - 2 * pad)) / (n - 1);
  const yAt = (v) => H - pad - (v / max) * (H - 2 * pad);
  const line = series.map((s, i) => `${xAt(i)},${yAt(s.value)}`).join(" ");
  const area = `${xAt(0)},${H - pad} ${line} ${xAt(n - 1)},${H - pad}`;
  const last = series[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Punktverlauf, aktuell ${last.value} Punkte`}>
      <defs>
        <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#105bfd" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#105bfd" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#pv)" />
      <polyline points={line} fill="none" stroke="#105bfd" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xAt(n - 1)} cy={yAt(last.value)} r="4" fill="#105bfd" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function Ring({ pct }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="relative my-2 h-[88px] w-[88px]">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#eceef3" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#105bfd"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-ink">
        {pct}%
      </span>
    </div>
  );
}
