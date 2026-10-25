"""Borne haute grossière : meilleur score pendulaire sans vent, sans espace aérien,
pour un budget de distance donné (recuit simulé sur l'ordre de passage des balises).

Usage : python3 tools/baseline.py <heures_de_vol> [graine]
"""
import json
import math
import random
import sys

import numpy as np

R = 6371.0
HOME = (49.0139, 5.8764)  # LFJY Chambley
TIERS = [(0.1, 1.0), (0.25, 0.95), (0.5, 0.90), (1, 0.80), (5, 0.65), (25, 0.40)]
SPEED = 100.0  # km/h

beacons = json.load(open("data/uac_balises_2026.json"))
N = len(beacons)
lat = np.radians([b["latitude"] for b in beacons] + [HOME[0]])
lon = np.radians([b["longitude"] for b in beacons] + [HOME[1]])
val = np.array([b["categories"]["AT"]["max"] for b in beacons], float)
HOME_IDX = N


def dist(i, j):
    dp, dl = lat[j] - lat[i], lon[j] - lon[i]
    a = math.sin(dp / 2) ** 2 + math.cos(lat[i]) * math.cos(lat[j]) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def bearing(i, j):
    dl = lon[j] - lon[i]
    y = math.sin(dl) * math.cos(lat[j])
    x = math.cos(lat[i]) * math.sin(lat[j]) - math.sin(lat[i]) * math.cos(lat[j]) * math.cos(dl)
    return math.atan2(y, x)


def hav_all(i):
    dp, dl = lat - lat[i], lon - lon[i]
    a = np.sin(dp / 2) ** 2 + math.cos(lat[i]) * np.cos(lat) * np.sin(dl / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def bearing_all(i):
    dl = lon - lon[i]
    y = np.sin(dl) * np.cos(lat)
    x = math.cos(lat[i]) * np.sin(lat) - math.sin(lat[i]) * np.cos(lat) * np.cos(dl)
    return np.arctan2(y, x)


# D1[i] = distances de i à toutes les balises ; leg_min[(i,j)] = distance mini de chaque balise au segment i->j
D1 = [hav_all(i) for i in range(N + 1)]
B1 = [bearing_all(i) for i in range(N + 1)]
leg_cache = {}


def leg_min(i, j):
    key = (i, j) if i < j else (j, i)
    if key in leg_cache:
        return leg_cache[key]
    i, j = key
    d12 = D1[i][j]
    th12 = B1[i][j]
    d13 = D1[i]
    xt = np.arcsin(np.clip(np.sin(d13 / R) * np.sin(B1[i] - th12), -1, 1))
    at = np.arccos(np.clip(np.cos(d13 / R) / np.cos(xt), -1, 1)) * R
    ahead = np.cos(B1[i] - th12) > 0
    inside = ahead & (at <= d12)
    out = np.where(inside, np.abs(xt) * R, np.minimum(D1[i], D1[j]))
    leg_cache[key] = out
    return out


def tier_points(dmin):
    pct = np.zeros_like(dmin)
    for lim, p in reversed(TIERS):
        pct = np.where(dmin <= lim, p, pct)
    return pct


def evaluate(route):
    pts = [HOME_IDX] + route + [HOME_IDX]
    length = sum(D1[a][b] for a, b in zip(pts, pts[1:]))
    dmin = np.full(N + 1, 1e9)
    for a, b in zip(pts, pts[1:]):
        dmin = np.minimum(dmin, leg_min(a, b))
    return float((tier_points(dmin[:N]) * val).sum()), length


def anneal(budget_km, seed, iters=400000):
    rng = random.Random(seed)
    route, best = [], ([], 0.0)
    cur, _ = evaluate(route)
    T0 = 400.0
    for k in range(iters):
        T = T0 * (1 - k / iters) + 1
        new = route[:]
        r = rng.random()
        if r < 0.35 or not new:
            b = rng.randrange(N)
            if b in new:
                continue
            new.insert(rng.randrange(len(new) + 1), b)
        elif r < 0.55:
            new.pop(rng.randrange(len(new)))
        elif r < 0.8 and len(new) > 1:
            i, j = rng.randrange(len(new)), rng.randrange(len(new))
            new[i], new[j] = new[j], new[i]
        elif len(new) > 1:
            i, j = sorted(rng.sample(range(len(new)), 2))
            new[i:j + 1] = reversed(new[i:j + 1])
        s, L = evaluate(new)
        if L > budget_km:
            continue
        if s >= cur or rng.random() < math.exp((s - cur) / T):
            route, cur = new, s
            if s > best[1]:
                best = (new[:], s)
    return best


if __name__ == "__main__":
    hours = float(sys.argv[1])
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    budget = hours * SPEED
    route, score = anneal(budget, seed)
    s, L = evaluate(route)
    print(f"{hours:.0f} h de vol ({budget:.0f} km) -> {s:.0f} pts, trajet {L:.0f} km, {len(route)} waypoints")
    print(" -> ".join(beacons[i]["id"] for i in route))
