-- =============================================================================
-- UJI GUILD -- HANYA UNTUK DATABASE SEKALI PAKAI (lihat 00_local_harness.sql untuk penjaga).
-- Dijalankan setelah harness + migrasi. Berhenti di kegagalan pertama (ON_ERROR_STOP).
-- Waktu dikunci lewat public._guild_now() agar hasil tidak bergantung jam sungguhan.
-- =============================================================================

create schema t;

create function t.uid(n int) returns uuid language plpgsql as $$
declare u uuid := ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid;
begin
  insert into auth.users (id) values (u) on conflict do nothing;
  insert into public.leaderboard (user_id, player_name) values (u::text, 'P' || n) on conflict do nothing;
  return u;
end $$;

create function t.as_user(n int) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', t.uid(n)::text, false); end $$;

create function t.anon() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', false); end $$;

-- Meniru submit_score_event_v2: naik saja.
create function t.score(n int, wk text, delta int) returns void language plpgsql as $$
begin
  insert into public.weekly_scores (user_id, week_id, score) values (t.uid(n)::text, wk, delta)
  on conflict (user_id, week_id) do update set score = public.weekly_scores.score + delta;
end $$;

-- Koreksi manual oleh admin (bisa menurunkan).
create function t.set_score(n int, wk text, val int) returns void language plpgsql as $$
begin
  insert into public.weekly_scores (user_id, week_id, score) values (t.uid(n)::text, wk, val)
  on conflict (user_id, week_id) do update set score = val;
end $$;

create function t.set_now(ts text) returns void language plpgsql as $$
begin
  execute format('create or replace function public._guild_now() returns timestamptz language sql stable as $f$ select %L::timestamptz $f$', ts);
end $$;

create function t.wk(off int default 0) returns text language sql as
$$ select public._guild_week_id(public._guild_now() + off * interval '7 days') $$;

create function t.gid(n int) returns uuid language sql as
$$ select guild_id from public.guild_members where user_id = t.uid(n) $$;

create function t.total(g uuid) returns bigint language sql as
$$ select coalesce(sum(points), 0) from public.guild_weekly_contrib where guild_id = g $$;

create function t.pts(g uuid, n int, w text) returns int language sql as
$$ select coalesce((select points from public.guild_weekly_contrib
                     where guild_id = g and user_id = t.uid(n) and week_id = w), 0) $$;

create function t.sync(g uuid) returns void language plpgsql as $$
begin perform 1 from public.guilds where id = g for update; perform public._guild_sync(g); end $$;

create function t.ok(r jsonb) returns boolean language sql as $$ select coalesce((r->>'ok')::boolean, false) $$;

