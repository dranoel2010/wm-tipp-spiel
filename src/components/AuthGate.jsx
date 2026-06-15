import { useState } from "react";
import { ArrowRight, LogIn, Plus } from "lucide-react";
import { rpcRow } from "../lib/supabase.js";
import { Banner, Card, Spinner } from "./ui.jsx";

export default function AuthGate({ onAuthed, configError }) {
  const [mode, setMode] = useState("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      let row;
      if (mode === "join") {
        if (!code.trim() || !name.trim()) throw new Error("Bitte Code und Namen angeben.");
        row = await rpcRow("join_league", { p_code: code.trim(), p_name: name.trim() });
      } else {
        if (!name.trim()) throw new Error("Bitte deinen Namen angeben.");
        row = await rpcRow("create_league", {
          p_league_name: leagueName.trim(),
          p_admin_name: name.trim(),
        });
      }
      if (!row?.token) throw new Error("Unerwartete Antwort vom Server.");
      onAuthed(row.token);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-card card-shadow">
          <Ball />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink">
          Das WM Tippspiel
          <br />
          für eure <span className="text-primary">Freundesrunde</span>
        </h1>
        <p className="mt-3 text-sm text-muted">Einfach tippen. Punkte sammeln. Freunde schlagen.</p>
      </div>

      {configError && (
        <Banner kind="error" className="mb-5">
          Supabase ist noch nicht konfiguriert. Trage <code>VITE_SUPABASE_URL</code> und{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> ein (siehe README).
        </Banner>
      )}

      <Card className="p-5">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-line-2 p-1">
          <button
            type="button"
            onClick={() => { setMode("join"); setErr(""); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === "join" ? "bg-card text-primary card-shadow-sm" : "text-muted hover:text-ink-2"
            }`}
          >
            <LogIn size={15} aria-hidden="true" /> Beitreten
          </button>
          <button
            type="button"
            onClick={() => { setMode("create"); setErr(""); }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === "create" ? "bg-card text-primary card-shadow-sm" : "text-muted hover:text-ink-2"
            }`}
          >
            <Plus size={15} aria-hidden="true" /> Liga anlegen
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "join" && (
            <Field label="Liga-Code">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="z. B. K7M2QX"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={6}
                className="w-full rounded-xl border border-line bg-line-2 px-3.5 py-3 text-center text-xl font-bold uppercase tracking-[0.3em] text-ink tnum placeholder:font-normal placeholder:tracking-normal placeholder:text-faint focus:border-primary focus:bg-card"
              />
            </Field>
          )}

          {mode === "create" && (
            <Field label="Liga-Name" hint="optional">
              <input
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="Freundesrunde WM"
                autoComplete="off"
                className="w-full rounded-xl border border-line bg-line-2 px-3.5 py-3 text-ink placeholder:text-faint focus:border-primary focus:bg-card"
              />
            </Field>
          )}

          <Field label="Dein Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max"
              autoComplete="off"
              maxLength={40}
              className="w-full rounded-xl border border-line bg-line-2 px-3.5 py-3 text-ink placeholder:text-faint focus:border-primary focus:bg-card"
            />
          </Field>

          {err && <Banner kind="error">{err}</Banner>}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-bold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Spinner />
            ) : (
              <>
                {mode === "join" ? "Beitreten" : "Liga anlegen"}
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </Card>

      <p className="mt-6 text-center text-xs text-faint">
        Kein Login, keine E-Mail. Deine Identität bleibt als Token in diesem Browser.
      </p>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Ball() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#fff" stroke="#105bfd" strokeWidth="1.6" />
      <path
        d="M12 6.2l3.2 2.3-1.2 3.8h-4L8.8 8.5 12 6.2z"
        fill="#105bfd"
      />
      <path
        d="M12 6.2V3.2M15.2 8.5l2.8-1M13.8 12.3l1.8 2.4M10 12.3l-1.8 2.4M8.8 8.5l-2.8-1"
        stroke="#105bfd"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
