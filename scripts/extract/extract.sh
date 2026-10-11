#!/usr/bin/env bash
# Re-read recipes from the installed game into prisma/data/items.json. Reads the game folder only.
# Then load them with: pnpm db:seed
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
WORK="$HERE/work"
GAME_DATA="${GAME_DATA:-$HOME/.local/share/Steam/steamapps/common/The Planet Crafter/Planet Crafter_Data}"

mkdir -p "$WORK"
if [ ! -x "$WORK/venv/bin/python" ]; then
    uv venv -q "$WORK/venv"
    uv pip install -q -p "$WORK/venv/bin/python" UnityPy TypeTreeGeneratorAPI
fi

cd "$WORK"
"$WORK/venv/bin/python" -I "$HERE/dump.py" "$GAME_DATA" "$WORK/items.json"
"$WORK/venv/bin/python" -I "$HERE/loc.py" "$GAME_DATA" "$WORK/loc.txt"
"$WORK/venv/bin/python" -I "$HERE/build_data.py"
cp "$WORK/clean.json" "$REPO/prisma/data/items.json"
echo "Wrote $REPO/prisma/data/items.json"