create function t.expect(cond boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'GAGAL: %', msg; end if;
  raise notice 'ok   - %', msg;
end $$;

create function t.reset() returns void language plpgsql as $$
begin
  truncate public.guild_action_log, public.guild_weekly_goal, public.guild_weekly_contrib,
           public.guild_members, public.guilds, public.weekly_scores, public.leaderboard;
  delete from auth.users;
  perform t.set_now('2026-10-14 12:00:00+00');   -- Rabu, 2026-W42
  perform t.anon();
end $$;

-- Invarian yang harus benar setelah operasi apa pun.
create function t.invariants(label text) returns void language plpgsql as $$
declare v_cap int; n int;
begin
  select member_week_cap into v_cap from public._guild_params();
  select count(*) into n from public.guild_weekly_contrib where points > v_cap or points > synced_score;
  perform t.expect(n = 0, label || ': points <= cap dan points <= synced_score');
  select count(*) into n from public.guilds g where not exists (select 1 from public.guild_members m where m.guild_id = g.id);
  perform t.expect(n = 0, label || ': tidak ada Guild kosong');
  select count(*) into n from public.guilds g
    where (select count(*) from public.guild_members m where m.guild_id = g.id) > g.max_members;
  perform t.expect(n = 0, label || ': anggota <= max_members');
  -- Satu poin tidak pernah dikreditkan ke dua Guild: total kredit per (pengguna, minggu) <= skor sumber.
  select count(*) into n from (
    select c.user_id, c.week_id, sum(c.points) p
      from public.guild_weekly_contrib c where c.user_id is not null group by 1, 2) x
    join public.weekly_scores ws on ws.user_id = x.user_id::text and ws.week_id = x.week_id
   where x.p > ws.score;
  perform t.expect(n = 0, label || ': kredit per (pengguna, minggu) tidak melebihi skor sumber');
end $$;

-- ---------------------------------------------------------------------------
-- T0. Hak akses
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; bad int; tbl text; ok boolean;
begin
  perform t.reset();

  select count(*) into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname ~ '^_?guild'
     and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0);
  perform t.expect(bad = 0, 'tidak ada fungsi guild yang EXECUTE-nya terbuka untuk PUBLIC');

  select count(*) into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname ~ '^_?guild'
     and has_function_privilege('anon', p.oid, 'execute');
  perform t.expect(bad = 0, 'anon tidak bisa menjalankan fungsi guild apa pun');

  select count(*) into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname ~ '^_guild|^guild_(points|level)'
     and has_function_privilege('authenticated', p.oid, 'execute');
  perform t.expect(bad = 0, 'authenticated tidak bisa menjalankan fungsi internal');

  select count(*) into bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('guild_create','guild_preview','guild_join','guild_leave','guild_kick','guild_update','guild_rotate_code','guild_get_my')
     and not has_function_privilege('authenticated', p.oid, 'execute');
  perform t.expect(bad = 0, 'authenticated bisa menjalankan kedelapan RPC');

  foreach tbl in array array['guilds','guild_members','guild_weekly_contrib','guild_weekly_goal','guild_action_log'] loop
    perform t.expect(
      not has_table_privilege('anon', 'public.' || tbl, 'select,insert,update,delete')
      and not has_table_privilege('authenticated', 'public.' || tbl, 'select,insert,update,delete')
      and (select relrowsecurity from pg_class where oid = ('public.' || tbl)::regclass),
      'tabel ' || tbl || ': tanpa grant klien dan RLS aktif');
  end loop;

  begin
    perform public.guild_get_my();
    ok := false;
  exception when sqlstate '28000' then ok := true; end;
  perform t.expect(ok, 'tanpa sesi -> exception unauthenticated');

  -- Berjalan benar sebagai peran authenticated.
  perform t.as_user(1);
  set role authenticated;
  r := public.guild_get_my();
  reset role;
  perform t.expect(t.ok(r) and r->'guild' = 'null'::jsonb, 'authenticated tanpa Guild -> {ok:true, guild:null}');

  set role authenticated;
  begin perform 1 from public.guilds; ok := false; exception when insufficient_privilege then ok := true; end;
  reset role;
  perform t.expect(ok, 'authenticated tidak bisa SELECT guilds langsung');
end $$;

-- ---------------------------------------------------------------------------
-- T1. Membuat Guild, sanitasi, nama unik
-- ---------------------------------------------------------------------------
do $$
declare r jsonb;
begin
  perform t.reset();
  perform t.as_user(1);
  r := public.guild_create('  Alpha   Team<b> ', 'desc<script>');
  perform t.expect(t.ok(r), 'buat Guild berhasil');
  perform t.expect(r->'guild'->>'name' = 'Alpha Teamb', 'nama disanitasi (< > dibuang, spasi dirapikan)');
  perform t.expect(r->'guild'->>'description' = 'descscript', 'deskripsi disanitasi');
  perform t.expect(length(r->'guild'->>'invite_code') = 12, 'kode undangan 12 karakter, terlihat oleh owner');
  perform t.expect((r->'guild'->>'level')::int = 1 and (r->'guild'->>'total_points')::int = 0, 'Guild baru: level 1, 0 poin');
  perform t.expect((r->'week'->>'target')::int = 150, 'target minggu pertama = 1 anggota x 150');

  r := public.guild_create('Lain Lagi', '');
  perform t.expect(r->>'error' = 'already_in_guild', 'pengguna yang sudah di Guild tidak bisa membuat lagi');

  perform t.as_user(2);
  r := public.guild_create('ALPHA TEAMB', '');
  perform t.expect(r->>'error' = 'name_taken', 'nama kembar (beda huruf besar-kecil) ditolak');
  r := public.guild_create('ab', '');
  perform t.expect(r->>'error' = 'invalid_name', 'nama < 3 karakter ditolak');
  r := public.guild_create('Beta', '');
  perform t.expect(t.ok(r), 'Guild kedua dengan nama lain berhasil');

  perform t.as_user(2);
  r := public.guild_create('Gamma', '');
  perform t.expect(r->>'error' = 'rate_limited', 'buat Guild dibatasi 3 percobaan per jam');
  perform t.invariants('T1');
