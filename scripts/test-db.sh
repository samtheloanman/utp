#!/usr/bin/env bash
# Disposable PostgreSQL 16 cluster for DB integrity tests (no Docker).
# Creates a temp cluster on a random free port, loads the Supabase auth shim,
# applies supabase/migrations/*.sql in order, runs vitest.db.config.ts, and
# always tears the cluster down.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
TMP="$(mktemp -d -t utp-testdb-XXXXXX)"
DATA="$TMP/data"
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"

AS=()
if [ "$(id -u)" = "0" ]; then
  chown postgres "$TMP"
  chmod 700 "$TMP"
  AS=(runuser -u postgres --)
fi

cleanup() {
  "${AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT INT TERM

"${AS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres -A trust --no-sync >"$TMP/initdb.log" 2>&1 \
  || { cat "$TMP/initdb.log"; exit 1; }
"${AS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -l "$TMP/pg.log" -w \
  -o "-p $PORT -k $TMP -c listen_addresses=127.0.0.1 -c max_connections=200 -c fsync=off" start >/dev/null \
  || { cat "$TMP/pg.log"; exit 1; }

export TEST_DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
PSQL=(psql "$TEST_DATABASE_URL" -X -q -v ON_ERROR_STOP=1)

echo "test-db: cluster on port $PORT"
"${PSQL[@]}" -f "$ROOT/supabase/test/auth-shim.sql"
for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  echo "test-db: applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

cd "$ROOT"
npx vitest run --config vitest.db.config.ts
