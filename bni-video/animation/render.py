#!/usr/bin/env python3
"""Moteur d'animation BNI « Le tournoi des partenaires ».

Étapes : timeline (durées --fit : voix + 2,5 s) -> enveloppes de voix (lip-sync) -> logos recadrés
-> mixage audio (numpy) + SRT -> capture image par image (Playwright, animation/capture.js) -> ffmpeg.

  python3 -I animation/render.py --preview            # 480x270, 12 fps -> out/bni_anim_preview.mp4
  python3 -I animation/render.py                      # 1920x1080, 25 fps -> out/bni_anim.mp4
  python3 -I animation/render.py --keyframes [--kf-width 960]   # images clés PNG -> out/anim_keyframes/
  python3 -I animation/render.py --stills 3.2,10.5    # images à des instants précis
Ne lit que data/ et assets/ ; n'écrit que dans out/.
"""
import argparse, json, os, re, subprocess, sys, time, wave
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
OUT = os.path.join(ROOT, "out")
BUILD = os.path.join(OUT, "anim_build")
AUDIO = os.path.join(ROOT, "assets", "audio")
SR = 48000
VOICE_OFF = 1.1      # décalage de la voix dans une séquence membre (entrée + rei avant de parler)
OPEN_OFF = 0.8       # décalage de la voix d'ouverture
FINAL_MIN = 9.5      # durée mini du final (podium + médailles + salut)
FINAL_OFF = 3.0      # voix 99 après la remise des médailles
MUSIC_DB = -18.0

# recadrages manuels (fractions x0,y0,x1,y1) avant l'autocrop : on garde la marque, pas les pictos annexes
LOGO_CROP = {"xl_glass.jpg": (0.17, 0.26, 0.82, 0.98)}


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode:
        sys.exit((r.stderr.decode() if isinstance(r.stderr, bytes) else r.stderr)[-2000:])
    return r


def decode(path, sr=SR, ch=2):
    r = run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", str(ch), "-ar", str(sr), "-"])
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, ch)


def envelope(path):
    """Enveloppe d'amplitude à 100 Hz, normalisée 0..1, lissée (attaque rapide, relâche douce)."""
    x = decode(path, 16000, 1)[:, 0]
    hop = 160
    n = len(x) // hop
    rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
    ref = np.percentile(rms, 95) or 1.0
    e = np.clip(rms / ref, 0, 1)
    e[e < 0.10] = 0
    out, v = np.zeros_like(e), 0.0
    for i, s in enumerate(e):
        v += (s - v) * (0.55 if s > v else 0.22)
        out[i] = v
    return [round(float(a), 3) for a in out]


def chunks(line, maxc=78):
    """Découpe la réplique en sous-titres (≤ 2 lignes) aux frontières de phrase/proposition."""
    parts = [p.strip() for p in re.split(r"(?<=[.!?…:])\s+", line) if p.strip()]
    out = []
    for p in parts:
        while len(p) > maxc:  # coupe longue phrase à la virgule ou à l'espace le plus proche du milieu
            cut = [m.end() for m in re.finditer(r",\s", p)] or [m.start() for m in re.finditer(r"\s", p)]
            k = min(cut, key=lambda c: abs(c - len(p) / 2))
            out.append(p[:k].strip()); p = p[k:].strip()
        out.append(p)
    merged = []
    for p in out:
        if merged and len(merged[-1]) + len(p) + 1 <= maxc and (len(p) < 30 or len(merged[-1]) < 30):
            merged[-1] += " " + p
        else:
            merged.append(p)
    return merged


def short_activity(a):
    a = re.split(r"[:(]|\.\s", a or "")[0].strip().rstrip(",;")
    if len(a) > 46:
        a = a[:46].rsplit(" ", 1)[0]
        a = re.sub(r"\s+(pour|et|de|des|du|les|la|le|à)$", "", a)
    return a


def prep_logo(name, bg, dst):
    im = Image.open(os.path.join(ROOT, "assets", "logos", name)).convert("RGBA")
    if name in LOGO_CROP:
        x0, y0, x1, y1 = LOGO_CROP[name]
        im = im.crop((int(x0 * im.width), int(y0 * im.height), int(x1 * im.width), int(y1 * im.height)))
    flat = Image.new("RGBA", im.size, bg); flat.alpha_composite(im)
    a = np.asarray(flat.convert("RGB")).astype(int)
    ref = np.array(Image.new("RGB", (1, 1), bg).getpixel((0, 0)))
    mask = np.abs(a - ref).sum(2) > 40
    ys, xs = np.nonzero(mask)
    if len(xs):
        pad = int(0.06 * max(xs.ptp(), ys.ptp()))
        flat = flat.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(flat.width, xs.max() + pad), min(flat.height, ys.max() + pad)))
    flat.thumbnail((800, 800))
    flat.convert("RGB").save(dst)
    return flat.width / flat.height