end $$;

-- ---------------------------------------------------------------------------
-- T2. Baseline, delta, idempotensi
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; w text;
begin
  perform t.reset(); w := t.wk(0);
  perform t.score(1, w, 100);                       -- sudah punya 100 poin SEBELUM membuat Guild
  perform t.as_user(1);
  r := public.guild_create('Baseline', '');
  g := t.gid(1);
  perform t.sync(g);
  perform t.expect(t.total(g) = 0, 'skor sebelum bergabung tidak dikreditkan (baseline)');
  perform t.score(1, w, 60);
  perform t.sync(g);
  perform t.expect(t.total(g) = 60, 'hanya selisih setelah bergabung yang dikreditkan (60)');
  perform t.sync(g); perform t.sync(g);
  perform t.expect(t.total(g) = 60, 'sinkron berulang idempoten');
  perform t.invariants('T2');
end $$;

-- ---------------------------------------------------------------------------
-- T3. Cap per anggota per minggu; kursor tetap maju
-- ---------------------------------------------------------------------------
do $$
declare g uuid; w text;
begin
  perform t.reset(); w := t.wk(0);
  perform t.as_user(1); perform public.guild_create('Cap', '');
  g := t.gid(1);
  perform t.score(1, w, 5000);
  perform t.sync(g);
  perform t.expect(t.pts(g, 1, w) = 2000, 'kredit dipotong di cap 2.000');
  perform t.score(1, w, 100);
  perform t.sync(g);
  perform t.expect(t.pts(g, 1, w) = 2000, 'setelah cap, tambahan tidak dikreditkan');
  perform t.expect((select synced_score from public.guild_weekly_contrib where guild_id = g and user_id = t.uid(1) and week_id = w) = 5100,
                   'kursor tetap maju walau di atas cap (kelebihan dibuang, bukan ditunda)');
  perform t.invariants('T3');
end $$;

-- ---------------------------------------------------------------------------
-- T4. Keluar lalu bergabung lagi (Guild yang sama, minggu yang sama)
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; w text; code text;
begin
  perform t.reset(); w := t.wk(0);
  perform t.as_user(1); r := public.guild_create('Rejoin', ''); code := r->'guild'->>'invite_code'; g := t.gid(1);
  perform t.as_user(2); r := public.guild_join(code);
  perform t.expect(t.ok(r), 'anggota bergabung dengan kode');
  perform t.score(2, w, 300); perform t.sync(g);
  perform t.expect(t.pts(g, 2, w) = 300, 'kontribusi 300');
  perform t.score(2, w, 50);
  r := public.guild_leave();                           -- harus menyinkron sebelum pergi
  perform t.expect(t.ok(r) and t.pts(g, 2, w) = 350, 'keluar menyinkron dulu: 350 tercatat');
  perform t.expect(t.gid(2) is null, 'anggota sudah tidak di Guild');
  perform t.score(2, w, 80);                           -- didapat saat di luar Guild
  r := public.guild_join(code);
  perform t.sync(g);
  perform t.expect(t.pts(g, 2, w) = 350, 'poin yang didapat saat di luar Guild tidak dikreditkan saat gabung ulang');
  perform t.score(2, w, 20); perform t.sync(g);
  perform t.expect(t.pts(g, 2, w) = 370, 'setelah gabung ulang, selisih baru dikreditkan (370)');
  perform t.score(2, w, 5000); perform t.sync(g);
  perform t.expect(t.pts(g, 2, w) = 2000, 'cap berlaku');
  perform t.as_user(2); perform public.guild_leave();
  perform t.score(2, w, 500);
  perform public.guild_join(code); perform t.sync(g);
  perform t.expect(t.pts(g, 2, w) = 2000, 'keluar-masuk tidak mereset cap mingguan');
  perform t.invariants('T4');
end $$;

