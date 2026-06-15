import { useState } from "react";
import { BarChart3, CalendarDays, ChevronRight, Home, Loader2, Trophy, User } from "lucide-react";
import { flagUrl, teamShort } from "../lib/teams.js";

export function Button({ variant = "primary", className = "", children, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm px-4 py-3 " +
    "transition-colors disabled:cursor-not-allowed disabled:opacity-50 select-none";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-600",
    subtle: "border border-line bg-card text-ink hover:bg-line-2",
    danger: "border border-danger/30 bg-danger-50 text-danger hover:bg-danger/10",
    ghost: "text-primary hover:bg-primary-50",
  };
  return (
    <button className={`${base} ${variants[variant] ?? variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`rounded-2xl bg-card card-shadow ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Banner({ kind = "info", className = "", children }) {
  const styles = {
    error: "border-danger/30 bg-danger-50 text-danger",
    info: "border-primary-100 bg-primary-50 text-primary",
    success: "border-green/20 bg-green-50 text-green",
  };
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-xl border px-3.5 py-2.5 text-sm ${styles[kind] ?? styles.info} ${className}`}
    >
      {children}
    </div>
  );
}

export function Spinner({ size = 18, className = "" }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function TopBar({ left, title, right }) {
  return (
    <div className="sticky top-0 z-20 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <div className="flex min-w-[2.5rem] justify-start">{left}</div>
        {title && <h1 className="font-bold text-ink">{title}</h1>}
        <div className="flex min-w-[2.5rem] justify-end">{right}</div>
      </div>
    </div>
  );
}

export function IconButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-line-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl bg-line-2 p-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              on ? "bg-card text-primary card-shadow-sm" : "text-muted hover:text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "spiele", label: "Spiele", icon: CalendarDays },
  { id: "rangliste", label: "Rangliste", icon: Trophy },
  { id: "statistiken", label: "Statistiken", icon: BarChart3 },
  { id: "profil", label: "Profil", icon: User },
];

export function BottomNav({ active, onChange }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {NAV.map((n) => {
          const Icon = n.icon;
          const on = active === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onChange(n.id)}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
                on ? "text-primary" : "text-faint hover:text-muted"
              }`}
            >
              <Icon size={22} aria-hidden="true" strokeWidth={on ? 2.4 : 2} />
              {n.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Runde Flagge aus statischem Bild, Fallback = Kürzel-Kreis.
export function Flag({ team, size = 44 }) {
  const url = flagUrl(team);
  const [err, setErr] = useState(false);
  if (url && !err) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setErr(true)}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover ring-1 ring-line"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-50 text-[10px] font-bold text-primary ring-1 ring-line"
      title={team}
    >
      {teamShort(team)}
    </span>
  );
}

const AV_BG = ["#E8EDFF", "#E6F7EE", "#FDECEC", "#FFF3E0", "#E7F6FF", "#F1EAFF", "#FDEBF4"];
const AV_FG = ["#2348C8", "#0E7A45", "#C0353A", "#B0701A", "#1E6FA8", "#6B3FC0", "#B23A7E"];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, size = 40, ring = false }) {
  const safe = name || "?";
  const i = hash(safe) % AV_BG.length;
  const initials = safe
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      style={{ width: size, height: size, background: AV_BG[i], color: AV_FG[i], fontSize: size * 0.38 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
        ring ? "ring-2 ring-white" : ""
      }`}
    >
      {initials || "?"}
    </span>
  );
}

export function SettingsRow({ icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-line-2"
    >
      <span className={danger ? "text-danger" : "text-ink-2"}>{icon}</span>
      <span className={`flex-1 font-semibold ${danger ? "text-danger" : "text-ink"}`}>{label}</span>
      <ChevronRight size={18} className="text-faint" aria-hidden="true" />
    </button>
  );
}
