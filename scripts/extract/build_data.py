"""Turn items.json + loc.txt (from dump.py / loc.py) into clean.json: English names, types, recipes."""
import json, collections, sys
it = {r["id"]: r for r in json.load(open("items.json"))}
loc = {}
for line in open("loc.txt", encoding="utf-8", errors="replace"):
    p = line.rstrip("\n").split("*")
    if len(p) > 2: loc.setdefault(p[0], p[2].strip())
GENERATES = ["Energy", "Oxygen", "Heat", "Pressure", "Plants", "Insects", "Animals", "Purification"]
CAT = {0:"Other",1:"Base Building",2:"Machine",3:"Screen",4:"Furniture",6:"Biomass",7:"Purification"}
used = collections.Counter(i for r in it.values() for i in r["recipe"])
rows = {}
for id_, r in it.items():
    has = bool(r["recipe"])
    if r["class"] == "GroupDataConstructible":
        if not has: continue
        typ = CAT.get(r["groupCategory"], "Other") if r["groupCategory"] else "Other Building"
    else:
        if id_.startswith("Blueprint"): continue   # blueprint chips, not real crafts
        if not has and not used[id_]:
            # Found, not crafted (fuses, eggs, seeds...): kept so a plan can list them as things to bring.
            # Left out: unnamed internal states, placed plants and hatched animals, cosmetic skins, currency.
            if not loc.get("GROUP_NAME_" + id_) or id_.endswith(("Growable", "Hatched")) \
                    or id_.startswith(("Skin-", "TerraTokens")):
                continue
            typ = "Not craftable"
        elif not has: typ = "Resource"
        elif r["itemCategory"] == 1: typ = "Equipment"
        elif used[id_]: typ = "Component"
        else: typ = "Item"
    name = loc.get("GROUP_NAME_" + id_) or id_
    # what a building produces in the terraformation (energy, oxygen, ...) doubles as its search categories
    cats = [c for c in GENERATES if (r.get("unitGeneration" + c) or 0) > 0]
    rows[id_] = dict(id=id_, name=name, type=typ, planet=",".join(r["planets"]), categories=cats, recipe=r["recipe"])
# ingredients referenced but not in rows
missing = {i for r in rows.values() for i in r["recipe"] if i not in rows}
print("missing ingredients:", missing)
dup = collections.Counter(r["name"] for r in rows.values())
for r in rows.values():
    if dup[r["name"]] > 1: r["name"] = f'{r["name"]} ({r["planet"] or r["id"]})'
dup2 = [n for n,c in collections.Counter(r["name"] for r in rows.values()).items() if c>1]
print("still dup:", dup2)
# cycle check
def visit(i, stack):
    if i in stack: return stack[stack.index(i):]+[i]
    for j in rows.get(i, {}).get("recipe", {}):
        c = visit(j, stack+[i])
        if c: return c
for i in rows:
    c = visit(i, [])
    if c: print("CYCLE", c); break
print(collections.Counter(r["type"] for r in rows.values()))
json.dump(list(rows.values()), open("clean.json","w"), indent=1, ensure_ascii=False)