-- ---------------------------------------------------------------------------
-- T5. Pindah Guild pada minggu yang sama: poin tidak dikreditkan dua kali
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; a uuid; b uuid; w text; code text;
begin
  perform t.reset(); w := t.wk(0);
  perform t.as_user(1); r := public.guild_create('GuildA', ''); code := r->'guild'->>'invite_code'; a := t.gid(1);
  perform t.as_user(3); perform public.guild_join(code);
  perform t.score(3, w, 100);
  perform public.guild_leave();
  perform t.expect(t.pts(a, 3, w) = 100, 'A mencatat 100 saat pengguna 3 pergi');
  r := public.guild_create('GuildB', ''); b := t.gid(3);
  perform t.sync(b);
  perform t.expect(t.total(b) = 0, 'B mulai dari baseline 100 -> 0 poin');
  perform t.score(3, w, 40); perform t.sync(b);
  perform t.expect(t.total(b) = 40 and t.total(a) = 100, 'B = 40, A tetap 100 (total 140 = skor nyata)');
  perform t.invariants('T5');
end $$;

-- ---------------------------------------------------------------------------
-- T6. Jeda beberapa minggu: tiap minggu dikreditkan ke minggu aslinya
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; code text; n int;
begin
  perform t.reset();
  perform t.as_user(1); r := public.guild_create('Gap', ''); code := r->'guild'->>'invite_code'; g := t.gid(1);
  perform t.as_user(4); perform public.guild_join(code);
  update public.guild_members set settled_week = t.wk(-3) where user_id = t.uid(4);
  perform t.score(4, t.wk(-3), 200);
  perform t.score(4, t.wk(-2), 3000);
  perform t.score(4, t.wk(-1), 50);
  perform t.score(4, t.wk(0), 70);
  perform t.sync(g);
  perform t.expect(t.pts(g, 4, t.wk(-3)) = 200, 'minggu -3 -> 200');
  perform t.expect(t.pts(g, 4, t.wk(-2)) = 2000, 'minggu -2 -> dipotong cap 2.000');
  perform t.expect(t.pts(g, 4, t.wk(-1)) = 50, 'minggu -1 -> 50');
  perform t.expect(t.pts(g, 4, t.wk(0)) = 70, 'minggu ini -> 70');
  perform t.expect(t.total(g) = 2320, 'total = 2.320');
  select count(*) into n from public.guild_weekly_goal where guild_id = g and week_id in (t.wk(-3), t.wk(-2), t.wk(-1), t.wk(0));
  perform t.expect(n = 4, 'baris target dibuat untuk tiap minggu yang tersentuh');
  perform t.expect((select settled_week from public.guild_members where user_id = t.uid(4)) = t.wk(0), 'settled_week maju ke minggu ini SETELAH semua minggu diproses');
  perform t.sync(g);
  perform t.expect(t.total(g) = 2320, 'sinkron ulang tidak mengubah apa pun');
  perform t.invariants('T6');
end $$;

-- ---------------------------------------------------------------------------
-- T7. Pergantian minggu (jendela 5 menit)
-- ---------------------------------------------------------------------------
do $$
declare g uuid;
begin
  perform t.reset();
  perform t.set_now('2026-10-11 23:00:00+00');           -- Minggu malam, 2026-W41
  perform t.as_user(1); perform public.guild_create('Rollover', ''); g := t.gid(1);
  perform t.score(1, '2026-W41', 100);

  perform t.set_now('2026-10-12 00:02:00+00');           -- Senin 00:02, W42
  perform t.sync(g);
  perform t.expect(t.pts(g, 1, '2026-W41') = 100, 'W41 dikreditkan ke W41 meski sinkron terjadi di W42');
  perform t.expect((select settled_week from public.guild_members where user_id = t.uid(1)) = '2026-W41',
                   '2 menit setelah pergantian: W41 belum dianggap final');
  perform t.score(1, '2026-W41', 50);                    -- transaksi v2 yang commit tepat di batas
  perform t.set_now('2026-10-12 00:04:00+00'); perform t.sync(g);
  perform t.expect(t.pts(g, 1, '2026-W41') = 150, 'penulisan telat di batas minggu masih terkredit');
  perform t.set_now('2026-10-12 00:06:00+00'); perform t.sync(g);
  perform t.expect((select settled_week from public.guild_members where user_id = t.uid(1)) = '2026-W42', '6 menit setelah pergantian: W41 final');
  perform t.score(1, '2026-W41', 10);                    -- tidak mungkin terjadi di produksi (v2 menulis minggu sekarang)
  perform t.sync(g);
  perform t.expect(t.pts(g, 1, '2026-W41') = 150, 'setelah final, W41 tidak dibaca lagi');
  perform t.invariants('T7');
end $$;

