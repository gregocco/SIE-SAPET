#!/usr/bin/env python3
"""Assemble la vidéo BNI : cartes PIL -> clips ffmpeg (zoom lent) -> concat + voix + musique + SRT.
Usage : python3 -I build.py [--scale 0.1] [--out ../out/bni.mp4]
Si audio/NN.mp3 existe il est utilisé, sinon silence. Aucun crédit Higgsfield consommé ici."""
import argparse, json, os, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
if not os.path.exists(FONT):
    FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def font(sz): return ImageFont.truetype(FONT, sz)
def isfile(p): return bool(p) and os.path.isfile(p)

def fit(img, w, h):
    img = img.convert("RGBA"); img.thumbnail((w, h)); return img

def card(seg, cfg, path):
    W, H = cfg["canvas"]["w"], cfg["canvas"]["h"]
    im = Image.new("RGB", (W, H), "#d9c7a0")             # tatami (placeholder : remplacé par assets/dojo.png si présent)
    bg = os.path.join(ROOT, "assets", "dojo.png")
    if isfile(bg): im = Image.open(bg).convert("RGB").resize((W, H))
    d = ImageDraw.Draw(im)
    d.rectangle([0, H - 40, W, H], fill=seg.get("belt", "#111"))
    p = seg.get("portrait_path")
    if isfile(p):
        a = fit(Image.open(p), 700, 900); im.paste(a, (160, 90), a)
    lg = seg.get("logo_path")
    if isfile(lg):
        l = fit(Image.open(lg), 420, 220); box = Image.new("RGBA", (l.width + 40, l.height + 40), seg.get("logo_bg", "white"))
        box.paste(l, (20, 20), l); im.paste(box, (W - box.width - 120, 90), box)
    d.rectangle([0, H - 260, W, H - 40], fill=(0, 0, 0, 0))
    d.rounded_rectangle([120, H - 280, W - 120, H - 80], 24, fill="#101828")
    d.text((160, H - 262), seg["title"], font=font(64), fill="white")
    d.text((160, H - 180), seg["subtitle"], font=font(42), fill="#f4d03f")
    for i, ln in enumerate(textwrap.wrap(seg.get("text", ""), 34)[:6]):
        d.text((900, 380 + i * 62), ln, font=font(44), fill="#101828")
    im.save(path)

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-1500:])

def clip(png, dur, audio, out, cfg):
    fps = cfg["canvas"]["fps"]; n = max(1, int(dur * fps))
    vf = f"zoompan=z='min(zoom+0.0004,1.08)':d={n}:s={cfg['canvas']['w']}x{cfg['canvas']['h']}:fps={fps},format=yuv420p"
    a = ["-i", audio] if isfile(audio) else ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"]
    run(["ffmpeg", "-y", "-loop", "1", "-i", png, *a, "-vf", vf, "-t", f"{dur:.2f}",
         "-af", "apad", "-c:v", "libx264", "-c:a", "aac", "-shortest", out])

def ts(s):
    h, m = int(s // 3600), int(s % 3600 // 60); return f"{h:02d}:{m:02d}:{s % 60:06.3f}".replace(".", ",")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--scale", type=float, default=1.0); ap.add_argument("--fit", action="store_true", help="durée = voix + 2.5 s au lieu de la durée du script")
    ap.add_argument("--out", default=os.path.join(ROOT, "out", "bni.mp4")); a = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, "data", "members.json"), encoding="utf-8"))
    tmp = os.path.join(ROOT, "out", "tmp"); os.makedirs(tmp, exist_ok=True)
    ttl = cfg["title"] if cfg["use_jo_wording"] else cfg["title_fallback"]
    segs = [{"id": "00", "title": ttl, "subtitle": cfg["chapter"], "text": "", "dur": cfg["opening"]["duration"],
             "line": cfg["opening"]["line"], "belt": cfg["belts"][0]}]
    for i, m in enumerate(cfg["members"]):
        segs.append({"id": m["id"], "title": m["name"], "subtitle": m["company"], "text": m["line"], "dur": m["duration"],
                     "line": m["line"], "belt": cfg["belts"][min(i + 1, len(cfg["belts"]) - 1)],
                     "portrait_path": os.path.join(ROOT, "assets", "portraits", m["portrait"]) if m["portrait"] and not m["portrait"].startswith("TODO") else None,
                     "logo_bg": m.get("logo_bg", "white"), "logo_path": os.path.join(ROOT, "assets", "logos", m["logo"]) if m["logo"] and not m["logo"].startswith("TODO") else None})
    segs.append({"id": "99", "title": "Ensemble, on vise l'ippon !", "subtitle": cfg["chapter"], "text": "", "dur": cfg["closing"]["duration"],
                 "line": cfg["closing"]["line"], "belt": cfg["belts"][-1]})
    t, srt, clips = 0.0, [], []
    for k, s in enumerate(segs):
        au = os.path.join(ROOT, "assets", "audio", f"{s['id']}.mp3")
        vd = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", au], capture_output=True, text=True).stdout or 0) if isfile(au) else 0
        dur = vd + 2.5 if a.fit and vd else max(s["dur"] * a.scale, vd + 0.8)   # jamais de voix coupée
        png = os.path.join(tmp, f"{s['id']}.png"); mp4 = os.path.join(tmp, f"{s['id']}.mp4")
        card(s, cfg, png); clip(png, dur, au, mp4, cfg)
        srt.append(f"{k + 1}\n{ts(t + 0.5 * a.scale)} --> {ts(t + dur - 0.3 * a.scale)}\n{s['line']}\n"); clips.append(mp4); t += dur
    lst = os.path.join(tmp, "list.txt"); open(lst, "w").write("".join(f"file '{c}'\n" for c in clips))
    music = os.path.join(ROOT, "assets", "audio", "music.mp3")
    if isfile(music):
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-stream_loop", "-1", "-i", music, "-filter_complex",
             "[1:a]volume=0.12[m];[0:a][m]amix=inputs=2:duration=first[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", a.out])
    else:
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", a.out])
    open(a.out.rsplit(".", 1)[0] + ".srt", "w", encoding="utf-8").write("\n".join(srt))
    print(f"OK {a.out} durée {t:.1f}s")

main()
