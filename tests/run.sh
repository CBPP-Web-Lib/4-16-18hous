#!/bin/bash
# Security regression test for webroot/old/image_proxy/get_stamen.php (C-009).
# Usage: tests/run.sh [server-snapshot-folder]
# Serves /old (snapshot as deployed) and /new (this repo) with php:8.3-apache on
# port 8114, each with a dummy api_key.php and one tile copied into the cache.
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="${1:-$HOME/apps-cbpp/apps.cbpp.org/4-16-18hous}"
PORT=8114
NAME=hous41618-test
WORK="$(mktemp -d)"
cleanup() { [ -n "${KEEP:-}" ] && return; docker rm -f $NAME >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT
TILE=9/111/210@2x.png
for v in old new; do
  mkdir -p "$WORK/www/$v/image_proxy/cache/9/111"
  printf '<?php $stamen_key = "test-not-a-real-key"; ?>' > "$WORK/www/$v/image_proxy/api_key.php"
  cp "$SNAP/image_proxy/cache/$TILE" "$WORK/www/$v/image_proxy/cache/$TILE"
done
cp "$SNAP/image_proxy/get_stamen.php" "$WORK/www/old/image_proxy/"
cp "$REPO/webroot/old/image_proxy/get_stamen.php" "$WORK/www/new/image_proxy/"
docker rm -f $NAME >/dev/null 2>&1
docker run -d --name $NAME -p $PORT:80 -v "$WORK/www:/var/www/html" php:8.3-apache \
  bash -c "cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini && chown -R www-data /var/www/html && apache2-foreground" >/dev/null
for i in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 1; done
B="http://localhost:$PORT"
REF="https://apps.cbpp.org/4-16-18hous/"
FAIL=0
check() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (got '$2', want '$3')"; FAIL=1; fi; }
dirs() { docker exec $NAME bash -c "find /var/www/html/$1/image_proxy/cache -mindepth 1 | wc -l"; }

# normal use: cached tile served unchanged, same as the old script
n="$(curl -s -e "$REF" "$B/new/image_proxy/get_stamen.php?z=9&x=111&y=210&r=2" | md5sum)"
o="$(curl -s -e "$REF" "$B/old/image_proxy/get_stamen.php?z=9&x=111&y=210&r=2" | md5sum)"
check "cached tile served" "$n" "$(md5sum < "$SNAP/image_proxy/cache/$TILE")"
check "same as old script" "$n" "$o"
check "content type" "$(curl -s -o /dev/null -w '%{content_type}' -e "$REF" "$B/new/image_proxy/get_stamen.php?z=9&x=111&y=210&r=2")" "image/png"
check "allowed origin echoed" "$(curl -s -D - -o /dev/null -e "$REF" -H 'Origin: https://apps.cbpp.org' "$B/new/image_proxy/get_stamen.php?z=9&x=111&y=210&r=2" | tr -d '\r' | grep -i '^access-control-allow-origin' )" "Access-Control-Allow-Origin: https://apps.cbpp.org"
check "other origin not reflected" "$(curl -s -D - -o /dev/null -e "$REF" -H 'Origin: https://evil.example' "$B/new/image_proxy/get_stamen.php?z=9&x=111&y=210&r=2" | tr -d '\r' | grep -i '^access-control-allow-origin' )" "Access-Control-Allow-Origin: https://www.cbpp.org"

# C-009: old script creates directories for any number, without a referer
before="$(dirs old)"
curl -s -o /dev/null "$B/old/image_proxy/get_stamen.php?z=31337&x=4242&y=1"
check "old script makes dirs (shows the bug)" "$(( $(dirs old) > before ))" 1
before="$(dirs new)"
curl -s -o /dev/null "$B/new/image_proxy/get_stamen.php?z=31337&x=4242&y=1"
curl -s -o /dev/null -e "$REF" "$B/new/image_proxy/get_stamen.php?z=31337&x=4242&y=1"
curl -s -o /dev/null -e "$REF" "$B/new/image_proxy/get_stamen.php?z=3&x=8&y=0"
curl -s -o /dev/null -e "$REF" "$B/new/image_proxy/get_stamen.php?z=3&x=-1&y=0"
curl -s -o /dev/null -e "$REF" "$B/new/image_proxy/get_stamen.php?z=3&x=1e1&y=0"
curl -s -o /dev/null "$B/new/image_proxy/get_stamen.php?z=3&x=1&y=1"
check "no dirs from bad or refererless requests" "$(dirs new)" "$before"
check "out of range -> 400" "$(curl -s -o /dev/null -w '%{http_code}' -e "$REF" "$B/new/image_proxy/get_stamen.php?z=3&x=8&y=0")" 400
check "no referer -> 403" "$(curl -s -o /dev/null -w '%{http_code}' "$B/new/image_proxy/get_stamen.php?z=9&x=111&y=210&r=2")" 403
# uncached tile: upstream rejects the dummy key, so nothing may be cached
check "upstream error -> 502" "$(curl -s -o /dev/null -w '%{http_code}' -e "$REF" "$B/new/image_proxy/get_stamen.php?z=3&x=1&y=1")" 502
check "upstream error not cached" "$(dirs new)" "$before"

[ $FAIL = 0 ] && echo "ALL PASSED" || { echo "SOME FAILED"; exit 1; }
