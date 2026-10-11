"""Read-only: dump every item/buildable and its recipe from the game's resources.assets to JSON."""
import sys, os, json, UnityPy, collections
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
data, out = sys.argv[1], sys.argv[2]
env = UnityPy.load(os.path.join(data, "resources.assets"))
gen = TypeTreeGenerator(env.objects[0].assets_file.unity_version)
gen.load_local_dll_folder(os.path.join(data, "Managed"))
names = {}; textassets = []
for obj in env.objects:
    if obj.type.name == "TextAsset":
        try:
            t = obj.read(); textassets.append((t.m_Name, len(t.m_Script)))
        except Exception: pass
    if obj.type.name != "MonoBehaviour": continue
    try: names[obj.path_id] = obj.read(check_read=False).m_Script.read().m_ClassName
    except Exception: pass
env.typetree_generator = gen
recs = {}
for obj in env.objects:
    s = names.get(obj.path_id)
    if s in ("GroupDataItem","GroupDataConstructible","PlanetData"):
        tt = obj.read_typetree(); tt["_class"] = s; recs[obj.path_id] = tt
idof = {pid: r.get("id", r.get("m_Name")) for pid, r in recs.items()}
items = []
for pid, r in recs.items():
    if r["_class"] == "PlanetData": continue
    ing = collections.Counter(idof.get(p["m_PathID"], f"?{p['m_PathID']}") for p in r["recipeIngredients"])
    keep = {k: r.get(k) for k in ("id","hideInCrafter","craftableInList","itemCategory","itemSubCategory","groupCategory","equipableType","usableType","unlockingWorldUnit","unlockingValue","cantBeRecycled")}
    keep.update({k: v for k, v in r.items() if k.startswith("unitGeneration")})
    keep["class"] = r["_class"]
    keep["recipe"] = dict(ing)
    keep["planets"] = [idof.get(p["m_PathID"], "?") for p in r.get("unlockInPlanets", [])]
    items.append(keep)
json.dump(items, open(out, "w"), indent=1)
print(len(items), "items;", sum(1 for r in recs.values() if r["_class"]=="PlanetData"), "planets")
print("textassets:", sorted(textassets, key=lambda x: -x[1])[:15])
