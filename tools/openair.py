"""Parseur OpenAir -> liste de dicts {cls, name, floor_ft, ceil_ft, ring:[(lon,lat),...]}.

Gère DP (polygone), DC (cercle), DA/DB (arcs), V X= (centre), V D= (sens). Ignore DY (voies aériennes),
les dates des zones temporaires (commentaires) : toutes les zones sont donc considérées actives.
"""
import math
import re
import sys

NM = 1.852
R = 6371.0
COORD = re.compile(r"([\d.]+):([\d.]+)(?::([\d.]+))?\s*([NS])\s+([\d.]+):([\d.]+)(?::([\d.]+))?\s*([EW])")


def parse_coord(s):
    m = COORD.search(s)
    if not m:
        return None
    a, b, c, ns, d, e, f, ew = m.groups()
    lat = float(a) + float(b) / 60 + (float(c) / 3600 if c else 0)
    lon = float(d) + float(e) / 60 + (float(f) / 3600 if f else 0)
    return (-lat if ns == "S" else lat, -lon if ew == "W" else lon)


def parse_alt(s):
    s = s.strip().upper()
    if s.startswith(("GND", "SFC")) or s.replace(" ", "").startswith(("0AGL", "0FT")) or s in ("0", "UNL0"):
        return 0.0
    if s.startswith("UNL") or s.startswith("UNLIM"):
        return 99999.0
    m = re.match(r"FL\s*(\d+)", s)
    if m:
        return float(m.group(1)) * 100
    m = re.match(r"(\d+(?:\.\d+)?)\s*(FT|F|M)?", s)
    if m:
        v = float(m.group(1))
        return v * 3.28084 if m.group(2) == "M" else v
    return 0.0


def dest(lat, lon, brg, dist_km):
    p1, l1, b, d = math.radians(lat), math.radians(lon), math.radians(brg), dist_km / R
    p2 = math.asin(math.sin(p1) * math.cos(d) + math.cos(p1) * math.sin(d) * math.cos(b))
    l2 = l1 + math.atan2(math.sin(b) * math.sin(d) * math.cos(p1), math.cos(d) - math.sin(p1) * math.sin(p2))
    return math.degrees(p2), (math.degrees(l2) + 540) % 360 - 180


def bearing_dist(c, p):
    p1, p2 = math.radians(c[0]), math.radians(p[0])
    dl = math.radians(p[1] - c[1])
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return (math.degrees(math.atan2(y, x)) + 360) % 360, 2 * R * math.asin(math.sqrt(min(1, a)))


def arc(center, r_km, a1, a2, clockwise=True, step=5):
    pts = []
    if clockwise:
        while a2 <= a1:
            a2 += 360
        a = a1
        while a < a2:
            pts.append(dest(*center, a % 360, r_km))
            a += step
        pts.append(dest(*center, a2 % 360, r_km))
    else:
        while a1 <= a2:
            a1 += 360
        a = a1
        while a > a2:
            pts.append(dest(*center, a % 360, r_km))
            a -= step
        pts.append(dest(*center, a2 % 360, r_km))
    return pts


def parse(path):
    out, cur = [], None
    center, cw, country = None, True, ""

    def flush():
        nonlocal cur
        if cur and cur["cls"] and (len(cur["pts"]) >= 3 or cur["circle"]):
            if cur["circle"]:
                c, r = cur["circle"]
                cur["pts"] = arc(c, r, 0, 359, True, 6)
            out.append({"cls": cur["cls"], "name": cur["name"], "floor_ft": cur["lo"], "ceil_ft": cur["hi"],
                        "country": cur["country"], "ring": [(p[1], p[0]) for p in cur["pts"]]})
        cur = None

    for raw in open(path, encoding="utf-8", errors="replace"):
        line = raw.strip()
        m = re.match(r"^\*{5,}\s*([A-Za-z .]+?)\s*\*{5,}$", line)
        if m:
            country = m.group(1)
            continue
        if not line or line.startswith("*"):
            continue
        k = line[:2]
        if k == "AC":
            flush()
            cur = {"cls": line[3:].strip(), "name": "", "lo": 0.0, "hi": 99999.0, "pts": [], "circle": None,
                   "country": country}
            center, cw = None, True
        elif cur is None:
            continue
        elif k == "AN":
            cur["name"] = line[3:].strip()
        elif k == "AH":
            cur["hi"] = parse_alt(line[3:])
        elif k == "AL":
            cur["lo"] = parse_alt(line[3:])
        elif k == "DP":
            c = parse_coord(line[3:])
            if c:
                cur["pts"].append(c)
        elif line.startswith("V X="):
            center = parse_coord(line[4:])
        elif line.startswith("V D="):
            cw = line[4:5] != "-"
        elif k == "DC" and center:
            cur["circle"] = (center, float(line[3:].split()[0]) * NM)
        elif k == "DB" and center:
            found = [parse_coord(m.group(0)) for m in COORD.finditer(line[3:])]
            if len(found) == 2:
                pa, pb = found
                a1, r = bearing_dist(center, pa)
                a2, _ = bearing_dist(center, pb)
                cur["pts"].extend(arc(center, r, a1, a2, cw))
        elif k == "DA" and center:
            r, a1, a2 = [float(x) for x in line[3:].split(",")]
            cur["pts"].extend(arc(center, r * NM, a1, a2, cw))
    flush()
    return out


if __name__ == "__main__":
    zones = parse(sys.argv[1])
    from collections import Counter
    print(len(zones), Counter(z["cls"] for z in zones).most_common())
