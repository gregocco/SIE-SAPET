"""Climatologie du vent du 1-9 août 2016-2025 via NASA POWER (MERRA-2, sans clé), grille 2,5°.
Sortie : data/wind_power.npz  (u, v = composantes du vent *vers* lequel il souffle, km/h, à 50 m).

Limites : moyenne journalière (pas de cycle diurne), 50 m (inférieur au vent de croisière), maille ~50 km.
"""
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np

LATS = np.arange(35.0, 67.6, 2.5)
LONS = np.arange(-10.0, 30.1, 2.5)
YEARS = list(range(2016, 2026))
PARAMS = "WS50M,WD50M,T2M,PRECTOTCORR,CLOUD_AMT"


def get(lat, lon):
    url = ("https://power.larc.nasa.gov/api/temporal/daily/point?"
           f"parameters={PARAMS}&community=RE&longitude={lon}&latitude={lat}"
           "&start=20160801&end=20250809&format=JSON")
    for attempt in range(6):
        r = subprocess.run(["curl", "-sS", "-m", "120", url], capture_output=True, text=True)
        try:
            return json.loads(r.stdout)["properties"]["parameter"]
        except Exception:  # noqa: BLE001
            time.sleep(4 * (attempt + 1))
    return None


def work(p):
    lat, lon = p
    par = get(lat, lon)
    out = np.full((len(YEARS), 9, 5), np.nan, np.float32)
    if par:
        for yi, y in enumerate(YEARS):
            for d in range(9):
                key = f"{y}08{d + 1:02d}"
                vals = [par[k].get(key) for k in ("WS50M", "WD50M", "T2M", "PRECTOTCORR", "CLOUD_AMT")]
                if all(v is not None and v > -900 for v in vals):
                    out[yi, d] = vals
    return out


pts = [(float(a), float(b)) for a in LATS for b in LONS]
with ThreadPoolExecutor(4) as ex:
    res = list(ex.map(work, pts))
data = np.stack(res)  # [pt, year, day, (ws m/s, wd deg-from, T, precip, cloud%)]
np.savez_compressed("data/wind_power.npz", data=data, lats=LATS, lons=LONS, years=YEARS)
print("ok", data.shape, "NaN %", float(np.isnan(data).mean()) * 100)
