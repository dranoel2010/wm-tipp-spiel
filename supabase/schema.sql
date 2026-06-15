-- ============================================================================
-- WM-Tippspiel  ·  Supabase Schema (Postgres)
-- In Supabase: SQL Editor -> komplettes Skript ausfuehren.
-- Sicherheitsmodell: KEINE Tabelle ist direkt beschreibbar. Alles laeuft ueber
-- SECURITY-DEFINER-RPCs, die Identitaet (player.token), Anpfiff-Sperre und
-- Tippgeheimnis erzwingen. Der anon-Key darf nur diese Funktionen ausfuehren.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tabellen
-- ----------------------------------------------------------------------------
create table if not exists league (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  join_code  text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists player (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references league(id) on delete cascade,
  name       text not null,
  token      uuid not null unique default gen_random_uuid(),
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (league_id, name)
);

-- Spiele sind global (turnierweit), nicht pro Liga.
create table if not exists match (
  id          text primary key,           -- stabile ID aus openfootball-Parser
  stage       text,
  grp         text,
  home        text not null,
  away        text not null,
  kickoff     timestamptz,
  home_score  int,
  away_score  int,
  finished    boolean not null default false,  -- true => Ergebnis fix, openfootball ueberschreibt nicht mehr
  updated_at  timestamptz not null default now()
);

create table if not exists tip (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references player(id) on delete cascade,
  match_id   text not null references match(id) on delete cascade,
  home_tip   int not null check (home_tip between 0 and 99),
  away_tip   int not null check (away_tip between 0 and 99),
  points     int,                          -- null = noch nicht gewertet
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, match_id)
);

create index if not exists tip_match_idx  on tip(match_id);
create index if not exists tip_player_idx on tip(player_id);

-- ----------------------------------------------------------------------------
-- RLS: alles dicht. Zugriff ausschliesslich ueber RPCs unten.
-- ----------------------------------------------------------------------------
alter table league enable row level security;
alter table player enable row level security;
alter table match  enable row level security;
alter table tip    enable row level security;
-- (keine Policies = kein Direktzugriff fuer anon/authenticated)

-- ----------------------------------------------------------------------------
-- Scoring  ·  Kicktipp-Standard 4/3/2
--   4 = exaktes Ergebnis
--   3 = richtige Tordifferenz (nicht exakt; Remis-Tipp auf Remis faellt hierunter)
--   2 = richtige Tendenz (Sieger/Remis)
--   0 = sonst
-- ----------------------------------------------------------------------------
create or replace function wm_score(ht int, at int, h int, a int)
returns int language sql immutable as $$
  select case
    when h is null or a is null then null
    when ht = h and at = a              then 4
    when (ht - at) = (h - a)            then 3
    when sign(ht - at) = sign(h - a)    then 2
    else 0
  end;
$$;

-- Helfer: Scoring siehe wm_score oben.

-- ----------------------------------------------------------------------------
-- RPC: Liga anlegen (erzeugt Admin-Spieler)  -> liefert token + join_code
-- ----------------------------------------------------------------------------
create or replace function create_league(p_league_name text, p_admin_name text)
returns table(token uuid, join_code text, league_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_code text; v_league uuid; v_token uuid;
begin
  if length(coalesce(trim(p_admin_name),'')) = 0 then
    raise exception 'Name fehlt';
  end if;
  -- 6-stelliger, gut lesbarer Code (ohne 0/O/1/I)
  loop
    select upper(string_agg(
             substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                    (floor(random()*32)+1)::int, 1), ''))
      into v_code
      from generate_series(1,6);
    exit when not exists(select 1 from league where league.join_code = v_code);
  end loop;

  insert into league(name, join_code) values (coalesce(nullif(trim(p_league_name),''),'WM-Tippspiel'), v_code)
    returning id into v_league;
  insert into player(league_id, name, is_admin) values (v_league, trim(p_admin_name), true)
    returning player.token into v_token;

  return query select v_token, v_code, v_league;
end; $$;