-- ---------------------------------------------------------------------------
-- T8. Kapasitas
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; code text;
begin
  perform t.reset();
  perform t.as_user(1); r := public.guild_create('Kecil', ''); code := r->'guild'->>'invite_code';
  update public.guilds set max_members = 2;
  perform t.as_user(2); r := public.guild_join(code);
  perform t.expect(t.ok(r) and (r->'guild'->>'member_count')::int = 2, 'anggota ke-2 masuk');
  perform t.as_user(3); r := public.guild_join(code);
  perform t.expect(r->>'error' = 'guild_full', 'anggota ke-3 ditolak: guild_full');
  perform t.as_user(2); r := public.guild_join(code);
  perform t.expect(r->>'error' = 'already_in_guild', 'gabung dua kali ditolak');
  perform t.expect(r->'guild' is null, 'respons error tidak membawa data Guild');
  perform t.as_user(3);
  perform t.expect(public.guild_join('bukan-kode')->>'error' = 'invalid_code', 'kode salah -> invalid_code');
  perform t.invariants('T8');
end $$;

-- ---------------------------------------------------------------------------
-- T9. Owner keluar -> kepemilikan pindah; anggota terakhir keluar -> Guild bubar
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; code text; n int;
begin
  perform t.reset();
  perform t.as_user(1); r := public.guild_create('Estafet', ''); code := r->'guild'->>'invite_code'; g := t.gid(1);
  perform t.as_user(2); perform public.guild_join(code);
  perform t.as_user(3); perform public.guild_join(code);
  perform t.score(2, t.wk(0), 10); perform t.sync(g);
  perform t.as_user(1); r := public.guild_leave();
  perform t.expect(t.ok(r) and (r->>'disbanded')::boolean = false, 'owner keluar, Guild tetap ada');
  perform t.expect((select owner_id from public.guilds where id = g) = t.uid(2), 'owner pindah ke anggota tertua (ties -> user_id terkecil)');
  perform t.expect(t.total(g) = 10, 'kontribusi tetap milik Guild');
  perform t.as_user(2); perform public.guild_leave();
  perform t.as_user(3); r := public.guild_leave();
  perform t.expect((r->>'disbanded')::boolean, 'anggota terakhir keluar -> bubar');
  select count(*) into n from public.guild_weekly_contrib; perform t.expect(n = 0, 'kontribusi ikut terhapus saat bubar');
  select count(*) into n from public.guild_weekly_goal;    perform t.expect(n = 0, 'target ikut terhapus saat bubar');
  perform t.expect(public.guild_leave()->>'error' = 'not_in_guild', 'keluar tanpa Guild -> not_in_guild');
  perform t.invariants('T9');
end $$;

-- ---------------------------------------------------------------------------
-- T10. Kick
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; code text;
begin
  perform t.reset();
  perform t.as_user(1); r := public.guild_create('Kick', ''); code := r->'guild'->>'invite_code'; g := t.gid(1);
  perform t.as_user(2); perform public.guild_join(code);
  perform t.as_user(3); perform public.guild_join(code);
  perform t.score(2, t.wk(0), 40);                        -- belum tersinkron
  perform t.as_user(3);
  perform t.expect(public.guild_kick(t.uid(2))->>'error' = 'not_owner', 'non-owner tidak bisa kick');
  perform t.as_user(1);
  perform t.expect(public.guild_kick(t.uid(1))->>'error' = 'cannot_kick_self', 'owner tidak bisa kick diri sendiri');
  perform t.expect(public.guild_kick(t.uid(99))->>'error' = 'not_found', 'kick non-anggota -> not_found');
  r := public.guild_kick(t.uid(2));
  perform t.expect(t.ok(r) and t.gid(2) is null, 'kick berhasil');
  perform t.expect(t.pts(g, 2, t.wk(0)) = 40, 'poin anggota yang di-kick dikreditkan SEBELUM dikeluarkan');
  perform t.invariants('T10');
end $$;