def timeline(cfg):
    segs, t = [], 0.0
    def dur(i): return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(AUDIO, f"{i}.mp3")], text=True).stdout)
    v = dur("00"); D = v + 2.5
    segs.append({"kind": "open", "id": "00", "start": 0.0, "dur": D, "vstart": OPEN_OFF, "vdur": v, "line": cfg["opening"]["line"],
                 "env": envelope(os.path.join(AUDIO, "00.mp3"))})
    t = D
    os.makedirs(os.path.join(BUILD, "logos"), exist_ok=True)
    for i, m in enumerate(cfg["members"]):
        v = dur(m["id"]); D = v + 2.5
        bg = m.get("logo_bg", "#ffffff")
        lp = os.path.join(BUILD, "logos", m["id"] + ".png")
        ar = prep_logo(m["logo"], bg, lp)
        segs.append({"kind": "member", "id": m["id"], "idx": i, "start": t, "dur": D, "vstart": t + VOICE_OFF, "vdur": v,
                     "name": m["name"], "company": m["company"], "activity": short_activity(m.get("activity")),
                     "line": m["line"], "chunks": chunks(m["line"]), "logo": "file://" + lp, "logo_ar": ar, "logo_bg": bg,
                     "belt": cfg["belts"][i], "env": envelope(os.path.join(AUDIO, m["id"] + ".mp3"))})
        t += D
    v = dur("99"); D = max(v + 2.5, FINAL_MIN)
    segs.append({"kind": "final", "id": "99", "start": t, "dur": D, "vstart": t + FINAL_OFF, "vdur": v, "line": cfg["closing"]["line"],
                 "env": envelope(os.path.join(AUDIO, "99.mp3"))})
    t += D
    segs[0]["vstart"] = OPEN_OFF
    segs[0]["chunks"] = chunks(cfg["opening"]["line"])
    return {"title": cfg["title"] if cfg.get("use_jo_wording", True) else cfg["title_fallback"], "chapter": cfg["chapter"],
            "belts": cfg["belts"], "segs": segs, "total": t}


