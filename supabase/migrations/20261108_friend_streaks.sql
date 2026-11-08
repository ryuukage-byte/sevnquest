-- ============================================================================
-- friend_streaks: "Api Bareng" — streak berdua dengan teman.
--
-- Cara kerja:
--   - Teman ditambahkan lewat KODE TEMAN = alamat Kotak Pos pemain (mailboxes.address, mis. SQ-K7MP-2Q4X).
--     Permintaan harus diterima pihak lain dulu (status pending -> active).
--   - Pemain "menyalakan api" hari ini dengan menyelesaikan misi harian (syarat diperiksa di klien,
--     lihat src/lib/friendStreakCore.ts FLAME_MIN_MISSIONS), lalu klien memanggil friend_streak_checkin().
--   - Api sebuah pasangan bertambah 1 setiap hari KEDUANYA menyala. Bila ada hari yang terlewat
--     (salah satu tidak menyala), api padam dan mulai lagi dari 1.
--   - Pemain boleh "mengingatkan" teman yang hari ini belum menyalakan api (1x per teman per hari).
--
-- Hari dihitung per tanggal WIB (Asia/Jakarta), sama seperti kuota Kotak Pos.
--
-- Keamanan:
-- - Tabel tidak bisa dibaca/ditulis langsung oleh klien (RLS aktif tanpa policy + revoke).
--   Semua akses lewat RPC security definer berbasis auth.uid().
-- - Tamu (anon) tidak punya akses.
-- - Batas: maks 30 teman (aktif + menunggu) per pemain, maks 20 permintaan per 24 jam.
--
-- Bergantung pada public.mailboxes & public.mail_ensure_mailbox() (20261107b_letters.sql).
-- STATUS: BELUM DITERAPKAN ke proyek live. File ini idempoten; aman dijalankan ulang.
-- ============================================================================

-- --------------------------------------------------------------------------- Tabel

create table if not exists public.friend_profiles (
  user_id        uuid        primary key references auth.users (id) on delete cascade,
  display_name   text        check (display_name is null or char_length(display_name) <= 40),
  -- Hari (WIB) terakhir pemain menyalakan api (menyelesaikan misi harian).
  last_done_day  date,
  updated_at     timestamptz not null default now()
);

comment on table public.friend_profiles is 'Nama tampilan & hari terakhir menyalakan api (Api Bareng). Tulis hanya lewat RPC.';

create table if not exists public.friend_streaks (
  id              uuid        primary key default gen_random_uuid(),
  user_a          uuid        not null references auth.users (id) on delete cascade,
  user_b          uuid        not null references auth.users (id) on delete cascade,
  requested_by    uuid        not null references auth.users (id) on delete cascade,
  status          text        not null default 'pending' check (status in ('pending', 'active')),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  streak_days     integer     not null default 0 check (streak_days >= 0),
  longest_streak  integer     not null default 0 check (longest_streak >= 0),
  -- Hari (WIB) terakhir keduanya menyalakan api.
  last_both_day   date,
  -- a_nudged_on = hari (WIB) terakhir user_a diingatkan oleh user_b (dan sebaliknya).
  a_nudged_on     date,
  b_nudged_on     date,
  constraint friend_streaks_order check (user_a < user_b),
  constraint friend_streaks_pair unique (user_a, user_b)
);

comment on table public.friend_streaks is 'Pasangan teman Api Bareng (user_a < user_b). Tulis hanya lewat RPC.';

create index if not exists friend_streaks_b_idx on public.friend_streaks (user_b);
create index if not exists friend_streaks_requested_idx on public.friend_streaks (requested_by, created_at desc);

alter table public.friend_profiles enable row level security;
alter table public.friend_streaks enable row level security;

revoke all on public.friend_profiles from anon, authenticated;
revoke all on public.friend_streaks from anon, authenticated;

-- --------------------------------------------------------------------------- Helper internal

