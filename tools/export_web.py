"""Prépare les données de l'application web (web/data/*.json).

Usage : python3 tools/export_web.py <Airspaces.txt>
"""
import json
import re
import sys

import numpy as np
from shapely.geometry import Polygon

sys.path.insert(0, "tools")
import openair  # noqa: E402

COND = re.compile(r"notam|mon-fri|week|active by|\(\d|<|\btra\b|tsa|temporary|\bmil", re.I)


def classify(z):
    """Renvoie (type, conditionnel). Heuristique : le fichier ne distingue pas toujours CTR/TMA."""
    n, c, fl = z["name"], z["cls"], z["floor_ft"]
    cond = bool(COND.search(n))
    if "erogation" in z["country"] or "ZSM" in n:
        return "DEROG", False
    if c == "CTR" or re.search(r"\bCTR\b", n):
        return "CTR", False
    if c in ("A", "B", "C", "D", "SV"):
        if re.search(r"TMA|CTA", n, re.I) or c == "SV":
            return "TMA", False
        return ("CTR" if fl < 500 else "TMA"), False
    if c == "AWY":
        return "AWY", False
    if c in ("RMZ", "TMZ"):
        return "RMZ_TMZ", False
    if c in ("W", "GP"):
        return "PLANEUR", False
    if c == "P":
        if re.match(r"(LI-P|Parco|Riser|Monum|Oasi)", n, re.I):
            return "PARC", False
        if n.startswith(("LF-R", "LF-D")):
            return ("RESTREINT" if n.startswith("LF-R") else "DANGER"), cond
        return "INTERDIT", cond
    if c == "R":
        return "RESTREINT", cond
    if c == "Q":
        return "DANGER", cond
    return "AUTRE", cond


def main(air):
    # balises
    bs = json.load(open("data/uac_balises_2026.json"))
    out_b = []
    for b in bs:
        base = b["categories"]["AM"]["max"]
        out_b.append({"id": b["id"], "lat": round(b["latitude"], 5), "lon": round(b["longitude"], 5), "base": base,
                      "alt": b["altitude_ft"]})
    mult = {k: [v["name"], v["multiplier"]] for k, v in bs[0]["categories"].items()}
    json.dump({"beacons": out_b, "categories": mult, "home": {"id": "LFJY", "lat": 49.0139, "lon": 5.8764}},
              open("web/data/beacons.json", "w"), separators=(",", ":"), ensure_ascii=False)

    # espaces aériens
    zones = openair.parse(air)
    out = []
    for z in zones:
        t, cond = classify(z)
        ring = np.array(z["ring"])
        if len(ring) > 12:
            p = Polygon(ring)
            if not p.is_valid:
                p = p.buffer(0)
            ps = p.simplify(0.004, preserve_topology=True)
            if ps.is_empty or ps.geom_type != "Polygon":
                ps = p if p.geom_type == "Polygon" else None
            if ps is None:
                continue
            ring = np.array(ps.exterior.coords)
        flat = np.round(ring * 1000).astype(int).ravel().tolist()
        out.append({"t": t, "c": int(cond), "k": z["country"].strip(), "cl": z["cls"], "n": z["name"][:60],
                    "f": int(z["floor_ft"]), "h": int(min(z["ceil_ft"], 99999)), "r": flat})
    json.dump(out, open("web/data/airspaces.json", "w"), separators=(",", ":"), ensure_ascii=False)

    # vent climatologique (NASA POWER, 1-8 août 2016-2025, 50 m, km/h)
    w = np.load("data/wind_power.npz")
    data = w["data"][:, :, :8, :]
    ws = data[..., 0] * 3.6
    wd = np.radians(data[..., 1])
    u = (-ws * np.sin(wd)).mean((1, 2))
    v = (-ws * np.cos(wd)).mean((1, 2))
    speed = ws.mean((1, 2))
    json.dump({"lats": w["lats"].tolist(), "lons": w["lons"].tolist(), "u": np.round(u, 1).tolist(),
               "v": np.round(v, 1).tolist(), "speed": np.round(speed, 1).tolist(),
               "src": "NASA POWER MERRA-2, vent 50 m, moyenne 1-8 août 2016-2025"},
              open("web/data/wind.json", "w"), separators=(",", ":"))
    from collections import Counter
    print(len(out), "zones;", Counter((z["t"], z["c"]) for z in out).most_common())


if __name__ == "__main__":
    main(sys.argv[1])