def mix(tl, dst):
    n = int(tl["total"] * SR) + SR
    voice = np.zeros((n, 2), np.float32)
    for s in tl["segs"]:
        x = decode(os.path.join(AUDIO, s["id"] + ".mp3"))
        a = int(s["vstart"] * SR); voice[a:a + len(x)] += x[: n - a]
    m = decode(os.path.join(AUDIO, "music.mp3"))
    reps = int(np.ceil(n / len(m)))
    # boucle avec fondu enchaîné de 0,5 s pour éviter le clic à la jointure
    xf = int(0.5 * SR); ramp = np.linspace(0, 1, xf, dtype=np.float32)[:, None]
    loop = m.copy()
    for _ in range(reps):
        tail = loop[-xf:] * (1 - ramp) + m[:xf] * ramp
        loop = np.concatenate([loop[:-xf], tail, m[xf:]])
    music = loop[:n]
    tt = np.arange(n) / SR
    base = 10 ** (MUSIC_DB / 20)
    fin = tl["segs"][-1]; op = tl["segs"][0]
    g = np.full(n, base, np.float32)
    g = np.where(tt < op["vstart"] - 0.1, base * 2.6, g)                        # fanfare d'ouverture avant la voix
    ramp_in = np.clip((tt - (op["vstart"] - 0.4)) / 0.3, 0, 1)
    g = np.where((tt >= op["vstart"] - 0.4) & (tt < op["vstart"] - 0.1), base * (2.6 - 1.6 * ramp_in), g)
    vend = fin["vstart"] + fin["vdur"]
    up = np.clip((tt - vend - 0.1) / 0.6, 0, 1)                                  # fanfare remonte après la dernière voix
    g = g * (1 + 1.6 * up)
    pre = np.clip((tt - fin["start"]) / 0.4, 0, 1) * np.clip((fin["vstart"] - 0.2 - tt) / 0.4, 0, 1)
    g = g * (1 + 1.2 * pre)                                                     # entrée sur le podium (avant la voix)
    g *= np.clip((tl["total"] - tt) / 1.5, 0, 1)                                # fondu final
    out = voice + music * g[:, None]
    out = out[: int(tl["total"] * SR)]
    pk = np.abs(out).max()
    if pk > 0.97: out *= 0.97 / pk
    with wave.open(dst, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((out * 32767).astype("<i2").tobytes())


def srt(tl, dst):
    def ts(s):
        return f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{s % 60:06.3f}".replace(".", ",")
    k, lines = 1, []
    for s in tl["segs"]:
        ch = s.get("chunks") or [s["line"]]
        tot = sum(len(c) for c in ch); t = s["vstart"]
        for c in ch:
            d = s["vdur"] * len(c) / tot
            lines.append(f"{k}\n{ts(t)} --> {ts(t + d)}\n{c}\n"); k += 1; t += d
    open(dst, "w", encoding="utf-8").write("\n".join(lines))


def keyframe_times(tl):
    ts = []
    for s in tl["segs"]:
        a, d = s["start"], s["dur"]
        if s["kind"] == "open":
            ts += [("open_title", 2.5), ("open_entry", s["vstart"] + s["vdur"] - 0.5), ("open_belt", a + d - 0.3)]
        elif s["kind"] == "member":
            v0, v1 = s["vstart"], s["vstart"] + s["vdur"]
            nm = s["id"]
            ts += [(f"{nm}_rei", a + 0.75), (f"{nm}_talk", v0 + 0.3 * s["vdur"]), (f"{nm}_close", v0 + 0.75 * s["vdur"]),
                   (f"{nm}_pass", v1 + 0.55), (f"{nm}_flight", v1 + 1.0)]
        else:
            ts += [("final_medals", a + 1.8), ("final_title", s["vstart"] + 1.5), ("final_rei", a + 6.6), ("final_end", a + d - 1.2)]
    return ts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true", help="480x270, 12 fps")
    ap.add_argument("--width", type=int); ap.add_argument("--fps", type=float)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--keyframes", action="store_true"); ap.add_argument("--stills", default="")
    ap.add_argument("--kf-width", type=int, default=960)
    ap.add_argument("--range", default="", help="a:b en secondes (test partiel)")
    ap.add_argument("--out")
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, "data", "members.json"), encoding="utf-8"))
    os.makedirs(BUILD, exist_ok=True)
    t0 = time.time()
    tl = timeline(cfg)
    json.dump(tl, open(os.path.join(BUILD, "timeline.json"), "w"), ensure_ascii=False)
    print(f"timeline : {len(tl['segs'])} séquences, {tl['total']:.1f} s")
    node = ["node", os.path.join(HERE, "capture.js"), os.path.join(BUILD, "timeline.json")]

    if a.keyframes or a.stills:
        ts = keyframe_times(tl) if a.keyframes else [(f"t{float(x):07.2f}", float(x)) for x in a.stills.split(",")]
        d = os.path.join(OUT, "anim_keyframes"); os.makedirs(d, exist_ok=True)
        spec = os.path.join(BUILD, "stills.json")
        json.dump([{"t": t, "path": os.path.join(d, f"{i:02d}_{n}.png")} for i, (n, t) in enumerate(ts)], open(spec, "w"))
        run(node + ["--stills", spec, "--width", str(a.kf_width)], text=True)
        print("\n".join(os.path.join(d, f"{i:02d}_{n}.png") for i, (n, _) in enumerate(ts)))
        return

    W = a.width or (480 if a.preview else 1920)
    fps = a.fps or (12 if a.preview else 25)
    tag = "preview" if a.preview else "full"
    out = a.out or os.path.join(OUT, "bni_anim_preview.mp4" if a.preview else "bni_anim.mp4")
    wav = os.path.join(BUILD, "mix.wav"); mix(tl, wav)
    srt(tl, out.rsplit(".", 1)[0] + ".srt")
    frames = os.path.join(BUILD, "frames_" + tag)
    if os.path.isdir(frames):
        for f in os.listdir(frames): os.remove(os.path.join(frames, f))
    os.makedirs(frames, exist_ok=True)
    nfr = int(round(tl["total"] * fps))
    f0, f1 = 0, nfr
    if a.range:
        r0, r1 = map(float, a.range.split(":")); f0, f1 = int(r0 * fps), min(nfr, int(r1 * fps))
    print(f"rendu {W}x{W * 9 // 16} @ {fps} fps : {f1 - f0} images, {a.workers} workers")
    t1 = time.time()
    p = subprocess.run(node + ["--frames", frames, "--width", str(W), "--fps", str(fps), "--from", str(f0), "--to", str(f1),
                              "--workers", str(a.workers)])
    if p.returncode: sys.exit("capture échouée")
    tc = time.time() - t1
    per = tc / max(1, f1 - f0)
    print(f"capture : {tc:.1f} s ({per * 1000:.0f} ms/image)")
    au = ["-ss", f"{f0 / fps:.3f}", "-t", f"{(f1 - f0) / fps:.3f}", "-i", wav]
    run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-start_number", str(f0), "-i", os.path.join(frames, "%06d.jpg"), *au,
         "-c:v", "libx264", "-preset", "medium", "-crf", "18" if not a.preview else "23", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out])
    print(f"OK {out} ({tl['total']:.1f} s) en {time.time() - t0:.0f} s")
    if a.preview:
        # estimation plein format : coût par image ~ proportionnel aux pixels (capture JPEG), mesuré à x16 px environ 2,5x
        est = nfr / 12 * 25 * per * 2.6
        print(f"estimation plein format 1920x1080@25 : ~{est / 60:.1f} min de capture (+ ~1 min encodage)")


if __name__ == "__main__":
    main()
