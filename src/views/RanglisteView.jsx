import { useMemo, useState } from "react";
import { Crown, Info } from "lucide-react";
import { Avatar, Banner, Card, IconButton, Segmented, Spinner, TopBar } from "../components/ui.jsx";

export default function RanglisteView({ data }) {
  const { leaderboard, matches, loading, error } = data;
  const [range, setRange] = useState("gesamt");

  const openCount = useMemo(() => matches.filter((m) => !m.locked).length, [matches]);
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div>
      <TopBar
        title="Rangliste"
        right={
          <IconButton aria-label="Info">
            <Info size={18} />
          </IconButton>
        }
      />
      <div className="mx-auto max-w-md px-4">
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: "gesamt", label: "Gesamt" },
            { value: "woche", label: "Woche" },
            { value: "monat", label: "Monat" },
          ]}
        />

        {error && <Banner kind="error" className="mt-4">{error}</Banner>}

        {range !== "gesamt" && (
          <Banner kind="info" className="mt-4">
            Zeitraum-Wertungen folgen – hier siehst du aktuell die Gesamtwertung.
          </Banner>
        )}

        {loading && leaderboard.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Spinner className="text-primary" /> Rangliste wird geladen…
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="mt-8 grid grid-cols-3 items-end gap-2">
                <PodiumSpot entry={top3[1]} place={2} />
                <PodiumSpot entry={top3[0]} place={1} />
                <PodiumSpot entry={top3[2]} place={3} />
              </div>
            )}

            {/* Plätze 4+ */}
            {rest.length > 0 && (
              <Card className="mt-6 divide-y divide-line">
                {rest.map((r, i) => (
                  <div
                    key={`${r.name}-${i}`}
                    className={`flex items-center gap-3 px-4 py-3 ${r.is_me ? "bg-primary-50" : ""}`}
                  >
                    <span className="tnum w-5 text-center text-sm font-bold text-muted">{i + 4}</span>
                    <Avatar name={r.name} size={36} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                      {r.name}
                      {r.is_me && <span className="ml-1.5 text-xs font-normal text-primary">du</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tnum font-bold text-ink">{r.total}</span>{" "}
                      <span className="text-xs text-muted">Punkte</span>
                    </span>
                  </div>
                ))}
              </Card>
            )}

            {/* Footer-Pill */}
            <div className="mt-6 flex justify-center pb-2">
              <span className="rounded-full bg-primary-50 px-4 py-2 text-xs font-semibold text-primary">
                {openCount > 0
                  ? `Noch ${openCount} ${openCount === 1 ? "Spiel" : "Spiele"} in dieser Runde`
                  : "Alle Spiele gewertet"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PodiumSpot({ entry, place }) {
  if (!entry) return <div />;
  const big = place === 1;
  const ringColor =
    place === 1 ? "ring-gold" : place === 2 ? "ring-rank2" : "ring-rank3";
  const numColor =
    place === 1 ? "text-gold" : place === 2 ? "text-rank2" : "text-rank3";
  return (
    <div className={`flex flex-col items-center ${big ? "-mt-4" : ""}`}>
      {big ? (
        <Crown size={22} className="mb-1 text-gold" aria-hidden="true" />
      ) : (
        <span className={`mb-1 text-lg font-extrabold ${numColor}`}>{place}</span>
      )}
      <div className={`rounded-full ring-2 ${ringColor} ${entry.is_me ? "ring-offset-2 ring-offset-bg" : ""}`}>
        <Avatar name={entry.name} size={big ? 72 : 56} />
      </div>
      <span className="mt-2 max-w-full truncate text-sm font-bold text-ink">{entry.name}</span>
      <span className={`tnum font-extrabold ${big ? "text-xl" : "text-lg"} text-ink`}>
        {entry.total}
      </span>
      <span className="text-[11px] text-muted">Punkte</span>
    </div>
  );
}
