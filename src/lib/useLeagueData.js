import { useCallback, useEffect, useState } from "react";
import { rpcRows } from "./supabase.js";
import { parseKickoff } from "./format.js";
import seedFixtures from "../data/seed-fixtures.json";

// Seed-Zeile -> gleiche Form wie get_matches (abgeleitetes `locked`).
function normalizeSeed(m) {
  const d = parseKickoff(m.kickoff);
  return {
    id: m.id,
    stage: m.stage,
    grp: m.grp,
    home: m.home,
    away: m.away,
    kickoff: m.kickoff,
    home_score: m.home_score,
    away_score: m.away_score,
    finished: Boolean(m.source_finished),
    locked: d ? Date.now() >= d.getTime() : false,
  };
}

// Zentrale Liga-Daten: matches, eigene Tipps, Rangliste. Alles via RPC.
export function useLeagueData(token) {
  const [matches, setMatches] = useState([]);
  const [tips, setTips] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [source, setSource] = useState("server");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setError("");
    try {
      const [m, t, lb] = await Promise.all([
        rpcRows("get_matches", { p_token: token }),
        rpcRows("get_my_tips", { p_token: token }),
        rpcRows("get_leaderboard", { p_token: token }),
      ]);
      let rows = m;
      let src = "server";
      if (!rows.length) {
        rows = seedFixtures.map(normalizeSeed);
        src = "seed";
      }
      setMatches(rows);
      setTips(t);
      setLeaderboard(lb);
      setSource(src);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const reloadTips = useCallback(async () => {
    try {
      setTips(await rpcRows("get_my_tips", { p_token: token }));
    } catch {
      /* Fehler hat die ausloesende Aktion bereits inline gemeldet */
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  return { matches, tips, leaderboard, source, loading, error, reload, reloadTips };
}
