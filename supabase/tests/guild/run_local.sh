#!/usr/bin/env bash
# Menjalankan harness + migrasi draf + uji SQL (+ uji konkurensi) pada database SEKALI PAKAI.
# Menolak berjalan kecuali koneksi lokal (soket Unix / localhost) ke database bernama guild_test*.
#
# Pakai:
#   GUILD_TEST_DSN="host=/path/ke/soket dbname=guild_test_1" ./run_local.sh [--concurrency]
# Tidak ada kredensial Supabase yang dibaca atau dibutuhkan skrip ini.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dsn="${GUILD_TEST_DSN:?Set GUILD_TEST_DSN ke database lokal sekali pakai (nama harus guild_test*)}"

case "$dsn" in
  *supabase*|*pooler*|*amazonaws*|*aws-*) echo "MENOLAK: DSN terlihat seperti Supabase/awan." >&2; exit 2;;
esac
info="$(psql "$dsn" -X -Atq -F '|' -c "select current_database(), coalesce(host(inet_server_addr()), 'socket')")"
db="${info%%|*}"; addr="${info##*|}"
if [[ "$db" != guild_test* ]]; then echo "MENOLAK: database '$db' bukan guild_test*" >&2; exit 2; fi
if [[ "$addr" != socket && "$addr" != 127.0.0.1 && "$addr" != ::1 ]]; then echo "MENOLAK: server di $addr bukan lokal" >&2; exit 2; fi

run() { psql "$dsn" -X -q -v ON_ERROR_STOP=1 "$@"; }
echo ">> harness + migrasi draf + uji SQL pada '$db' ($addr)"
run -f "$here/00_local_harness.sql" \
    -f "$here/../../drafts/guild/20261009120000_guild_mvp.sql" \
    -f "$here/10_guild_tests.sql"

if [[ "${1:-}" == "--concurrency" ]]; then
  GUILD_TEST_DSN="$dsn" bash "$here/20_concurrency.sh"
fi
