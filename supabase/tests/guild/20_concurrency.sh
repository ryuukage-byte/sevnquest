#!/usr/bin/env bash
# Uji konkurensi: memerlukan database yang sudah dimuat oleh run_local.sh (helper schema t).
# Hanya untuk database lokal guild_test* (penjaga yang sama dengan run_local.sh).
set -euo pipefail
dsn="${GUILD_TEST_DSN:?}"
db="$(psql "$dsn" -X -Atq -c 'select current_database()')"
[[ "$db" == guild_test* ]] || { echo "MENOLAK: '$db' bukan guild_test*" >&2; exit 2; }

q()  { psql "$dsn" -X -Atq -v ON_ERROR_STOP=1 -c "$1"; }
as() { # as <n> <sql>  -> jalankan sebagai pengguna n, keluaran bersih
  psql "$dsn" -X -Atq -c "select t.as_user($1)" -c "$2" 2>&1 | tail -n +2
}
fail() { echo "GAGAL: $*" >&2; exit 1; }
trap 'echo "GAGAL: skrip berhenti tak terduga di baris $LINENO" >&2' ERR
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

echo ">> A. balapan kapasitas (max_members=2, dua pengguna berebut satu kursi) x40"
for i in $(seq 1 40); do
  q "select t.reset()" >/dev/null
  as 1 "select public.guild_create('Race$i','')" >/dev/null
  q "update public.guilds set max_members = 2" >/dev/null
  code="$(q 'select invite_code from public.guilds')"
  ( as 2 "select public.guild_join('$code')->>'error'" > "$tmp/a2" ) &
  ( as 3 "select public.guild_join('$code')->>'error'" > "$tmp/a3" ) &
  wait
  members="$(q 'select count(*) from public.guild_members')"
  [[ "$members" == 2 ]] || fail "iterasi $i: anggota=$members (harus 2)"
  full="$(cat "$tmp/a2" "$tmp/a3" | grep -c guild_full || true)"
  [[ "$full" == 1 ]] || fail "iterasi $i: guild_full muncul $full kali (harus 1)"
done
echo "   ok"

echo ">> B. 10 get_my bersamaan pada data basi: tidak ada hitung ganda, tidak ada antrean x25"
for i in $(seq 1 25); do
  q "select t.reset()" >/dev/null
  as 1 "select public.guild_create('Sync$i','')" >/dev/null
  code="$(q 'select invite_code from public.guilds')"
  for n in $(seq 2 10); do as "$n" "select public.guild_join('$code')" >/dev/null; done
  for n in $(seq 1 10); do q "select t.score($n, t.wk(0), 100)" >/dev/null; done
  q "update public.guilds set last_synced_at = null" >/dev/null
  for n in $(seq 1 10); do
    ( as "$n" "select public.guild_get_my()->>'ok'" > "$tmp/b$n" ) &
  done
  wait
  for n in $(seq 1 10); do [[ "$(cat "$tmp/b$n")" == true ]] || fail "iterasi $i: get_my pengguna $n gagal: $(cat "$tmp/b$n")"; done
  q "update public.guilds set last_synced_at = null" >/dev/null
  as 1 "select public.guild_get_my()->>'ok'" >/dev/null
  total="$(q 'select coalesce(sum(points),0) from public.guild_weekly_contrib')"
  [[ "$total" == 1000 ]] || fail "iterasi $i: total=$total (harus tepat 1000)"
done
echo "   ok"

echo ">> C. campuran join/leave/kick/get_my/skor dari 8 pengguna selama ~8 detik: tanpa deadlock, invarian terjaga"
q "select t.reset()" >/dev/null
as 1 "select public.guild_create('Chaos','')" >/dev/null
worker() {
  local n="$1" end=$((SECONDS + 8)) op
  while (( SECONDS < end )); do
    op=$((RANDOM % 6))
    case "$op" in
      0) as "$n" "select public.guild_join((select invite_code from public.guilds order by created_at limit 1))" ;;
      1) as "$n" "select public.guild_leave()" ;;
      2) as "$n" "select public.guild_kick(t.uid($(( (RANDOM % 8) + 1 ))))" ;;
      3|4) as "$n" "select public.guild_get_my()->>'ok'" ;;
      5) q "select t.score($n, t.wk(0), $(( (RANDOM % 90) + 10 )))" ;;
    esac
  done
}
for n in $(seq 1 8); do ( worker "$n" > "$tmp/c$n.out" 2>&1 ) & done
wait
if grep -qi 'deadlock' "$tmp"/c*.out; then grep -i -m3 deadlock "$tmp"/c*.out; fail "deadlock terdeteksi"; fi
# Error SQL sungguhan dicetak psql sebagai "ERROR:  ..." (huruf kapital). Balasan RPC yang sah berupa JSON
# {"ok": false, "error": "..."} (huruf kecil) dan BUKAN kegagalan.
if grep -qE 'ERROR:' "$tmp"/c*.out; then grep -hE 'ERROR:' "$tmp"/c*.out | sort | uniq -c | head -5; fail "ada error SQL tak terduga"; fi
ops="$(cat "$tmp"/c*.out | grep -c . || true)"
[[ "$ops" -ge 50 ]] || fail "hanya $ops operasi terjadi; uji campuran tidak berarti"
echo "   ($ops operasi dijalankan)"
# Jika Guild bubar dan tersisa, tidak ada yang perlu diperiksa; selain itu jalankan semua invarian.
q "select t.invariants('konkurensi')" >/dev/null
echo "   ok"
echo "=== SEMUA UJI KONKURENSI LULUS ==="