-- ----------------------------------------------------------------------------
-- RPC: Liga beitreten  -> liefert token
-- ----------------------------------------------------------------------------
create or replace function join_league(p_code text, p_name text)
returns table(token uuid, league_id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare v_league uuid; v_token uuid;
begin
  if length(coalesce(trim(p_name),'')) = 0 then raise exception 'Name fehlt'; end if;
  select l.id into v_league from league l where upper(l.join_code) = upper(trim(p_code));
  if v_league is null then raise exception 'Code ungueltig'; end if;
  if exists(select 1 from player p where p.league_id = v_league and lower(p.name) = lower(trim(p_name))) then
    raise exception 'Name in dieser Liga schon vergeben';
  end if;
  insert into player(league_id, name) values (v_league, trim(p_name))
    returning player.token into v_token;
  return query select v_token, v_league, trim(p_name);
end; $$;

-- ----------------------------------------------------------------------------
-- RPC: Session wiederherstellen
-- ----------------------------------------------------------------------------
create or replace function whoami(p_token uuid)
returns table(player_id uuid, name text, league_id uuid, league_name text,
              join_code text, is_admin boolean)
language sql security definer set search_path = public as $$
  select p.id, p.name, p.league_id, l.name, l.join_code, p.is_admin
  from player p join league l on l.id = p.league_id
  where p.token = p_token;
$$;

-- ----------------------------------------------------------------------------
-- RPC: Spielplan lesen (oeffentlich pro Liga-Token; Spiele sind global)
-- ----------------------------------------------------------------------------
create or replace function get_matches(p_token uuid)
returns table(id text, stage text, grp text, home text, away text,
              kickoff timestamptz, home_score int, away_score int,
              finished boolean, locked boolean)
language plpgsql security definer set search_path = public as $$
begin
  if (select 1 from player where token = p_token) is null then
    raise exception 'Token ungueltig';
  end if;
  return query
    select m.id, m.stage, m.grp, m.home, m.away, m.kickoff,
           m.home_score, m.away_score, m.finished,
           (m.kickoff is not null and now() >= m.kickoff) as locked
    from match m
    order by m.kickoff nulls last, m.id;
end; $$;

-- ----------------------------------------------------------------------------
-- RPC: eigene Tipps lesen
-- ----------------------------------------------------------------------------
create or replace function get_my_tips(p_token uuid)
returns table(match_id text, home_tip int, away_tip int, points int)
language plpgsql security definer set search_path = public as $$
declare v_player uuid;
begin
  select id into v_player from player where token = p_token;
  if v_player is null then raise exception 'Token ungueltig'; end if;
  return query select t.match_id, t.home_tip, t.away_tip, t.points
               from tip t where t.player_id = v_player;
end; $$;

-- ----------------------------------------------------------------------------
-- RPC: Tipp abgeben/aendern  (Anpfiff-Sperre serverseitig)
-- ----------------------------------------------------------------------------
create or replace function submit_tip(p_token uuid, p_match text, p_home int, p_away int)
returns void language plpgsql security definer set search_path = public as $$
declare v_player uuid; v_kick timestamptz;
begin
  select id into v_player from player where token = p_token;
  if v_player is null then raise exception 'Token ungueltig'; end if;
  if p_home is null or p_away is null or p_home < 0 or p_away < 0
     or p_home > 99 or p_away > 99 then
    raise exception 'Ungueltiges Ergebnis';
  end if;
  select kickoff into v_kick from match where id = p_match;
  if v_kick is null then raise exception 'Spiel unbekannt'; end if;
  if now() >= v_kick then raise exception 'Anpfiff vorbei, Tipp gesperrt'; end if;

  insert into tip(player_id, match_id, home_tip, away_tip)
    values (v_player, p_match, p_home, p_away)
  on conflict (player_id, match_id)
    do update set home_tip = excluded.home_tip,
                  away_tip = excluded.away_tip,
                  updated_at = now();
end; $$;

-- ----------------------------------------------------------------------------
-- RPC: Tipps aller Spieler zu einem Spiel  (erst ab Anpfiff sichtbar)
-- ----------------------------------------------------------------------------
create or replace function get_match_tips(p_token uuid, p_match text)
returns table(name text, home_tip int, away_tip int, points int)
language plpgsql security definer set search_path = public as $$
declare v_league uuid; v_admin boolean; v_kick timestamptz;
begin
  select league_id, is_admin into v_league, v_admin from player where token = p_token;
  if v_league is null then raise exception 'Token ungueltig'; end if;
  select kickoff into v_kick from match where id = p_match;
  if not coalesce(v_admin,false) and (v_kick is null or now() < v_kick) then
    raise exception 'Tipps erst ab Anpfiff sichtbar';
  end if;
  return query
    select p.name, t.home_tip, t.away_tip, t.points
    from tip t join player p on p.id = t.player_id
    where t.match_id = p_match and p.league_id = v_league
    order by t.points desc nulls last, p.name;
end; $$;

-- ----------------------------------------------------------------------------
-- RPC: Rangliste
-- ----------------------------------------------------------------------------
create or replace function get_leaderboard(p_token uuid)
returns table(name text, total int, played int, exact_hits int, is_me boolean)
language plpgsql security definer set search_path = public as $$
declare v_league uuid; v_me uuid;
begin
  select league_id, id into v_league, v_me from player where token = p_token;
  if v_league is null then raise exception 'Token ungueltig'; end if;
  return query
    select p.name,
           coalesce(sum(t.points),0)::int                               as total,
           count(t.points)::int                                         as played,
           count(*) filter (where t.points = 4)::int                    as exact_hits,
           (p.id = v_me)                                                as is_me
    from player p
    left join tip t on t.player_id = p.id and t.points is not null
    where p.league_id = v_league
    group by p.id, p.name
    order by total desc, exact_hits desc, p.name;
end; $$;

-- ----------------------------------------------------------------------------
-- ADMIN: Ergebnis manuell setzen (override, sperrt openfootball)
-- ----------------------------------------------------------------------------
create or replace function admin_set_result(p_token uuid, p_match text, p_home int, p_away int)
returns void language plpgsql security definer set search_path = public as $$
declare v_admin boolean;
begin
  select is_admin into v_admin from player where token = p_token;
  if not coalesce(v_admin,false) then raise exception 'Kein Admin'; end if;
  update match set home_score = p_home, away_score = p_away,
                   finished = true, updated_at = now()
  where id = p_match;
  if not found then raise exception 'Spiel unbekannt'; end if;
  update tip set points = wm_score(home_tip, away_tip, p_home, p_away),
                 updated_at = now()
  where match_id = p_match;
end; $$;

-- ----------------------------------------------------------------------------
-- ADMIN: Ergebnis loeschen / Spiel wieder oeffnen
-- ----------------------------------------------------------------------------
create or replace function admin_clear_result(p_token uuid, p_match text)
returns void language plpgsql security definer set search_path = public as $$
declare v_admin boolean;
begin
  select is_admin into v_admin from player where token = p_token;
  if not coalesce(v_admin,false) then raise exception 'Kein Admin'; end if;
  update match set home_score = null, away_score = null, finished = false, updated_at = now()
  where id = p_match;
  update tip set points = null where match_id = p_match;
end; $$;

-- ----------------------------------------------------------------------------
-- ADMIN: Spielplan/Ergebnisse aus openfootball synchronisieren
--   p_matches = jsonb-Array aus dem Parser (src/lib/openfootball.js)
--   Regeln: Stammdaten immer aktualisieren; Ergebnis aus Quelle nur setzen,
--   wenn Spiel noch nicht "finished" (Admin-Override bleibt geschuetzt).
-- ----------------------------------------------------------------------------
create or replace function admin_upsert_matches(p_token uuid, p_matches jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_admin boolean; r jsonb; n int := 0; v_has_score boolean; v_h int; v_a int;
begin
  select is_admin into v_admin from player where token = p_token;
  if not coalesce(v_admin,false) then raise exception 'Kein Admin'; end if;

  for r in select * from jsonb_array_elements(p_matches) loop
    v_has_score := (r->>'home_score') is not null and (r->>'away_score') is not null;
    v_h := nullif(r->>'home_score','')::int;
    v_a := nullif(r->>'away_score','')::int;

    insert into match(id, stage, grp, home, away, kickoff, home_score, away_score, finished, updated_at)
    values (
      r->>'id', r->>'stage', r->>'grp', r->>'home', r->>'away',
      nullif(r->>'kickoff','')::timestamptz,
      case when v_has_score then v_h end,
      case when v_has_score then v_a end,
      false, now()
    )
    on conflict (id) do update set
      stage   = excluded.stage,
      grp     = excluded.grp,
      home    = excluded.home,
      away    = excluded.away,
      kickoff = excluded.kickoff,
      -- Ergebnis aus Quelle nur, wenn nicht manuell fixiert:
      home_score = case when match.finished then match.home_score
                        when v_has_score then v_h else match.home_score end,
      away_score = case when match.finished then match.away_score
                        when v_has_score then v_a else match.away_score end,
      updated_at = now();
    n := n + 1;
  end loop;

  -- Punkte fuer alle nicht manuell fixierten Spiele neu berechnen, die ein Ergebnis haben
  update tip t set points = wm_score(t.home_tip, t.away_tip, m.home_score, m.away_score)
  from match m
  where m.id = t.match_id and m.home_score is not null and m.away_score is not null
    and not m.finished;

  return n;
end; $$;

-- ----------------------------------------------------------------------------
-- Rechte: anon/authenticated duerfen NUR die RPCs ausfuehren
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant execute on function
  create_league(text,text), join_league(text,text), whoami(uuid),
  get_matches(uuid), get_my_tips(uuid), submit_tip(uuid,text,int,int),
  get_match_tips(uuid,text), get_leaderboard(uuid),
  admin_set_result(uuid,text,int,int), admin_clear_result(uuid,text),
  admin_upsert_matches(uuid,jsonb)
to anon, authenticated;
