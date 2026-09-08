#!/bin/sh
# Compatibility entry point; Node 24 + pnpm replace Python, sqlite3 and tile-join.
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ "$#" -gt 0 ]; then
  exec pnpm --dir "$SCRIPT_DIR/.." run tiles:refresh --date "$1"
fi
exec pnpm --dir "$SCRIPT_DIR/.." run tiles:refresh
