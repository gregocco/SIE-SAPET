"""Télécharge la climatologie ERA5 (Open-Meteo archive, sans clé) du 1-9 août sur une grille
2,5° couvrant l'Europe, pour 2016-2025. Sortie : data/wind_raw.npz

Variables : vent 100 m (vitesse/direction), rafales 10 m, hauteur de couche limite, T 2 m, nébulosité.
Le vent à 100 m sous-estime le vent à l'altitude de croisière : à corriger avec les prévisions.
"""
import json
import os
import subprocess
import sys
import time

import numpy as np

LATS = np.arange(35.0, 67.6, 2.5)
LONS = np.arange(-10.0, 30.1, 2.5)
YEARS = list(range(2016, 2026))
VARS = ["wind_speed_100m", "wind_direction_100m", "wind_gusts_10m",
        "boundary_layer_height", "temperature_2m", "cloud_cover"]
DAYS = 9  # 1er au 9 août
OUT = "data/wind_raw.npz"

pts = [(la, lo) for la in LATS for lo in LONS]
BATCH = 14


def fetch(batch, year):
    url = ("https://archive-api.open-meteo.com/v1/archive?"
           f"latitude={','.join(str(p[0]) for p in batch)}&longitude={','.join(str(p[1]) for p in batch)}"
           f"&start_date={year}-08-01&end_date={year}-08-09&hourly={','.join(VARS)}"
           "&wind_speed_unit=kmh&timezone=UTC")
    for attempt in range(6):
        r = subprocess.run(["curl", "-sS", "-m", "60", url], capture_output=True, text=True)
        if r.returncode == 0:
            try:
                d = json.loads(r.stdout)
                if isinstance(d, dict) and d.get("error"):
                    raise ValueError(d.get("reason"))
                return d if isinstance(d, list) else [d]
            except Exception as e:  # noqa: BLE001
                print("retry", year, attempt, str(e)[:80], r.stdout[:80], file=sys.stderr)
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"échec {year} {batch[0]}")


data = np.full((len(YEARS), len(pts), len(VARS), DAYS * 24), np.nan, np.float32)
for yi, year in enumerate(YEARS):
    for b0 in range(0, len(pts), BATCH):
        batch = pts[b0:b0 + BATCH]
        res = fetch(batch, year)
        for k, d in enumerate(res):
            for vi, v in enumerate(VARS):
                arr = np.array([x if x is not None else np.nan for x in d["hourly"][v]], np.float32)
                data[yi, b0 + k, vi, :len(arr)] = arr[:DAYS * 24]
        time.sleep(1.0)
    print("année", year, "ok", flush=True)
os.makedirs("data", exist_ok=True)
np.savez_compressed(OUT, data=data, lats=LATS, lons=LONS, years=YEARS, vars=VARS)
print("écrit", OUT, data.shape)
