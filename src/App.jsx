import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { clearToken, getToken, setToken } from "./lib/session.js";
import { rpcRow, supabaseConfigured } from "./lib/supabase.js";
import AuthGate from "./components/AuthGate.jsx";
import Shell from "./Shell.jsx";
import { Banner, Button, Spinner } from "./components/ui.jsx";

export default function App() {
  const [token, setTok] = useState(() => getToken());
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));
  const [bootError, setBootError] = useState("");

  const loadProfile = useCallback(async (tk) => {
    setBooting(true);
    setBootError("");
    try {
      const p = await rpcRow("whoami", { p_token: tk });
      if (p) {
        setProfile(p);
      } else {
        clearToken();
        setTok(null);
        setProfile(null);
      }
    } catch (e) {
      setBootError(e.message);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadProfile(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAuthed(newToken) {
    setToken(newToken);
    setTok(newToken);
    loadProfile(newToken);
  }

  function handleLogout() {
    clearToken();
    setTok(null);
    setProfile(null);
    setBootError("");
  }

  if (booting) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Spinner size={28} className="text-primary" />
      </div>
    );
  }

  if (!token) {
    return <AuthGate onAuthed={handleAuthed} configError={!supabaseConfigured} />;
  }

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
        <Banner kind="error">{bootError || "Sitzung konnte nicht geladen werden."}</Banner>
        <Button onClick={() => loadProfile(token)}>
          <RefreshCw size={16} /> Erneut versuchen
        </Button>
        <Button variant="ghost" onClick={handleLogout}>
          Abmelden
        </Button>
      </div>
    );
  }

  return <Shell token={token} profile={profile} onLogout={handleLogout} />;
}
