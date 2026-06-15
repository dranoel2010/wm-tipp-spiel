import { useMemo, useState } from "react";
import { Check, Flame, LogOut, Settings, Share2, Sliders, Star, Target, Trophy } from "lucide-react";
import { Avatar, Card, IconButton, SettingsRow, TopBar } from "../components/ui.jsx";
import { deriveBadges, deriveStats } from "../lib/stats.js";

const TONE = {
  primary: "bg-primary-50 text-primary",
  danger: "bg-danger-50 text-danger",
  gold: "bg-gold/10 text-gold",
  green: "bg-green-50 text-green",
};
const ICON = { primary: Target, danger: Star, gold: Flame, green: Trophy };

export default function ProfilView({ profile, data, onLogout, onOpenAdmin }) {
  const { tips, matches, leaderboard } = data;
  const s = useMemo(() => deriveStats(tips, matches), [tips, matches]);
  const badges = useMemo(() => deriveBadges(s), [s]);
  const members = leaderboard.length;
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(profile.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard nicht verfügbar */
    }
  }

  return (
    <div>
      <TopBar
        title="Profil"
        right={
          profile.is_admin ? (
            <IconButton onClick={onOpenAdmin} aria-label="Liga verwalten">
              <Settings size={18} />
            </IconButton>
          ) : null
        }
      />
      <div className="mx-auto max-w-md px-4">
        {/* Kopf: Avatar + Level */}
        <div className="flex flex-col items-center pt-2 text-center">
          <Avatar name={profile.name} size={80} />
          <h2 className="mt-3 text-xl font-extrabold text-ink">{profile.name}</h2>
          <span className="mt-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary">
            Level {s.level}
          </span>
          <div className="mt-3 w-full max-w-[15rem]">
            <div className="h-2 w-full overflow-hidden rounded-full bg-line-2">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.round(s.levelProgress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {s.total} / {s.levelCap} Punkte
            </p>
          </div>
        </div>

        {/* Abzeichen */}
        <h3 className="mb-2 mt-6 font-bold text-ink">Abzeichen</h3>
        <div className="grid grid-cols-4 gap-2">
          {badges.map((b) => {
            const Icon = ICON[b.tone];
            const tone = b.earned ? TONE[b.tone] : "bg-line-2 text-faint";
            return (
              <div
                key={b.key}
                className="flex flex-col items-center gap-1 rounded-xl border border-line bg-card p-2.5 text-center"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="text-[11px] font-bold leading-tight text-ink">{b.label}</span>
                <span className="text-[9px] leading-tight text-muted">
                  {b.earned ? "erreicht" : b.progress}
                </span>
              </div>
            );
          })}
        </div>

        {/* Liga-Card */}
        <h3 className="mb-2 mt-6 font-bold text-ink">Deine Liga</h3>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-ink">{profile.league_name}</p>
              <p className="text-xs text-muted">
                {members} {members === 1 ? "Mitglied" : "Mitglieder"}
              </p>
            </div>
            <span className="tnum rounded-lg bg-line-2 px-2.5 py-1 text-sm font-bold tracking-widest text-ink-2">
              {profile.join_code}
            </span>
          </div>
          <div className="mt-3 flex items-center">
            {leaderboard.slice(0, 6).map((p, i) => (
              <span key={i} className="-ml-2 first:ml-0">
                <Avatar name={p.name} size={30} ring />
              </span>
            ))}
            {members > 6 && (
              <span className="-ml-2 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-line-2 text-[10px] font-semibold text-muted ring-2 ring-white">
                +{members - 6}
              </span>
            )}
          </div>
        </Card>

        {/* Einstellungen */}
        <h3 className="mb-2 mt-6 font-bold text-ink">Einstellungen</h3>
        <Card className="divide-y divide-line overflow-hidden">
          <SettingsRow
            icon={copied ? <Check size={18} className="text-green" /> : <Share2 size={18} />}
            label={copied ? "Code kopiert" : "Liga-Code teilen"}
            onClick={copyCode}
          />
          {profile.is_admin && (
            <SettingsRow icon={<Sliders size={18} />} label="Liga verwalten" onClick={onOpenAdmin} />
          )}
          <SettingsRow icon={<LogOut size={18} />} label="Abmelden" onClick={onLogout} danger />
        </Card>

        <p className="mt-6 pb-2 text-center text-[11px] text-faint">
          Level &amp; Abzeichen werden aus deinen Punkten berechnet.
        </p>
      </div>
    </div>
  );
}
