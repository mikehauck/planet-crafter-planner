# Game data extraction

Reads items, buildables and recipes from the installed game's `resources.assets` and writes
`prisma/data/items.json`. Only that cleaned list is committed; the raw dumps stay in `work/` (git-ignored).

Needs `uv`. The first run creates `work/venv` with UnityPy and TypeTreeGeneratorAPI.

    bash scripts/extract/extract.sh
    pnpm db:seed -- --dry-run   # read the report: added, changed, restored, retired
    pnpm db:seed                # apply it
    pnpm verify                 # must print MATCH

The seed reconciles rather than reloading: items missing from the new file are marked retired, never deleted,
because saved plans point at them. A file with duplicate ids or names, unknown ingredients or a recipe loop is
rejected before anything is written.

| Script | Does |
|---|---|
| `dump.py` | Every item, buildable and recipe from `resources.assets` |
| `loc.py` | The game's English names |
| `build_data.py` | Merges them, assigns types, drops blueprint chips and uncraftable items |

Set `GAME_DATA` to point at a different `Planet Crafter_Data` folder.
First extracted 2026-10-11 (game data Unity 6000.3.2f1).
