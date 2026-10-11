"""Read-only: extract the game's localization table (English names) to a text file."""
import sys, os, UnityPy
env = UnityPy.load(os.path.join(sys.argv[1], "resources.assets"))
for obj in env.objects:
    if obj.type.name == "TextAsset":
        t = obj.read()
        if t.m_Name == "LocalizationSpaceCrafter":
            open(sys.argv[2], "wb").write(t.m_Script.encode("utf-8", "surrogateescape") if isinstance(t.m_Script, str) else t.m_Script)