create or replace function public.friend_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- Simpan / perbarui nama tampilan pemain (nama kosong => nama lama dipertahankan).
create or replace function public.friend_touch_profile(p_uid uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(left(btrim(coalesce(p_name, '')), 40), '');
begin
  insert into public.friend_profiles (user_id, display_name)
  values (p_uid, v_name)
  on conflict (user_id) do update
    set display_name = coalesce(excluded.display_name, public.friend_profiles.display_name),
        updated_at = now()
    where excluded.display_name is not null
      and excluded.display_name is distinct from public.friend_profiles.display_name;
end;
$$;

-- Naikkan api pasangan aktif milik p_uid yang hari ini KEDUANYA sudah menyala. Mengembalikan jumlah pasangan.
create or replace function public.friend_advance_pairs(p_uid uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := public.friend_today();
  v_n     integer;
begin
  update public.friend_streaks s
     set streak_days    = case when s.last_both_day = v_today - 1 then s.streak_days + 1 else 1 end,
         longest_streak = greatest(s.longest_streak, case when s.last_both_day = v_today - 1 then s.streak_days + 1 else 1 end),
         last_both_day  = v_today
   where s.status = 'active'
     and (s.user_a = p_uid or s.user_b = p_uid)
     and s.last_both_day is distinct from v_today
     and (select pa.last_done_day from public.friend_profiles pa where pa.user_id = s.user_a) = v_today
     and (select pb.last_done_day from public.friend_profiles pb where pb.user_id = s.user_b) = v_today;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.friend_today() from public, anon, authenticated;
revoke all on function public.friend_touch_profile(uuid, text) from public, anon, authenticated;
revoke all on function public.friend_advance_pairs(uuid) from public, anon, authenticated;

-- --------------------------------------------------------------------------- RPC

-- Pemain menyalakan api hari ini (klien memanggil setelah syarat misi harian terpenuhi). Idempoten.
-- Mengembalikan jumlah pasangan yang apinya bertambah karena panggilan ini.
create or replace function public.friend_streak_checkin(p_name text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := public.friend_today();
begin
  if v_uid is null then
    raise exception 'Harus login untuk Api Bareng.' using errcode = '42501';
  end if;
  perform public.friend_touch_profile(v_uid, p_name);
  update public.friend_profiles
     set last_done_day = v_today, updated_at = now()
   where user_id = v_uid and last_done_day is distinct from v_today;
  return public.friend_advance_pairs(v_uid);
end;
$$;

-- Ajak teman lewat kode teman (alamat Kotak Pos). Bila dia sudah lebih dulu mengajak, langsung jadi teman.
-- Mengembalikan 'sent' atau 'accepted'.
create or replace function public.friend_streak_request(p_code text, p_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  -- Normalisasi sama dengan klien (normalizeFriendCode): 'sq k7mp 2q4x' => 'SQ-K7MP-2Q4X'.
  v_raw    text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_code   text := case when v_raw ~ '^SQ[A-Z0-9]{8}$'
                        then 'SQ-' || substr(v_raw, 3, 4) || '-' || substr(v_raw, 7, 4)
                        else v_raw end;
  v_other  uuid;
  v_a      uuid;
  v_b      uuid;
  v_row    public.friend_streaks%rowtype;
begin
  if v_uid is null then
    raise exception 'Harus login untuk Api Bareng.' using errcode = '42501';
  end if;
  perform public.mail_ensure_mailbox(v_uid);
  perform public.friend_touch_profile(v_uid, p_name);

  select user_id into v_other from public.mailboxes where address = v_code;
  if v_other is null then
    raise exception 'Kode teman tidak ditemukan. Periksa lagi kodenya.' using errcode = 'P0002';
  end if;
  if v_other = v_uid then
    raise exception 'Itu kode temanmu sendiri.' using errcode = 'P0001';
  end if;

  v_a := least(v_uid, v_other);
  v_b := greatest(v_uid, v_other);
  select * into v_row from public.friend_streaks where user_a = v_a and user_b = v_b;

  if found then
    if v_row.status = 'active' then
      raise exception 'Kalian sudah berteman.' using errcode = 'P0001';
    end if;
    if v_row.requested_by = v_uid then
      raise exception 'Ajakan sudah terkirim. Tunggu dia menerima.' using errcode = 'P0001';
    end if;
    -- Dia sudah mengajak lebih dulu: terima.
    update public.friend_streaks set status = 'active', accepted_at = now() where id = v_row.id;
    perform public.friend_advance_pairs(v_uid);
    return 'accepted';
  end if;

  if (select count(*) from public.friend_streaks where user_a = v_uid or user_b = v_uid) >= 30 then
    raise exception 'Daftar temanmu sudah penuh (maks 30).' using errcode = 'P0001';
  end if;
  if (select count(*) from public.friend_streaks where user_a = v_other or user_b = v_other) >= 30 then
    raise exception 'Daftar teman dia sudah penuh.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.friend_streaks
       where requested_by = v_uid and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'Terlalu banyak ajakan hari ini. Coba lagi besok.' using errcode = 'P0001';
  end if;

  insert into public.friend_streaks (user_a, user_b, requested_by) values (v_a, v_b, v_uid);
  return 'sent';
end;
$$;

-- Terima / tolak ajakan yang masuk.
create or replace function public.friend_streak_respond(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.friend_streaks%rowtype;
begin
  if v_uid is null then
    raise exception 'Harus login untuk Api Bareng.' using errcode = '42501';
  end if;
  select * into v_row from public.friend_streaks where id = p_id;
  if not found or v_row.status <> 'pending' or v_row.requested_by = v_uid
     or (v_row.user_a <> v_uid and v_row.user_b <> v_uid) then
    raise exception 'Ajakan tidak ditemukan.' using errcode = 'P0002';
  end if;
  if p_accept then
    update public.friend_streaks set status = 'active', accepted_at = now() where id = p_id;
    perform public.friend_advance_pairs(v_uid);
  else
    delete from public.friend_streaks where id = p_id;
  end if;
end;
$$;

-- Hapus teman / batalkan ajakan (salah satu anggota pasangan).
create or replace function public.friend_streak_remove(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Harus login untuk Api Bareng.' using errcode = '42501';
  end if;
  delete from public.friend_streaks where id = p_id and (user_a = v_uid or user_b = v_uid);
end;
$$;

-- Ingatkan teman yang hari ini belum menyalakan api. Maks 1x per teman per hari.
create or replace function public.friend_streak_nudge(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_today   date := public.friend_today();
  v_row     public.friend_streaks%rowtype;
  v_other   uuid;
  v_prev    date;
  v_done    date;
begin
  if v_uid is null then
    raise exception 'Harus login untuk Api Bareng.' using errcode = '42501';
  end if;
  select * into v_row from public.friend_streaks
   where id = p_id and status = 'active' and (user_a = v_uid or user_b = v_uid);
  if not found then
    raise exception 'Teman tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_row.user_a = v_uid then
    v_other := v_row.user_b; v_prev := v_row.b_nudged_on;
  else
    v_other := v_row.user_a; v_prev := v_row.a_nudged_on;
  end if;

  select last_done_day into v_done from public.friend_profiles where user_id = v_other;
  if v_done = v_today then
    raise exception 'Temanmu sudah menyalakan api hari ini.' using errcode = 'P0001';
  end if;
  if v_prev = v_today then
    raise exception 'Kamu sudah mengingatkan dia hari ini.' using errcode = 'P0001';
  end if;

  if v_row.user_a = v_uid then
    update public.friend_streaks set b_nudged_on = v_today where id = p_id;
  else
    update public.friend_streaks set a_nudged_on = v_today where id = p_id;
  end if;
end;
$$;

-- Semua data Api Bareng milik pemain, dari sudut pandangnya (JSON).
-- {today, my_code, me_done, friends: [{id, status, incoming, friend_name, friend_code, streak_days,
--   longest_streak, friend_done, nudged_me, i_nudged, at_risk}]}
-- streak_days sudah memperhitungkan api yang padam (hari terlewat => 0).
create or replace function public.my_friend_streaks(p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := public.friend_today();
  v_code  text;
  v_done  date;
  v_list  jsonb;
begin
  if v_uid is null then
    raise exception 'Harus login untuk Api Bareng.' using errcode = '42501';
  end if;
  v_code := public.mail_ensure_mailbox(v_uid);
  perform public.friend_touch_profile(v_uid, p_name);
  select last_done_day into v_done from public.friend_profiles where user_id = v_uid;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.status, x.streak_days desc, x.friend_name), '[]'::jsonb)
    into v_list
    from (
      select
        s.id,
        s.status,
        (s.status = 'pending' and s.requested_by <> v_uid) as incoming,
        coalesce(p.display_name, 'Pemain') as friend_name,
        m.address as friend_code,
        case when s.last_both_day >= v_today - 1 then s.streak_days else 0 end as streak_days,
        s.longest_streak,
        coalesce(p.last_done_day = v_today, false) as friend_done,
        coalesce((case when s.user_a = v_uid then s.a_nudged_on else s.b_nudged_on end) = v_today, false) as nudged_me,
        coalesce((case when s.user_a = v_uid then s.b_nudged_on else s.a_nudged_on end) = v_today, false) as i_nudged,
        (s.status = 'active' and s.last_both_day = v_today - 1) as at_risk
      from public.friend_streaks s
      join lateral (select case when s.user_a = v_uid then s.user_b else s.user_a end as other_id) o on true
      left join public.friend_profiles p on p.user_id = o.other_id
      left join public.mailboxes m on m.user_id = o.other_id
      where s.user_a = v_uid or s.user_b = v_uid
    ) x;

  return jsonb_build_object(
    'today', v_today,
    'my_code', v_code,
    'me_done', coalesce(v_done = v_today, false),
    'friends', v_list
  );
end;
$$;

revoke all on function public.friend_streak_checkin(text) from public, anon;
revoke all on function public.friend_streak_request(text, text) from public, anon;
revoke all on function public.friend_streak_respond(uuid, boolean) from public, anon;
revoke all on function public.friend_streak_remove(uuid) from public, anon;
revoke all on function public.friend_streak_nudge(uuid) from public, anon;
revoke all on function public.my_friend_streaks(text) from public, anon;
grant execute on function public.friend_streak_checkin(text) to authenticated;
grant execute on function public.friend_streak_request(text, text) to authenticated;
grant execute on function public.friend_streak_respond(uuid, boolean) to authenticated;
grant execute on function public.friend_streak_remove(uuid) to authenticated;
grant execute on function public.friend_streak_nudge(uuid) to authenticated;
grant execute on function public.my_friend_streaks(text) to authenticated;