-- ---------------------------------------------------------------------------
-- T11. Throttle tidak ikut di-rollback saat kode salah
-- ---------------------------------------------------------------------------
do $$
declare i int; last jsonb; n int;
begin
  perform t.reset();
  perform t.as_user(1);
  for i in 1..10 loop
    last := public.guild_join('AAAAAAAAAAAA');
    perform t.expect(last->>'error' = 'invalid_code', 'percobaan ' || i || ': invalid_code (dikembalikan, bukan exception)');
  end loop;
  last := public.guild_join('AAAAAAAAAAAA');
  perform t.expect(last->>'error' = 'rate_limited', 'percobaan ke-11 dibatasi');
  select count(*) into n from public.guild_action_log where user_id = t.uid(1) and action = 'join';
  perform t.expect(n = 10, 'sepuluh baris throttle tersimpan');
end $$;

-- ---------------------------------------------------------------------------
-- T12. Target mingguan: peak hanya naik, achieved_at tidak dicabut
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; code text; w text; peak int; ach timestamptz;
begin
  perform t.reset(); w := t.wk(0);
  perform t.as_user(1); r := public.guild_create('Target', ''); code := r->'guild'->>'invite_code'; g := t.gid(1);
  perform t.as_user(2); perform public.guild_join(code);
  perform t.score(1, w, 200); perform t.score(2, w, 99);
  perform t.sync(g);
  perform t.as_user(1); r := public.guild_get_my();
  perform t.expect((r->'week'->>'target')::int = 300 and (r->'week'->>'progress')::int = 299, 'target 300 (2 x 150), progres 299');
  perform t.expect(not (r->'week'->>'achieved')::boolean, 'belum tercapai di 299');
  perform t.score(2, w, 1); perform t.sync(g);
  select achieved_at into ach from public.guild_weekly_goal where guild_id = g and week_id = w;
  perform t.expect(ach is not null, 'tercapai di 300 -> achieved_at terisi');
  perform t.as_user(3); perform public.guild_join(code);
  select peak_members into peak from public.guild_weekly_goal where guild_id = g and week_id = w;
  perform t.expect(peak = 3, 'anggota baru menaikkan peak ke 3');
  perform t.expect((select achieved_at from public.guild_weekly_goal where guild_id = g and week_id = w) = ach, 'achieved_at tidak dicabut saat target naik');
  perform public.guild_leave();
  select peak_members into peak from public.guild_weekly_goal where guild_id = g and week_id = w;
  perform t.expect(peak = 3, 'peak tidak turun saat anggota keluar');
  perform t.invariants('T12');
end $$;

-- ---------------------------------------------------------------------------
-- T13. Hapus akun: poin tetap milik Guild; owner yatim dipromosikan
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; code text; w text;
begin
  perform t.reset(); w := t.wk(0);
  perform t.as_user(1); r := public.guild_create('Hapus', ''); code := r->'guild'->>'invite_code'; g := t.gid(1);
  perform t.as_user(2); perform public.guild_join(code);
  perform t.as_user(3); perform public.guild_join(code);
  perform t.score(1, w, 100); perform t.score(2, w, 100); perform t.score(3, w, 100);
  perform t.sync(g);
  perform t.expect(t.total(g) = 300, 'total 300 sebelum penghapusan');
  delete from auth.users where id = t.uid(2);
  perform t.expect(t.gid(2) is null, 'keanggotaan terhapus (cascade)');
  perform t.expect(t.total(g) = 300, 'poin anggota yang akunnya dihapus tetap milik Guild');
  perform t.expect((select count(*) from public.guild_weekly_contrib where guild_id = g and user_id is null) = 1, 'user_id kontribusi menjadi NULL');
  delete from auth.users where id = t.uid(1);            -- owner
  perform t.expect((select owner_id from public.guilds where id = g) is null, 'owner terhapus -> owner_id NULL');
  perform t.sync(g);
  perform t.expect((select owner_id from public.guilds where id = g) = t.uid(3), 'sinkron mempromosikan anggota tersisa');
  perform t.expect(t.total(g) = 300, 'total tetap 300');
  perform t.invariants('T13');
end $$;

-- ---------------------------------------------------------------------------
-- T14. Skor sumber dikoreksi turun: tidak pernah mengkredit berlebih
-- ---------------------------------------------------------------------------
do $$
declare g uuid; w text;
begin
  perform t.reset(); w := t.wk(0);
  perform t.as_user(1); perform public.guild_create('Koreksi', ''); g := t.gid(1);
  perform t.set_score(1, w, 500); perform t.sync(g);
  perform t.expect(t.total(g) = 500, 'dikreditkan 500');
  perform t.set_score(1, w, 300); perform t.sync(g);
  perform t.expect(t.total(g) = 500, 'skor turun -> tidak ada pengurangan, kursor tidak turun');
  perform t.set_score(1, w, 450); perform t.sync(g);
  perform t.expect(t.total(g) = 500, 'naik lagi tapi < kursor -> tidak ada kredit ganda');
  perform t.set_score(1, w, 600); perform t.sync(g);
  perform t.expect(t.total(g) = 600, 'melewati kursor -> hanya selisih 100 yang dikreditkan');
  perform t.invariants('T14');
