"""Graphe de routes tenant compte des espaces aériens.

Rastérise les zones bloquantes (projection LAEA, cellules de 8 km), calcule les plus courts chemins
entre les 100 balises + LFJY, puis pour chaque tronçon la distance minimale à chaque balise.

Usage : python3 tools/grid.py <Airspaces.txt> [plafond_ft=4500]
Sorties : data/legs.npz (D, M), data/legs_paths.pkl, data/beacon_airspace_report.json
"""
import json
import math
import pickle
import re
import sys

import numpy as np
import shapely
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from shapely.geometry import Polygon

sys.path.insert(0, "tools")
import openair  # noqa: E402

BLOCK = {"P", "R", "Q", "A", "B", "C", "D", "CTR"}
NO_TMA = {"Italy", "Germany", "Denmark"}  # pays où le passage en TMA est exclu (indication pilote)
# catégories : 0 libre, 1 conditionnelle/avertissement, 2 restreinte/danger, 3 contrôlée, 4 interdite
COST = np.array([1.0, 1.4, 3.0, 6.0, 10.0])
COND = re.compile(r"notam|mon-fri|week|active by|\(\d|<|\btra\b|tsa|temporary", re.I)


def category(z):
    n, c = z["name"], z["cls"]
    if "erogation" in z["country"] or "ZSM" in n:
        return 0
    if c == "CTR" or re.search(r"\bCTR\b", n):
        return 3
    if c in ("A", "B", "C", "D"):
        if re.search(r"TMA|CTA|TMZ|AWY", n, re.I) or c in ("A", "B"):
            return 3 if z["country"] in NO_TMA else 1
        return 3
    if c == "P" and re.match(r"(LI-P|Parco|Riser|Monum|Oasi)", n, re.I):
        return 1
    if n.startswith(("LF-R", "LF-D")):
        return 1 if COND.search(n) else 2
    if COND.search(n):
        return 1
    return 4 if c == "P" else 2
CELL = 8.0
HOME = (49.0139, 5.8764)
R = 6371.0
LAT0, LON0 = math.radians(52.0), math.radians(10.0)


def laea(lat, lon):
    lat, lon = np.radians(lat), np.radians(lon)
    k = np.sqrt(2 / (1 + np.sin(LAT0) * np.sin(lat) + np.cos(LAT0) * np.cos(lat) * np.cos(lon - LON0)))
    x = R * k * np.cos(lat) * np.sin(lon - LON0)
    y = R * k * (np.cos(LAT0) * np.sin(lat) - np.sin(LAT0) * np.cos(lat) * np.cos(lon - LON0))
    return x, y


