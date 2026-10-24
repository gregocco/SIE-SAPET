#!/usr/bin/env python3
"""Fanfare originale (cuivres synthétiques + timbale), ~26 s, libre de droits : composée ici.
Usage : python3 -I fanfare.py -> assets/audio/music.mp3"""
import os, subprocess, wave
import numpy as np
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SR = 44100
def hz(n): return 440.0 * 2 ** ((n - 69) / 12)
def brass(f, d, vel=0.5):
    t = np.arange(int(SR * d)) / SR
    w = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 9))
    w += 0.3 * np.sin(2 * np.pi * f * 1.004 * t)                          # léger désaccord
    a = np.minimum(1, t / 0.06) * np.exp(-0.4 * np.maximum(0, t - d * 0.7))  # attaque + relâche
    return vel * w * a / 4
def timp(t0, n, out, vel=0.7):
    t = np.arange(int(SR * 0.6)) / SR
    s = np.sin(2 * np.pi * hz(n) * t * (1 + 0.3 * np.exp(-30 * t))) * np.exp(-7 * t)
    i = int(t0 * SR); out[i:i + len(s)] += vel * s[: len(out) - i]
# (note MIDI, début en s, durée) : motif ascendant en do majeur puis accord final
notes = [(60,0,.5),(64,.5,.5),(67,1,.5),(72,1.5,1.0),(67,3,.5),(72,3.5,.5),(76,4,1.0),
         (72,6,.5),(76,6.5,.5),(79,7,.5),(84,7.5,1.5),
         (79,10,.5),(84,10.5,.5),(88,11,1.0),(84,13,.5),(88,13.5,.5),(91,14,2.0)]
chords = [(48,52,55,60,16,2.5),(55,59,62,67,18.5,2.0),(48,55,60,64,21,4.5)]
out = np.zeros(int(SR * 26))
for n, s, d in notes:
    i = int(s * SR); b = brass(hz(n), d); out[i:i + len(b)] += b[: len(out) - i]
for *ns, s, d in chords:
    for n in ns:
        i = int(s * SR); b = brass(hz(n), d, 0.35); out[i:i + len(b)] += b[: len(out) - i]
for k in range(0, 16): timp(k * 1.0, 48 if k % 2 == 0 else 55, out)
timp(21, 36, out, 1.0); timp(21.4, 43, out, 1.0)
out = np.tanh(out * 1.2) * np.minimum(1, (26 - np.arange(len(out)) / SR) / 1.5)  # fondu final
os.makedirs(os.path.join(ROOT, "assets", "audio"), exist_ok=True)
wav = os.path.join(ROOT, "out", "fanfare.wav"); os.makedirs(os.path.dirname(wav), exist_ok=True)
with wave.open(wav, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 0.8 * 32767).astype("<i2").tobytes())
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, os.path.join(ROOT, "assets", "audio", "music.mp3")], check=True)
print("OK music.mp3")