end $$;

-- ---------------------------------------------------------------------------
-- T15. guild_get_my: throttle sinkron, kode undangan hanya untuk owner, urutan anggota
-- ---------------------------------------------------------------------------
do $$
declare r jsonb; g uuid; code text; w text;
begin
  perform t.reset(); w := t.wk(0);
  perform t.as_user(1); r := public.guild_create('Layar', ''); code := r->'guild'->>'invite_code'; g := t.gid(1);
  perform t.as_user(2); perform public.guild_join(code);
  perform t.score(1, w, 30); perform t.score(2, w, 70);
  perform t.as_user(1); r := public.guild_get_my();
  perform t.expect((r->'guild'->>'total_points')::int = 100, 'get_my menyinkron saat data basi (100)');
  perform t.expect(r->'members'->0->>'user_id' = t.uid(2)::text, 'anggota diurut dari kontribusi terbesar');
  perform t.expect((r->'members'->0->>'week_points')::int = 70, 'week_points anggota teratas = 70');
  perform t.score(1, w, 20);
  r := public.guild_get_my();
  perform t.expect((r->'guild'->>'total_points')::int = 100, 'get_my kedua dalam <30 detik tidak menyinkron ulang');
  update public.guilds set last_synced_at = null;
  r := public.guild_get_my();
  perform t.expect((r->'guild'->>'total_points')::int = 120, 'setelah basi, tersinkron (120)');
  perform t.expect(r->'guild'->>'invite_code' is not null, 'owner melihat kode undangan');
  perform t.as_user(2); r := public.guild_get_my();
  perform t.expect(r->'guild'->>'invite_code' is null and not (r->'guild'->>'is_owner')::boolean, 'anggota biasa tidak melihat kode undangan');
  perform t.as_user(1);
  r := public.guild_rotate_code();
  perform t.expect(t.ok(r) and r->>'invite_code' <> code, 'owner dapat memutar kode');
  perform t.as_user(3);
  perform t.expect(public.guild_join(code)->>'error' = 'invalid_code', 'kode lama tidak berlaku lagi');
  perform t.as_user(2);
  perform t.expect(public.guild_rotate_code()->>'error' = 'not_owner', 'non-owner tidak bisa memutar kode');
  perform t.expect(public.guild_update('x')->>'error' = 'not_owner', 'non-owner tidak bisa mengubah deskripsi');
  perform t.as_user(1);
  perform t.expect(public.guild_update('Belajar bareng<>')->'guild'->>'description' = 'Belajar bareng', 'owner mengubah deskripsi (disanitasi)');
  perform t.expect(public.guild_preview(r->>'invite_code')->>'name' = 'Layar', 'pratinjau tidak butuh jadi anggota dan tidak membuka anggota');
  perform t.expect(public.guild_preview('XXXX')->>'error' = 'invalid_code', 'pratinjau kode salah');
  perform t.invariants('T15');
end $$;

-- ---------------------------------------------------------------------------
-- T16. Fungsi level konsisten
-- ---------------------------------------------------------------------------
do $$
declare n int; bad int := 0;
begin
  for n in 1..80 loop
    if public.guild_level_for_points(public.guild_points_for_level(n)) <> n then bad := bad + 1; end if;
    if n > 1 and public.guild_level_for_points(public.guild_points_for_level(n) - 1) <> n - 1 then bad := bad + 1; end if;
  end loop;
  perform t.expect(bad = 0, 'level_for_points dan points_for_level saling konsisten (n = 1..80)');
  perform t.expect(public.guild_level_for_points(-5) = 1 and public.guild_level_for_points(1999) = 1 and public.guild_level_for_points(2000) = 2,
                   'batas level: 1999 -> L1, 2000 -> L2');
end $$;

create or replace function public._guild_now() returns timestamptz language sql stable as $$ select now() $$;
\echo '=== SEMUA UJI SQL LULUS ==='