def main(air_path, ceiling):
    beacons = json.load(open("data/uac_balises_2026.json"))
    blat = np.array([b["latitude"] for b in beacons] + [HOME[0]])
    blon = np.array([b["longitude"] for b in beacons] + [HOME[1]])
    bx, by = laea(blat, blon)
    nb = len(beacons)

    zones = [z for z in openair.parse(air_path) if z["cls"] in BLOCK and z["floor_ft"] < ceiling]
    print("zones bloquantes:", len(zones))
    polys, names, cats = [], [], []
    for z in zones:
        ring = np.array(z["ring"])
        x, y = laea(ring[:, 1], ring[:, 0])
        if len(x) < 3:
            continue
        p = shapely.make_valid(Polygon(np.c_[x, y]))
        if p.is_empty:
            continue
        polys.append(p.buffer(3.0))
        cats.append(category(z))
        names.append(f"{z['country']}|{z['cls']}|{z['name']}|{z['floor_ft']:.0f}-{z['ceil_ft']:.0f}")

    gx, gy = laea(np.array([34, 34, 67, 67, 52]), np.array([-12, 32, -12, 32, -12]))
    x0, x1 = math.floor((min(gx.min(), bx.min()) - 100) / CELL) * CELL, math.ceil((max(gx.max(), bx.max()) + 100) / CELL) * CELL
    y0, y1 = math.floor((min(gy.min(), by.min()) - 100) / CELL) * CELL, math.ceil((max(gy.max(), by.max()) + 100) / CELL) * CELL
    nx, ny = int((x1 - x0) / CELL), int((y1 - y0) / CELL)
    print("grille", nx, "x", ny)
    xs = x0 + (np.arange(nx) + 0.5) * CELL
    ys = y0 + (np.arange(ny) + 0.5) * CELL
    blocked = np.zeros((ny, nx), np.uint8)
    owner = {}
    for p, nm, ct in zip(polys, names, cats):
        mnx, mny, mxx, mxy = p.bounds
        i0, i1 = max(0, int((mnx - x0) / CELL)), min(nx, int((mxx - x0) / CELL) + 1)
        j0, j1 = max(0, int((mny - y0) / CELL)), min(ny, int((mxy - y0) / CELL) + 1)
        if i0 >= i1 or j0 >= j1:
            continue
        X, Y = np.meshgrid(xs[i0:i1], ys[j0:j1])
        inside = shapely.contains_xy(p, X, Y)
        blocked[j0:j1, i0:i1] = np.where(inside, np.maximum(blocked[j0:j1, i0:i1], ct), blocked[j0:j1, i0:i1])
        # balises à l'intérieur
        for k in range(nb + 1):
            if inside.any() and p.contains(shapely.Point(bx[k], by[k])):
                owner.setdefault(k, []).append(nm)
    report = {(beacons[k]["id"] if k < nb else "LFJY"): v for k, v in owner.items()}
    json.dump(report, open("data/beacon_airspace_report.json", "w"), ensure_ascii=False, indent=1)
    print("balises dans une zone bloquante:", len(report), list(report)[:20])
    print("part de cellules par catégorie:", np.bincount(blocked.ravel(), minlength=5) / blocked.size)

    # dégage les balises (rayon 12 km) : le pilote s'en approche, quitte à demander une dérogation
    nodes = []
    for k in range(nb + 1):
        i, j = int((bx[k] - x0) / CELL), int((by[k] - y0) / CELL)
        blocked[max(0, j - 2):j + 3, max(0, i - 2):i + 3] = 0
        nodes.append(j * nx + i)

    idx = np.arange(nx * ny).reshape(ny, nx)
    rows, cols, w = [], [], []
    moves = [(1, 0), (0, 1), (1, 1), (1, -1), (2, 1), (1, 2), (2, -1), (1, -2)]
    for dx, dy in moves:
        a = idx[0:ny - dy, 0:nx - dx] if dy >= 0 else idx[-dy:ny, 0:nx - dx]
        b = idx[dy:ny, dx:nx] if dy >= 0 else idx[0:ny + dy, dx:nx]
        cf = COST[blocked.ravel()]
        rows.append(a.ravel())
        cols.append(b.ravel())
        w.append(CELL * math.hypot(dx, dy) * (cf[a.ravel()] + cf[b.ravel()]) / 2)
    r, c, ww = np.concatenate(rows), np.concatenate(cols), np.concatenate(w)
    g = coo_matrix((np.r_[ww, ww], (np.r_[r, c], np.r_[c, r])), shape=(nx * ny,) * 2).tocsr()
    dist, pred = dijkstra(g, directed=False, indices=nodes, return_predecessors=True)
    print("dijkstra ok")

    nn = nb + 1
    D = np.full((nn, nn), np.inf)
    M = np.full((nn, nn, nb), 1e9, np.float32)
    paths = {}
    X = np.zeros((nn, nn, 5), np.float32)  # km parcourus par catégorie d'espace aérien
    cx = lambda n: (x0 + ((n % nx) + 0.5) * CELL, y0 + ((n // nx) + 0.5) * CELL)  # noqa: E731
    for a in range(nn):
        for b in range(a + 1, nn):
            if not np.isfinite(dist[a, nodes[b]]):
                continue
            seq, n = [], nodes[b]
            while n != nodes[a] and n >= 0:
                seq.append(n)
                n = pred[a, n]
            seq.append(nodes[a])
            pts = np.array([cx(s) for s in seq[::-1]])
            pts[0], pts[-1] = (bx[a], by[a]), (bx[b], by[b])
            # lissage : on garde 1 point sur 2 pour les distances/temps
            pts = pts[::2] if len(pts) > 4 else pts
            pts[-1] = (bx[b], by[b])
            D[a, b] = D[b, a] = float(np.hypot(*np.diff(pts, axis=0).T).sum())
            paths[(a, b)] = pts.astype(np.float32)
            # distance min de chaque balise au tracé
            p0, p1 = pts[:-1], pts[1:]
            d = p1 - p0
            L2 = (d ** 2).sum(1)
            px = bx[:nb][:, None] - p0[None, :, 0]
            py = by[:nb][:, None] - p0[None, :, 1]
            t = np.clip((px * d[:, 0] + py * d[:, 1]) / np.maximum(L2, 1e-9), 0, 1)
            dm = np.hypot(px - t * d[:, 0], py - t * d[:, 1]).min(1)
            M[a, b] = M[b, a] = dm
            seg = np.hypot(*d.T)
            for q in range(len(seg)):
                n = max(1, int(seg[q] / 4))
                tt = (np.arange(n) + 0.5) / n
                ii = np.clip(((p0[q, 0] + tt * d[q, 0] - x0) / CELL).astype(int), 0, nx - 1)
                jj = np.clip(((p0[q, 1] + tt * d[q, 1] - y0) / CELL).astype(int), 0, ny - 1)
                np.add.at(X[a, b], blocked[jj, ii], seg[q] / n)
            X[b, a] = X[a, b]
            if b < nb:
                M[a, b, b] = M[b, a, b] = 0.0
            if a < nb:
                M[a, b, a] = M[b, a, a] = 0.0
    np.savez_compressed("data/legs.npz", D=D, M=M, bx=bx, by=by, X=X)
    pickle.dump(paths, open("data/legs_paths.pkl", "wb"))
    ratio = D[:nb, :nb] / np.maximum(1, np.hypot(bx[:nb, None] - bx[None, :nb], by[:nb, None] - by[None, :nb]))
    print("détour moyen vs ligne droite: %.3f, max %.2f" % (np.nanmean(ratio[np.isfinite(ratio) & (ratio > 0)]), np.nanmax(ratio[np.isfinite(ratio)])))
    print("tronçons impossibles:", int((~np.isfinite(D)).sum() // 2))


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 4500.0)
