#!/usr/bin/env python3
"""Moteur d'animation BNI « Le tournoi des partenaires », version 2 (dojo WebGL2 3D + personnages semi-réalistes).

Étapes : timeline (durées recalculées depuis les fichiers audio : voix + marges) -> enveloppes et formes de bouche
(lip-sync) -> alignement mots / sous-titres sur les silences de la voix -> logos recadrés -> mixage (voix + fanfare
à -18 dB) + SRT -> capture image par image (Playwright/Chromium, animation/capture_v2.js) avec contrôles de mise en
forme -> ffmpeg -> contrôles de la vidéo (images noires, extraits 1080p).

  python3 -I animation/render_v2.py --check                 # contrôles sur toutes les images (sans WebGL, ~3 min)
  python3 -I animation/render_v2.py --keyframes             # images clés + planches contact -> out/v2_keyframes/
  python3 -I animation/render_v2.py --preview               # 640x360, 12 fps -> out/bni_anim_v2_preview.mp4
  python3 -I animation/render_v2.py                         # 1920x1080, 25 fps -> out/bni_anim_v2.mp4 (+ .srt)
  python3 -I animation/render_v2.py --stills 12.5,40        # images à des instants précis
Ne lit que data/ et assets/ ; n'écrit que dans out/. Ne remplace jamais out/bni_anim.mp4 (v1).
"""
import argparse, json, os, re, subprocess, sys, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import render as R1  # fonctions v1 réutilisées : decode, chunks, short_activity, prep_logo, mix

ROOT = os.path.normpath(os.path.join(HERE, ".."))
OUT = os.path.join(ROOT, "out")
BUILD = os.path.join(OUT, "v2_build")
KF = os.path.join(OUT, "v2_keyframes")
AUDIO = os.path.join(ROOT, "assets", "audio")
OPEN_OFF = 0.8       # voix d'ouverture
VOICE_OFF = 1.6      # membre : réception + nœud + salut avant de parler
UKEMI_EXTRA = 1.8    # Haja : chute amortie avant de parler
TAIL = 1.4           # après la voix : passage de ceinture
LAST_TAIL = 2.6      # après Matthias : regroupement et acclamations
FINAL_MIN, FINAL_OFF = 9.5, 3.0
FONT = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode:
        sys.exit((r.stderr.decode() if isinstance(r.stderr, bytes) else r.stderr)[-3000:])
    return r


def dur(i):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(AUDIO, f"{i}.mp3")], text=True).stdout)


