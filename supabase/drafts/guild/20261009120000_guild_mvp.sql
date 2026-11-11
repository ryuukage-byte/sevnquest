-- =============================================================================
-- DRAFT -- BELUM DITERAPKAN KE DATABASE MANA PUN.
-- SevnQuest Guild MVP: skema, RPC, dan hak akses.
--
-- Sumber poin : public.weekly_scores (ditulis HANYA oleh submit_score_event_v2; naik saja, +10 per
--               jawaban benar, unik per (user_id, week_id), minggu = 'IYYY-"W"IW' UTC).
-- Klien       : tidak punya akses tabel sama sekali. Semua baca/tulis lewat RPC SECURITY DEFINER.
-- Urutan kunci: SELALU baris guilds (FOR UPDATE) lebih dulu, baru baris guild_members (urut user_id).
--               guild_get_my memakai SKIP LOCKED sehingga tidak pernah mengantre.
-- Kegagalan   : kegagalan yang WAJAR (kode salah, penuh, dst.) dikembalikan sebagai
--               {"ok": false, "error": "..."} -- bukan exception -- supaya baris throttle tidak ikut
--               di-rollback. Exception hanya untuk 'unauthenticated'.
-- Tidak ada total_points tersimpan: total = SUM(guild_weekly_contrib.points). Tidak ada cache yang
--               bisa melenceng dari sumbernya.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Parameter dan helper
-- ---------------------------------------------------------------------------

-- Konfigurasi awal (berdasarkan distribusi weekly_scores W40/W41). Mengubahnya = migrasi kecil.
create function public._guild_params(
  out per_member_target int,    -- poin target per anggota per minggu
  out member_week_cap   int,    -- batas kredit per anggota per Guild per minggu
  out max_members_hard  int,
  out sync_min_interval interval
) language sql immutable as
$$ select 150, 2000, 30, interval '30 seconds' $$;

-- Dipisah agar waktu bisa disimulasikan di database uji lokal. Tidak ada efek di produksi.
create function public._guild_now() returns timestamptz
language sql stable as $$ select now() $$;

create function public._guild_week_id(p_ts timestamptz) returns text
language sql immutable as $$ select to_char(p_ts at time zone 'UTC', 'IYYY"-W"IW') $$;

-- Poin untuk MENCAPAI level n = 2000 * (n-1)^2. Level diturunkan, tidak disimpan.
create function public.guild_points_for_level(p_level int) returns bigint
language sql immutable as $$ select 2000::bigint * (greatest(p_level, 1) - 1) * (greatest(p_level, 1) - 1) $$;

create function public.guild_level_for_points(p bigint) returns int
language sql immutable as $$ select 1 + floor(sqrt(greatest(p, 0) / 2000.0))::int $$;

-- Buang karakter kontrol dan < > (pola sama dengan submit_score_event_v2), rapikan spasi, potong.
create function public._guild_clean_text(p text, p_max int) returns text
language sql immutable as
$$ select left(btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]<>]', '', 'g'), '\s+', ' ', 'g')), p_max) $$;

create function public._guild_normalize_code(p text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- Kode undangan: 12 heksadesimal dari gen_random_uuid() (CSPRNG, bawaan inti PG; tidak butuh pgcrypto
-- yang berada di schema "extensions" pada Supabase).
create function public._guild_new_code() returns text
language sql volatile as $$ select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)) $$;

-- ---------------------------------------------------------------------------
-- 2. Tabel
-- ---------------------------------------------------------------------------

create table public.guilds (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 3 and 30),
  description    text not null default '' check (char_length(description) <= 200),
  owner_id       uuid references auth.users(id) on delete set null,   -- null = akun owner dihapus; dipromosikan saat sinkron
  invite_code    text not null unique,
  max_members    int  not null default 30 check (max_members between 2 and 30),
  last_synced_at timestamptz,
  created_at     timestamptz not null default now()
);
create unique index guilds_name_ci on public.guilds (lower(name));

