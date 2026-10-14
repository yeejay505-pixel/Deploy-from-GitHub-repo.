#!/bin/sh
set -eu

: "${TELEGRAM_API_ID:?TELEGRAM_API_ID is required}"
: "${TELEGRAM_API_HASH:?TELEGRAM_API_HASH is required}"

export TELEGRAM_WORK_DIR="${TELEGRAM_WORK_DIR:-/var/lib/telegram-bot-api}"
export TELEGRAM_TEMP_DIR="${TELEGRAM_TEMP_DIR:-/tmp/telegram-bot-api}"
export TELEGRAM_HTTP_PORT=8082
export TELEGRAM_LOCAL=1

mkdir -p "$TELEGRAM_WORK_DIR" "$TELEGRAM_TEMP_DIR" /run/nginx
chown -R telegram-bot-api:telegram-bot-api "$TELEGRAM_WORK_DIR" "$TELEGRAM_TEMP_DIR" /run/nginx

/docker-entrypoint.sh &
api_pid=$!

trap 'kill "$api_pid" 2>/dev/null || true; nginx -s quit 2>/dev/null || true' TERM INT

nginx -g 'daemon off;' &
nginx_pid=$!

wait -n "$api_pid" "$nginx_pid"
status=$?
kill "$api_pid" "$nginx_pid" 2>/dev/null || true
wait || true
exit "$status"
