#!/usr/bin/env bash
# Uji migrasi Supabase di Postgres lokal (butuh PostgreSQL 15+ terpasang; tidak menyentuh proyek Supabase).
#   bash supabase/tests/run_local.sh
# Membuat database sementara di port 54329, menerapkan stub skema Supabase (auth, storage, peran) + semua migrasi,
# menerapkan ulang migrasi Toko (cek idempoten), lalu menjalankan tes SQL. Semua tes berjalan di dalam transaksi
# yang di-rollback.
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then chmod 755 "$DATA"; chown postgres "$DATA"; RUN_AS=(su postgres -c); fi
run() { if [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" "$*"; else bash -c "$*"; fi; }
run "$PGBIN/initdb -D $DATA -A trust -U postgres >/dev/null"
run "$PGBIN/pg_ctl -D $DATA -o '-p 54329 -k $DATA' -l $DATA/log -w start >/dev/null"
trap 'run "$PGBIN/pg_ctl -D $DATA -m fast stop >/dev/null" || true; rm -rf "$DATA"' EXIT

P=(psql -h "$DATA" -p 54329 -U postgres -v ON_ERROR_STOP=1 -q)
"${P[@]}" -c "create database t"
"${P[@]}" -d t -f supabase/tests/stub.sql >/dev/null
for f in supabase/migrations/*.sql; do "${P[@]}" -d t -f "$f" >/dev/null 2>&1 || { echo "Migrasi gagal: $f"; "${P[@]}" -d t -f "$f"; }; done
"${P[@]}" -d t -f supabase/migrations/20261127_store_packs.sql >/dev/null 2>&1
fail=0
for t in supabase/tests/*.test.sql; do
  out="$("${P[@]}" -d t -f "$t" -o /dev/null 2>&1)" || { echo "GAGAL $t"; echo "$out" | grep -v '^.*NOTICE:  ok:' | tail -5; fail=1; continue; }
  echo "lulus $t ($(echo "$out" | grep -c 'ok:') cek)"
done
exit $fail
