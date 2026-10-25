"""Optimiseur de parcours v2 : recuit simulé multi-graines sur le graphe de tronçons (espaces aériens inclus)
avec vent climatologique moyen (NASA POWER, 1-8 août 2016-2025) et temps de vol orientés.

Usage : python3 tools/optimize.py <heures_de_vol> [--nowind] [--tas 100] [--windfactor 1.25]
"""
import argparse
import json
import math
import pickle
import random
import sys
from multiprocessing import Pool

import numpy as np
from scipy.spatial import cKDTree

sys.path.insert(0, "tools")
from grid import laea  # noqa: E402

TH = np.array([0.1, 0.25, 0.5, 1.0, 5.0, 25.0])
PCT = np.array([1.0, 0.95, 0.90, 0.80, 0.65, 0.40, 0.0])

beacons = json.load(open("data/uac_balises_2026.json"))
NB = len(beacons)
HOME = NB
VAL = np.array([b["categories"]["AT"]["max"] for b in beacons], float)
Z = np.load("data/legs.npz")
D, M, X = Z["D"], Z["M"], Z["X"]
np.fill_diagonal(D, 0)
PATHS = pickle.load(open("data/legs_paths.pkl", "rb"))


def wind_field(factor):
    w = np.load("data/wind_power.npz")
    data, lats, lons = w["data"], w["lats"], w["lons"]
    ws = data[:, :, :8, 0] * 3.6 * factor  # km/h, 1-8 août
    wd = np.radians(data[:, :, :8, 1])
    u = (-ws * np.sin(wd)).mean((1, 2))  # vers l'est
    v = (-ws * np.cos(wd)).mean((1, 2))  # vers le nord
    gl, go = np.meshgrid(lats, lons, indexing="ij")
    gx, gy = laea(gl.ravel(), go.ravel())
    return cKDTree(np.c_[gx, gy]), u, v


def build_times(tas, nowind, factor):
    T = np.where(np.isfinite(D), D / tas, np.inf)
    if nowind:
        return T
    tree, u, v = wind_field(factor)
    for (a, b), pts in PATHS.items():
        pts = pts.astype(float)
        mid = (pts[:-1] + pts[1:]) / 2
        seg = np.diff(pts, axis=0)
        ln = np.hypot(seg[:, 0], seg[:, 1])
        ok = ln > 1e-6
        mid, seg, ln = mid[ok], seg[ok], ln[ok]
        h = seg / ln[:, None]
        _, k = tree.query(mid)
        for (aa, bb, s) in ((a, b, 1.0), (b, a, -1.0)):
            hh = h * s
            par = u[k] * hh[:, 0] + v[k] * hh[:, 1]
            perp = np.abs(u[k] * hh[:, 1] - v[k] * hh[:, 0])
            gs = par + np.sqrt(np.maximum(tas ** 2 - perp ** 2, 1.0))
            T[aa, bb] = (ln / np.maximum(gs, 20.0)).sum()
    return T


def evaluate(route, T):
    pts = [HOME] + route + [HOME]
    a, b = np.array(pts[:-1]), np.array(pts[1:])
    t = T[a, b].sum()
    dm = M[a, b].min(0)
    pct = PCT[np.searchsorted(TH, dm)]
    # sans détour dédié, pas de crédit au-delà de 65 % pour une balise non visée
    wp = np.zeros(NB, bool)
    wp[route] = True
    pct = np.where(wp, pct, np.minimum(pct, 0.65))
    return float((pct * VAL).sum()), float(t)


def anneal(args):
    budget, seed, iters, T = args
    rng = random.Random(seed)
    route = []
    cur, _ = evaluate(route, T)
    best = (0.0, [])
    T0 = 250.0
    for k in range(iters):
        temp = T0 * (1 - k / iters) ** 2 + 1
        new = route[:]
        r = rng.random()
        if r < 0.3 or not new:
            c = rng.randrange(NB)
            if c in new:
                continue
            new.insert(rng.randrange(len(new) + 1), c)
        elif r < 0.45:
            new.pop(rng.randrange(len(new)))
        elif r < 0.6 and len(new) > 1:
            i, j = rng.randrange(len(new)), rng.randrange(len(new))
            new[i], new[j] = new[j], new[i]
        elif r < 0.8 and len(new) > 1:
            i, j = sorted(rng.sample(range(len(new)), 2))
            new[i:j + 1] = reversed(new[i:j + 1])
        elif len(new) > 1:  # or-opt : déplace un segment
            i = rng.randrange(len(new))
            seg = new[i:i + rng.randint(1, 3)]
            del new[i:i + len(seg)]
            j = rng.randrange(len(new) + 1)
            new[j:j] = seg
        else:
            continue
        s, t = evaluate(new, T)
        if t > budget:
            continue
        if s >= cur or rng.random() < math.exp((s - cur) / temp):
            route, cur = new, s
            if s > best[0]:
                best = (s, new[:])
    return best


def polish(route, budget, T):
    best, _ = evaluate(route, T)
    improved = True
    while improved:
        improved = False
        for c in range(NB):
            if c in route:
                continue
            for pos in range(len(route) + 1):
                new = route[:pos] + [c] + route[pos:]
                s, t = evaluate(new, T)
                if t <= budget and s > best:
                    best, route, improved = s, new, True
                    break
        for i in range(len(route)):
            new = route[:i] + route[i + 1:]
            s, t = evaluate(new, T)
            if s > best:
                best, route, improved = s, new, True
                break
    return best, route


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("hours", type=float)
    ap.add_argument("--nowind", action="store_true")
    ap.add_argument("--tas", type=float, default=100.0)
    ap.add_argument("--windfactor", type=float, default=1.25)
    ap.add_argument("--iters", type=int, default=600000)
    ap.add_argument("--seeds", type=int, default=8)
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    T = build_times(a.tas, a.nowind, a.windfactor)
    with Pool(4) as p:
        res = p.map(anneal, [(a.hours, 100 + s, a.iters, T) for s in range(a.seeds)])
    scores = sorted(r[0] for r in res)
    s, route = polish(max(res)[1], a.hours, T)
    sc, t = evaluate(route, T)
    pts = [HOME] + route + [HOME]
    legs = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    km = sum(D[x, y] for x, y in legs)
    expo = sum(X[x, y] for x, y in legs)
    print(f"{a.hours:.0f} h {'sans vent' if a.nowind else 'vent moyen'} : {sc:.0f} pts | {t:.1f} h | {km:.0f} km | "
          f"{len(route)} balises visées | scores des graines: {[int(x) for x in scores]}")
    print("km par catégorie d'espace aérien [libre, cond., restr., contrôlé, interdit]:", expo.round(0).tolist())
    ids = lambda n: "LFJY" if n == HOME else beacons[n]["id"]  # noqa: E731
    print(" -> ".join(ids(n) for n in pts))
    if a.out:
        json.dump({"hours": a.hours, "score": sc, "time_h": t, "km": km, "route": [ids(n) for n in pts],
                   "legs": [{"from": ids(x), "to": ids(y), "km": float(D[x, y]), "h": float(T[x, y]),
                             "km_zones": X[x, y].round(1).tolist()} for x, y in legs]},
                  open(a.out, "w"), indent=1)


if __name__ == "__main__":
    main()