-- PK user_id = satu Guild per pengguna, ditegakkan database.
create table public.guild_members (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  guild_id     uuid not null references public.guilds(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  settled_week text not null   -- minggu-minggu SEBELUM ini sudah final untuk anggota ini
);
create index guild_members_guild_idx on public.guild_members (guild_id);

-- Satu baris per (Guild, anggota, minggu). Menyimpan poin yang dikreditkan DAN kursor sinkron.
create table public.guild_weekly_contrib (
  id           bigint generated always as identity primary key,
  guild_id     uuid not null references public.guilds(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,   -- null = akun dihapus; poin tetap milik Guild
  week_id      text not null,
  points       int  not null default 0 check (points >= 0),
  synced_score int  not null default 0 check (synced_score >= 0),  -- kursor: skor weekly_scores yang sudah "dilihat"
  unique (guild_id, user_id, week_id)
);
create index guild_weekly_contrib_guild_week_idx on public.guild_weekly_contrib (guild_id, week_id);

-- Target mingguan "dibekukan sebagian": per_member_target disalin saat dibuat, peak_members hanya naik,
-- achieved_at sekali terisi tidak dicabut (dasar lencana).
create table public.guild_weekly_goal (
  guild_id          uuid not null references public.guilds(id) on delete cascade,
  week_id           text not null,
  per_member_target int  not null check (per_member_target > 0),
  peak_members      int  not null check (peak_members > 0),
  achieved_at       timestamptz,
  primary key (guild_id, week_id)
);

-- Throttle aksi sensitif (tebak kode undangan, spam buat Guild).
create table public.guild_action_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index guild_action_log_idx on public.guild_action_log (user_id, action, created_at desc);

-- RLS aktif TANPA policy = tertutup total untuk klien (pola sama dengan score_event_log).
alter table public.guilds              enable row level security;
alter table public.guild_members       enable row level security;
alter table public.guild_weekly_contrib enable row level security;
alter table public.guild_weekly_goal   enable row level security;
alter table public.guild_action_log    enable row level security;

-- Supabase memberi hak default ke anon/authenticated pada tabel baru; cabut eksplisit.
revoke all on public.guilds, public.guild_members, public.guild_weekly_contrib,
              public.guild_weekly_goal, public.guild_action_log from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Fungsi internal (tanpa EXECUTE untuk klien)
-- ---------------------------------------------------------------------------

-- false = terkena batas. Sengaja TIDAK raise: baris log harus bertahan saat pemanggil mengembalikan error.
create function public._guild_throttle(p_uid uuid, p_action text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from guild_action_log where user_id = p_uid and created_at < _guild_now() - interval '1 day';
  select count(*) into n from guild_action_log
   where user_id = p_uid and action = p_action and created_at > _guild_now() - p_window;
  if n >= p_max then return false; end if;
  insert into guild_action_log (user_id, action, created_at) values (p_uid, p_action, _guild_now());
  return true;
end $$;

-- Pastikan baris target minggu itu ada. p_raise_peak=true hanya dari create/join (peak tidak pernah turun).
create function public._guild_touch_goal(p_gid uuid, p_week text, p_raise_peak boolean)
returns void language plpgsql security definer set search_path = public as $$
declare cnt int; prm record;
begin
  select * into prm from _guild_params();
  select count(*) into cnt from guild_members where guild_id = p_gid;
  insert into guild_weekly_goal (guild_id, week_id, per_member_target, peak_members)
  values (p_gid, p_week, prm.per_member_target, greatest(cnt, 1))
  on conflict (guild_id, week_id) do update
    set peak_members = case when p_raise_peak
                            then greatest(guild_weekly_goal.peak_members, excluded.peak_members)
                            else guild_weekly_goal.peak_members end;
end $$;

create function public._guild_refresh_achieved(p_gid uuid, p_weeks text[])
returns void language sql security definer set search_path = public as $$
  update guild_weekly_goal g
     set achieved_at = _guild_now()
   where g.guild_id = p_gid
     and g.week_id = any (p_weeks)
     and g.achieved_at is null
     and (select coalesce(sum(c.points), 0) from guild_weekly_contrib c
           where c.guild_id = g.guild_id and c.week_id = g.week_id) >= g.peak_members * g.per_member_target
$$;

-- Baseline: skor yang SUDAH ada minggu ini tidak ikut dihitung. Dipanggil saat membuat/bergabung.
-- Pada gabung-ulang minggu yang sama, kursor baris lama dinaikkan ke skor sekarang (points tidak diubah),
-- sehingga poin yang didapat saat berada di luar Guild tidak pernah dikreditkan.
create function public._guild_baseline(p_gid uuid, p_uid uuid, p_week text)
returns void language sql security definer set search_path = public as $$
  insert into guild_weekly_contrib (guild_id, user_id, week_id, points, synced_score)
  select p_gid, p_uid, p_week, 0, ws.score
    from weekly_scores ws
   where ws.user_id = p_uid::text and ws.week_id = p_week and ws.score > 0
  on conflict (guild_id, user_id, week_id) do update
    set synced_score = greatest(guild_weekly_contrib.synced_score, excluded.synced_score)
$$;

-- Sinkron kontribusi. PEMANGGIL WAJIB sudah memegang kunci baris guilds (FOR UPDATE).
-- Idempoten: kursor (synced_score) hanya maju. Poin di atas cap dibuang tetapi kursor tetap maju.
-- settled_week hanya dimajukan ke minggu dari (sekarang - 5 menit): minggu lama dipindai ulang sebentar
-- setelah pergantian, sehingga transaksi v2 yang commit tepat di batas minggu tidak terlewat.
create function public._guild_sync(p_gid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_now       timestamptz := _guild_now();
  v_wk        text := _guild_week_id(v_now);
  v_settle_to text := _guild_week_id(v_now - interval '5 minutes');
  v_cap       int;
  v_touched   text[];
  v_w         text;
begin
  select member_week_cap into v_cap from _guild_params();

  -- Guild tanpa owner (akun owner dihapus): promosikan anggota tertua.
  update guilds g
     set owner_id = (select m.user_id from guild_members m where m.guild_id = g.id
                      order by m.joined_at, m.user_id limit 1)
   where g.id = p_gid and g.owner_id is null;

  perform 1 from guild_members where guild_id = p_gid order by user_id for update;

  -- Satu statement: baca skor sumber -> hitung delta berbatas -> upsert kontribusi + kursor.
  with src as (
    select m.user_id, ws.week_id, ws.score,
           coalesce(c.synced_score, 0) as prev,
           coalesce(c.points, 0)       as have
      from guild_members m
      join weekly_scores ws
        on ws.user_id = m.user_id::text
       and ws.week_id >= m.settled_week
       and ws.week_id <= v_wk
      left join guild_weekly_contrib c
        on c.guild_id = m.guild_id and c.user_id = m.user_id and c.week_id = ws.week_id
     where m.guild_id = p_gid
  ), calc as (
    select user_id, week_id, score,
           least(greatest(score - prev, 0), greatest(v_cap - have, 0)) as add_pts
      from src
     where score > prev               -- score <= prev: tidak ada yang dikredit, kursor tidak turun
  ), upd as (
    insert into guild_weekly_contrib as c (guild_id, user_id, week_id, points, synced_score)
    select p_gid, user_id, week_id, add_pts, score from calc
    on conflict (guild_id, user_id, week_id) do update
      set points       = c.points + excluded.points,
          -- greatest() redundan dengan filter "score > prev" di atas; dipertahankan sebagai pertahanan
          -- berlapis agar kursor tidak mungkin turun bila filter itu suatu hari berubah.
          synced_score = greatest(c.synced_score, excluded.synced_score)
    returning c.week_id
  )
  select array_agg(distinct week_id) into v_touched from upd;

  update guild_members
     set settled_week = greatest(settled_week, v_settle_to)
   where guild_id = p_gid;

  perform _guild_touch_goal(p_gid, v_wk, false);
  if v_touched is not null then
    foreach v_w in array v_touched loop
      perform _guild_touch_goal(p_gid, v_w, false);
    end loop;
  end if;
  perform _guild_refresh_achieved(p_gid, coalesce(v_touched, '{}') || v_wk);

  update guilds set last_synced_at = v_now where id = p_gid;
end $$;

-- Bentuk jawaban layar Guild. Tidak mengubah data. week_points = per sinkron terakhir.
create function public._guild_view(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_gid uuid; g public.guilds%rowtype; prm record;
  v_wk text := _guild_week_id(_guild_now());
  v_members int; v_total bigint; v_lvl int; v_progress bigint; v_target int; v_achieved int;
  goal public.guild_weekly_goal%rowtype; v_list jsonb;
begin
  select guild_id into v_gid from guild_members where user_id = p_uid;
  if v_gid is null then return jsonb_build_object('ok', true, 'guild', null); end if;

  select * into g from guilds where id = v_gid;
  select * into prm from _guild_params();
  select count(*) into v_members from guild_members where guild_id = v_gid;
  select coalesce(sum(points), 0) into v_total from guild_weekly_contrib where guild_id = v_gid;
  v_lvl := guild_level_for_points(v_total);

  select * into goal from guild_weekly_goal where guild_id = v_gid and week_id = v_wk;
  if goal.guild_id is null then
    goal.per_member_target := prm.per_member_target;
    goal.peak_members := greatest(v_members, 1);
  end if;
  select coalesce(sum(points), 0) into v_progress from guild_weekly_contrib where guild_id = v_gid and week_id = v_wk;
  v_target := goal.peak_members * goal.per_member_target;
  select count(*) into v_achieved from guild_weekly_goal where guild_id = v_gid and achieved_at is not null;

  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', m.user_id,
           'name', coalesce(lb.player_name, 'Petualang'),
           'avatar', lb.avatar_url,
           'tier_index', coalesce(lb.tier_index, 0),
           'week_points', coalesce(c.points, 0),
           'is_owner', m.user_id = g.owner_id,
           'joined_at', m.joined_at)
         order by coalesce(c.points, 0) desc, m.joined_at, m.user_id), '[]'::jsonb)
    into v_list
    from guild_members m
    left join leaderboard lb on lb.user_id = m.user_id::text
    left join guild_weekly_contrib c on c.guild_id = m.guild_id and c.user_id = m.user_id and c.week_id = v_wk
   where m.guild_id = v_gid;

  return jsonb_build_object(
    'ok', true,
    'guild', jsonb_build_object(
      'id', g.id, 'name', g.name, 'description', g.description,
      'is_owner', g.owner_id = p_uid,
      'invite_code', case when g.owner_id = p_uid then g.invite_code end,
      'member_count', v_members, 'max_members', g.max_members,
      'total_points', v_total, 'level', v_lvl,
      'next_level_points', guild_points_for_level(v_lvl + 1),
      'last_synced_at', g.last_synced_at),
    'week', jsonb_build_object(
      'week_id', v_wk, 'per_member_target', goal.per_member_target, 'peak_members', goal.peak_members,
      'target', v_target, 'progress', v_progress,
      'achieved', goal.achieved_at is not null or v_progress >= v_target,
      'achieved_at', goal.achieved_at),
    'weeks_achieved', v_achieved,
    'members', v_list);
end $$;

-- ---------------------------------------------------------------------------
-- 4. RPC untuk klien
-- ---------------------------------------------------------------------------

create function public.guild_create(p_name text, p_description text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_name text; v_desc text; v_gid uuid; v_code text; v_i int := 0;
  v_wk   text := _guild_week_id(_guild_now());
  prm    record;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not _guild_throttle(v_uid, 'create', 3, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  v_name := _guild_clean_text(p_name, 30);
  v_desc := _guild_clean_text(p_description, 200);
  if char_length(v_name) < 3 then return jsonb_build_object('ok', false, 'error', 'invalid_name'); end if;
  if exists (select 1 from guild_members where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'already_in_guild');
  end if;
  select * into prm from _guild_params();

  loop
    v_i := v_i + 1;
    v_code := _guild_new_code();
    begin
      insert into guilds (name, description, owner_id, invite_code, max_members)
      values (v_name, v_desc, v_uid, v_code, prm.max_members_hard)
      returning id into v_gid;
      exit;
    exception when unique_violation then
      if exists (select 1 from guilds where lower(name) = lower(v_name)) then
        return jsonb_build_object('ok', false, 'error', 'name_taken');
      end if;
      if v_i >= 5 then return jsonb_build_object('ok', false, 'error', 'try_again'); end if;  -- tabrakan kode (sangat jarang)
    end;
  end loop;

  begin
    insert into guild_members (user_id, guild_id, settled_week) values (v_uid, v_gid, v_wk);
  exception when unique_violation then          -- balapan: dua create bersamaan dari pengguna yang sama
    delete from guilds where id = v_gid;
    return jsonb_build_object('ok', false, 'error', 'already_in_guild');
  end;
  perform _guild_baseline(v_gid, v_uid, v_wk);
  perform _guild_touch_goal(v_gid, v_wk, true);
  return _guild_view(v_uid);
end $$;

-- Pratinjau sebelum bergabung. Tidak membuka daftar anggota.
create function public.guild_preview(p_invite_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); g public.guilds%rowtype; v_members int; v_total bigint;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not _guild_throttle(v_uid, 'preview', 20, interval '1 minute') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select * into g from guilds where invite_code = _guild_normalize_code(p_invite_code);
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  select count(*) into v_members from guild_members where guild_id = g.id;
  select coalesce(sum(points), 0) into v_total from guild_weekly_contrib where guild_id = g.id;
  return jsonb_build_object('ok', true, 'name', g.name, 'description', g.description,
    'member_count', v_members, 'max_members', g.max_members, 'level', guild_level_for_points(v_total));
end $$;

create function public.guild_join(p_invite_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_code text := _guild_normalize_code(p_invite_code);
  v_gid uuid; g public.guilds%rowtype; v_members int;
  v_wk text := _guild_week_id(_guild_now());
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not _guild_throttle(v_uid, 'join', 10, interval '1 minute') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select id into v_gid from guilds where invite_code = v_code;
  if v_gid is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;

  select * into g from guilds where id = v_gid for update;               -- kunci 1: guilds
  if not found or g.invite_code <> v_code then                             -- dihapus/kode diganti saat menunggu kunci
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if exists (select 1 from guild_members where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'already_in_guild');
  end if;
  select count(*) into v_members from guild_members where guild_id = v_gid;
  if v_members >= g.max_members then return jsonb_build_object('ok', false, 'error', 'guild_full'); end if;

  begin
    insert into guild_members (user_id, guild_id, settled_week) values (v_uid, v_gid, v_wk);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_in_guild');
  end;
  perform _guild_baseline(v_gid, v_uid, v_wk);
  perform _guild_touch_goal(v_gid, v_wk, true);
  return _guild_view(v_uid);
end $$;

create function public.guild_leave()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_gid uuid; g public.guilds%rowtype; v_left int; v_next uuid;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select guild_id into v_gid from guild_members where user_id = v_uid;
  if v_gid is null then return jsonb_build_object('ok', false, 'error', 'not_in_guild'); end if;

  select * into g from guilds where id = v_gid for update;               -- kunci 1: guilds
  if not found or not exists (select 1 from guild_members where user_id = v_uid and guild_id = v_gid) then
    return jsonb_build_object('ok', false, 'error', 'not_in_guild');       -- sudah di-kick / Guild bubar saat menunggu
  end if;

  perform _guild_sync(v_gid);                                              -- kredit poin terakhir sebelum pergi
  delete from guild_members where user_id = v_uid;

  select count(*) into v_left from guild_members where guild_id = v_gid;
  if v_left = 0 then
    delete from guilds where id = v_gid;                                   -- cascade: kontribusi + target ikut terhapus
    return jsonb_build_object('ok', true, 'disbanded', true);
  end if;
  if g.owner_id = v_uid then
    select user_id into v_next from guild_members where guild_id = v_gid order by joined_at, user_id limit 1;
    update guilds set owner_id = v_next where id = v_gid;
  end if;
  return jsonb_build_object('ok', true, 'disbanded', false);
end $$;

create function public.guild_kick(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_gid uuid; g public.guilds%rowtype;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select guild_id into v_gid from guild_members where user_id = v_uid;
  if v_gid is null then return jsonb_build_object('ok', false, 'error', 'not_in_guild'); end if;

  select * into g from guilds where id = v_gid for update;               -- kunci 1: guilds
  if not found then return jsonb_build_object('ok', false, 'error', 'not_in_guild'); end if;
  if g.owner_id is distinct from v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;
  if p_user_id = v_uid then return jsonb_build_object('ok', false, 'error', 'cannot_kick_self'); end if;
  if not exists (select 1 from guild_members where user_id = p_user_id and guild_id = v_gid) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  perform _guild_sync(v_gid);
  delete from guild_members where user_id = p_user_id and guild_id = v_gid;
  return jsonb_build_object('ok', true);
end $$;

create function public.guild_update(p_description text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gid uuid; g public.guilds%rowtype;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select guild_id into v_gid from guild_members where user_id = v_uid;
  if v_gid is null then return jsonb_build_object('ok', false, 'error', 'not_in_guild'); end if;
  select * into g from guilds where id = v_gid for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_in_guild'); end if;
  if g.owner_id is distinct from v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;
  update guilds set description = _guild_clean_text(p_description, 200) where id = v_gid;
  return _guild_view(v_uid);
end $$;

create function public.guild_rotate_code()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_gid uuid; g public.guilds%rowtype; v_i int := 0; v_code text;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  if not _guild_throttle(v_uid, 'rotate', 5, interval '1 hour') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  select guild_id into v_gid from guild_members where user_id = v_uid;
  if v_gid is null then return jsonb_build_object('ok', false, 'error', 'not_in_guild'); end if;
  select * into g from guilds where id = v_gid for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_in_guild'); end if;
  if g.owner_id is distinct from v_uid then return jsonb_build_object('ok', false, 'error', 'not_owner'); end if;
  loop
    v_i := v_i + 1;
    v_code := _guild_new_code();
    begin
      update guilds set invite_code = v_code where id = v_gid;
      exit;
    exception when unique_violation then
      if v_i >= 5 then return jsonb_build_object('ok', false, 'error', 'try_again'); end if;
    end;
  end loop;
  return jsonb_build_object('ok', true, 'invite_code', v_code);
end $$;

-- Layar utama. Sinkron hanya bila data basi DAN kunci Guild langsung didapat (SKIP LOCKED):
-- 30 anggota yang membuka halaman bersamaan tidak mengantre; yang kalah membaca data sinkron terakhir.
-- Dipanggil lewat POST (supabase.rpc) karena fungsi ini VOLATILE.
create function public.guild_get_my()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_gid uuid; v_last timestamptz; v_min interval;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = '28000'; end if;
  select guild_id into v_gid from guild_members where user_id = v_uid;
  if v_gid is null then return jsonb_build_object('ok', true, 'guild', null); end if;

  select sync_min_interval into v_min from _guild_params();
  select last_synced_at into v_last from guilds where id = v_gid;
  if v_last is null or v_last < _guild_now() - v_min then
    perform 1 from guilds where id = v_gid for update skip locked;
    if found then perform _guild_sync(v_gid); end if;
  end if;
  return _guild_view(v_uid);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Hak eksekusi (fungsi baru di schema public otomatis bisa dieksekusi anon/PUBLIC di Supabase)
-- ---------------------------------------------------------------------------

revoke all on function
  public._guild_params(), public._guild_now(), public._guild_week_id(timestamptz),
  public.guild_points_for_level(int), public.guild_level_for_points(bigint),
  public._guild_clean_text(text, int), public._guild_normalize_code(text), public._guild_new_code(),
  public._guild_throttle(uuid, text, int, interval),
  public._guild_touch_goal(uuid, text, boolean),
  public._guild_refresh_achieved(uuid, text[]),
  public._guild_baseline(uuid, uuid, text),
  public._guild_sync(uuid),
  public._guild_view(uuid)
from public, anon, authenticated;

revoke all on function
  public.guild_create(text, text), public.guild_preview(text), public.guild_join(text),
  public.guild_leave(), public.guild_kick(uuid), public.guild_update(text),
  public.guild_rotate_code(), public.guild_get_my()
from public, anon;

grant execute on function
  public.guild_create(text, text), public.guild_preview(text), public.guild_join(text),
  public.guild_leave(), public.guild_kick(uuid), public.guild_update(text),
  public.guild_rotate_code(), public.guild_get_my()
to authenticated;