def analyse(path):
    """Enveloppe (ouverture de bouche) et forme (large/arrondie, via le centroïde spectral) à 100 Hz."""
    x = R1.decode(path, 16000, 1)[:, 0]
    hop, win = 160, 400
    n = max(1, (len(x) - win) // hop)
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    fr = x[idx] * np.hanning(win)[None, :]
    rms = np.sqrt((fr ** 2).mean(1) + 1e-12)
    ref = np.percentile(rms, 95) or 1.0
    e = np.clip(rms / ref, 0, 1); e[e < 0.10] = 0
    env, v = np.zeros_like(e), 0.0
    for i, s in enumerate(e):
        v += (s - v) * (0.55 if s > v else 0.22); env[i] = v
    spec = np.abs(np.fft.rfft(fr, axis=1)); f = np.fft.rfftfreq(win, 1 / 16000)
    cen = (spec * f[None, :]).sum(1) / (spec.sum(1) + 1e-9)
    ok = env > 0.12
    med = np.median(cen[ok]) if ok.any() else 1500; sd = np.std(cen[ok]) if ok.any() else 500
    sh = np.tanh((cen - med) / (sd + 1e-6) * 0.9); sh[~ok] = 0
    out, v = np.zeros_like(sh), 0.0
    for i, s in enumerate(sh):
        v += (s - v) * 0.35; out[i] = v
    return [round(float(a), 3) for a in env], [round(float(a), 3) for a in out]


def align(line, env, v0, vdur):
    """Instant de début de chaque mot : répartition au prorata des lettres sur le temps voisé,
    puis recalage des débuts de proposition (après ponctuation) sur la fin du silence le plus proche."""
    e = np.array(env); voiced = e > 0.06
    tv = np.cumsum(voiced) / 100.0
    gaps, i = [], 0
    while i < len(e):
        if not voiced[i]:
            j = i
            while j < len(e) and not voiced[j]: j += 1
            if j - i >= 10 and i > 0 and j < len(e): gaps.append((i / 100, j / 100))
            i = j
        else: i += 1
    toks = line.split()
    wts = [len(re.sub(r"\W", "", t)) + 1.5 for t in toks]
    cum = np.concatenate([[0], np.cumsum(wts)])[:-1] / sum(wts)
    first = np.argmax(voiced) / 100 if voiced.any() else 0
    out = []
    for k, tok in enumerate(toks):
        tgt = cum[k] * tv[-1]
        t = first if k == 0 else np.searchsorted(tv, tgt) / 100
        if k > 0 and re.search(r"[,.;:!?…]$", toks[k - 1]) and gaps:
            g = min(gaps, key=lambda g: abs(g[1] - t))
            if abs(g[1] - t) < 0.45: t = g[1]
        out.append({"w": tok, "t": round(v0 + min(t, vdur - 0.05), 3)})
    for k in range(1, len(out)):  # monotone
        out[k]["t"] = max(out[k]["t"], out[k - 1]["t"] + 0.05)
    return out


def chunk_times(line, words, v0, vdur):
    ch = R1.chunks(line)
    res, k = [], 0
    for c in ch:
        n = len(c.split())
        res.append({"text": c, "t0": words[k]["t"] if k < len(words) else v0})
        k += n
    for a, b in zip(res, res[1:]): a["t1"] = b["t0"]
    res[-1]["t1"] = v0 + vdur
    res[0]["t0"] = v0
    return res


def timeline(cfg):
    segs = []
    os.makedirs(os.path.join(BUILD, "logos"), exist_ok=True)
    def seg_audio(i):
        env, shape = analyse(os.path.join(AUDIO, f"{i}.mp3")); return env, shape
    v = dur("00"); D = v + 2.5
    env, shape = seg_audio("00")
    w = align(cfg["opening"]["line"], env, OPEN_OFF, v)
    segs.append({"kind": "open", "id": "00", "start": 0.0, "dur": D, "vstart": OPEN_OFF, "vdur": v, "line": cfg["opening"]["line"],
                 "env": env, "shape": shape, "words": w, "chunks": chunk_times(cfg["opening"]["line"], w, OPEN_OFF, v)})
    t = D
    n = len(cfg["members"])
    for i, m in enumerate(cfg["members"]):
        v = dur(m["id"]); off = VOICE_OFF + (UKEMI_EXTRA if m["id"] == "04" else 0)
        D = off + v + (LAST_TAIL if i == n - 1 else TAIL)
        bg = m.get("logo_bg", "#ffffff")
        lp = os.path.join(BUILD, "logos", m["id"] + ".png")
        ar = R1.prep_logo(m["logo"], bg, lp)
        env, shape = seg_audio(m["id"])
        w = align(m["line"], env, t + off, v)
        segs.append({"kind": "member", "id": m["id"], "idx": i, "start": t, "dur": D, "vstart": t + off, "vdur": v,
                     "name": m["name"], "company": m["company"], "activity": R1.short_activity(m.get("activity")),
                     "line": m["line"], "words": w, "chunks": chunk_times(m["line"], w, t + off, v),
                     "logo": "file://" + lp, "logo_ar": ar, "logo_bg": bg, "belt": cfg["belts"][i], "env": env, "shape": shape})
        t += D
    v = dur("99"); D = max(v + 2.5, FINAL_MIN)
    env, shape = seg_audio("99")
    w = align(cfg["closing"]["line"], env, t + FINAL_OFF, v)
    segs.append({"kind": "final", "id": "99", "start": t, "dur": D, "vstart": t + FINAL_OFF, "vdur": v, "line": cfg["closing"]["line"],
                 "env": env, "shape": shape, "words": w, "chunks": chunk_times(cfg["closing"]["line"], w, t + FINAL_OFF, v)})
    t += D
    return {"title": cfg["title"] if cfg.get("use_jo_wording", True) else cfg["title_fallback"], "chapter": cfg["chapter"],
            "belts": cfg["belts"], "segs": segs, "total": t, "sceneScale": 0.72}


def srt(tl, dst):
    def ts(s):
        return f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{s % 60:06.3f}".replace(".", ",")
    k, lines = 1, []
    for s in tl["segs"]:
        for c in s["chunks"]:
            lines.append(f"{k}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{c['text']}\n"); k += 1
    open(dst, "w", encoding="utf-8").write("\n".join(lines))


def keyframe_times(tl):
    S = tl["segs"]; op, fin = S[0], S[-1]; mem = S[1:-1]
    ts = [("00_open_title", 2.6), ("00_open_dolly", 4.8), ("00_open_walk", op["vstart"] + op["vdur"] - 0.8), ("00_open_belt", op["vstart"] + op["vdur"] + 0.95)]
    for i, s in enumerate(mem):
        a, V, E, N = s["start"], s["vstart"], s["vstart"] + s["vdur"], s["start"] + s["dur"]
        nm = s["id"]
        ts += [(f"{nm}_a_entree", a - 0.8 if i else op["vstart"] + op["vdur"] - 0.6), (f"{nm}_b_ceinture", a + 0.62), (f"{nm}_c_rei", a + 1.13)]
        if nm == "04":
            ts += [(f"{nm}_c2_chute", a + 1.55 + 0.62), (f"{nm}_c3_impact", a + 1.55 + 0.85)]
        ts += [(f"{nm}_d_parole", V + 0.3 * s["vdur"]), (f"{nm}_e_gros_plan", V + 0.8 * s["vdur"])]
        if i < len(mem) - 1:
            ts += [(f"{nm}_f_don", E + 0.32), (f"{nm}_g_vol", E + 0.45 + 0.55 * (N + 0.3 - E - 0.45))]
        else:
            ts += [(f"{nm}_f_fin", E + 0.4), (f"{nm}_g_groupe", N - 0.5)]
    ts += [("99_final_medailles", fin["start"] + 2.4), ("99_final_titre", fin["vstart"] + 1.2), ("99_final_rei", fin["vstart"] + fin["vdur"] + 0.95), ("99_final_fin", fin["start"] + fin["dur"] - 1.3)]
    return ts


def contact_sheets(files, dst_prefix, cols=4, w=480):
    h = w * 9 // 16
    font = ImageFont.truetype(FONT, 16)
    sheets, per = [], cols * 4
    for si in range(0, len(files), per):
        part = files[si:si + per]; rows = (len(part) + cols - 1) // cols
        S = Image.new("RGB", (cols * w, rows * (h + 24)), (20, 20, 24))
        d = ImageDraw.Draw(S)
        for k, f in enumerate(part):
            im = Image.open(f).convert("RGB").resize((w, h), Image.LANCZOS)
            x, y = (k % cols) * w, (k // cols) * (h + 24)
            S.paste(im, (x, y + 24)); d.text((x + 6, y + 3), os.path.basename(f)[:-4], fill=(240, 220, 160), font=font)
        p = f"{dst_prefix}_{si // per + 1:02d}.jpg"; S.save(p, quality=88); sheets.append(p)
    return sheets


def video_checks(mp4, total, fps, tl):
    """Images noires parasites (luminance moyenne) + extraits plein format pour inspection."""
    r = run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", "scale=64:36", "-f", "rawvideo", "-pix_fmt", "gray", "-"])
    a = np.frombuffer(r.stdout, np.uint8).reshape(-1, 36 * 64).mean(1)
    issues = []
    for f, l in enumerate(a):
        t = f / fps
        if l < 14 and not (t < 0.45 or t > total - 0.85):
            issues.append(f"image noire t={t:.2f} (luminance {l:.1f})")
    jumps = np.abs(np.diff(a))
    times = [round(x, 2) for x in np.linspace(1.0, total - 1.0, 14)]
    os.makedirs(KF, exist_ok=True)
    outs = []
    for k, t in enumerate(times):
        p = os.path.join(KF, f"mp4_{k:02d}_{t:06.2f}.png")
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", mp4, "-frames:v", "1", p]); outs.append(p)
    return issues, outs, float(jumps.max()) if len(jumps) else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true", help="640x360, 12 fps")
    ap.add_argument("--width", type=int); ap.add_argument("--fps", type=float)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--keyframes", action="store_true"); ap.add_argument("--stills", default="")
    ap.add_argument("--kf-width", type=int, default=1920)
    ap.add_argument("--check", action="store_true", help="contrôles sur toutes les images sans rendu WebGL")
    ap.add_argument("--range", default="", help="a:b en secondes (test partiel)")
    ap.add_argument("--no-strict", action="store_true", help="ne pas échouer si un contrôle est violé")
    ap.add_argument("--out")
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, "data", "members.json"), encoding="utf-8"))
    os.makedirs(BUILD, exist_ok=True)
    t0 = time.time()
    tl = timeline(cfg)
    tlp = os.path.join(BUILD, "timeline.json")
    json.dump(tl, open(tlp, "w"), ensure_ascii=False)
    print(f"timeline : {len(tl['segs'])} séquences, {tl['total']:.1f} s")
    node = ["node", os.path.join(HERE, "capture_v2.js"), tlp]
    qcf = os.path.join(BUILD, "qc.json")

    def report(label):
        iss = json.load(open(qcf)) if os.path.exists(qcf) else []
        if iss:
            print(f"ÉCHEC des contrôles ({label}) : {len(iss)} problème(s), détail dans {qcf}")
            for x in iss[:30]: print("  -", x)
            if not a.no_strict: sys.exit(3)
        else:
            print(f"contrôles ({label}) : OK")

    if a.check:
        if os.path.exists(qcf): os.remove(qcf)
        subprocess.run(node + ["--check", "--fps", str(a.fps or 25), "--width", "960", "--qc", qcf])
        report("toutes les images"); return

    if a.keyframes or a.stills:
        ts = keyframe_times(tl) if a.keyframes else [(f"t{float(x):07.2f}", float(x)) for x in a.stills.split(",")]
        d = KF if a.keyframes else os.path.join(OUT, "v2_stills"); os.makedirs(d, exist_ok=True)
        spec = os.path.join(BUILD, "stills.json")
        files = [os.path.join(d, f"{n}.png") for n, _ in ts]
        json.dump([{"t": t, "path": p} for (n, t), p in zip(ts, files)], open(spec, "w"))
        if os.path.exists(qcf): os.remove(qcf)
        t1 = time.time()
        subprocess.run(node + ["--stills", spec, "--width", str(a.kf_width), "--workers", str(min(a.workers, 4)), "--qc", qcf])
        print(f"{len(files)} images en {time.time() - t1:.0f} s")
        if a.keyframes:
            for p in contact_sheets(files, os.path.join(KF, "planche")): print(p)
        report("images clés"); return

    W = a.width or (640 if a.preview else 1920)
    fps = a.fps or (12 if a.preview else 25)
    tag = "preview" if a.preview else "full"
    out = a.out or os.path.join(OUT, "bni_anim_v2_preview.mp4" if a.preview else "bni_anim_v2.mp4")
    if os.path.abspath(out) == os.path.abspath(os.path.join(OUT, "bni_anim.mp4")): sys.exit("refus : bni_anim.mp4 est la v1 de repli")
    wav = os.path.join(BUILD, "mix.wav"); R1.mix(tl, wav)
    srt(tl, out.rsplit(".", 1)[0] + ".srt")
    frames = os.path.join(BUILD, "frames_" + tag)
    if os.path.isdir(frames):
        for f in os.listdir(frames): os.remove(os.path.join(frames, f))
    os.makedirs(frames, exist_ok=True)
    nfr = int(round(tl["total"] * fps)); f0, f1 = 0, nfr
    if a.range:
        r0, r1 = map(float, a.range.split(":")); f0, f1 = int(r0 * fps), min(nfr, int(r1 * fps))
    print(f"rendu {W}x{W * 9 // 16} @ {fps} fps : {f1 - f0} images, {a.workers} navigateurs")
    if os.path.exists(qcf): os.remove(qcf)
    t1 = time.time()
    p = subprocess.run(node + ["--frames", frames, "--width", str(W), "--fps", str(fps), "--from", str(f0), "--to", str(f1), "--workers", str(a.workers), "--qc", qcf])
    if p.returncode: sys.exit("capture échouée")
    tc = time.time() - t1
    print(f"capture : {tc:.0f} s ({tc / max(1, f1 - f0) * 1000:.0f} ms/image)")
    au = ["-ss", f"{f0 / fps:.3f}", "-t", f"{(f1 - f0) / fps:.3f}", "-i", wav]
    t2 = time.time()
    run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-start_number", str(f0), "-i", os.path.join(frames, "%06d.jpg"), *au,
         "-c:v", "libx264", "-preset", "slow" if not a.preview else "medium", "-crf", "17" if not a.preview else "22", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out])
    print(f"encodage : {time.time() - t2:.0f} s")
    print(f"OK {out} ({tl['total']:.1f} s) en {time.time() - t0:.0f} s au total")
    if not a.range:
        vi, ex, jmax = video_checks(out, tl["total"], fps, tl)
        print(f"vérification vidéo : {len(vi)} image(s) noire(s) parasite(s) ; {len(ex)} extraits -> {KF}")
        for x in vi[:20]: print("  -", x)
    report("capture")


if __name__ == "__main__":
    main()
