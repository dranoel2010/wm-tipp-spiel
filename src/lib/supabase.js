import { createClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------------------
// Supabase-Client.  WICHTIG (siehe claude.md / schema.sql):
//  - KEIN Supabase-Auth, KEIN E-Mail-Login. Identitaet ist player.token (UUID).
//  - KEIN Direktzugriff auf Tabellen. Jeder Zugriff laeuft ueber die RPCs unten.
//  - Der anon-Key darf laut Schema nur die RPCs ausfuehren.
// ----------------------------------------------------------------------------
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

if (!supabaseConfigured) {
  // Sichtbarer Hinweis im Dev-Tools-Log statt stiller Fehlversuch.
  console.warn(
    "[wm-tippspiel] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen. " +
      "Werte in .env eintragen und `pnpm dev` neu starten (siehe README)."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  // Wir nutzen kein Supabase-Auth: keine Session persistieren, kein Refresh.
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// Zentraler RPC-Aufruf. Wirft mit der Server-Fehlermeldung (z. B. "Anpfiff
// vorbei, Tipp gesperrt"), damit die UI sie 1:1 inline anzeigen kann.
async function call(fn, params) {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase ist nicht konfiguriert. Bitte .env ausfuellen (siehe README)."
    );
  }
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw new Error(error.message || "Unbekannter Serverfehler");
  return data;
}

// set-returning RPCs -> immer ein Array.
export async function rpcRows(fn, params) {
  const data = await call(fn, params);
  if (Array.isArray(data)) return data;
  return data == null ? [] : [data];
}

// RPCs mit genau einer Zeile (z. B. whoami, create_league) -> erste Zeile.
export async function rpcRow(fn, params) {
  const rows = await rpcRows(fn, params);
  return rows[0] ?? null;
}

// Skalare / void RPCs (z. B. submit_tip -> void, admin_upsert_matches -> int).
export async function rpcValue(fn, params) {
  return call(fn, params);
}
