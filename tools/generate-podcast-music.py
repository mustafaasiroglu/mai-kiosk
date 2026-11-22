"""Original, reusable decade-inspired instrumental beds, not archive recordings."""
import array
import math
import random
import wave
from pathlib import Path

RATE = 24000
ROOT = Path(__file__).resolve().parents[1] / "assets" / "podcast-music"
STYLES = {
    1940: (88, "waltz"), 1950: (96, "piano"), 1960: (104, "guitar"),
    1970: (108, "organ"), 1980: (112, "synth"), 1990: (92, "keys"),
    2000: (100, "ambient"), 2010: (96, "bell"), 2020: (90, "soft"),
}
MELODY = [0, 4, 7, 9, 7, 4, 2, 5, 9, 12, 9, 5, 2, 7, 4, 0]
CHORDS = [(0, 4, 7), (-3, 0, 4), (-5, 0, 4), (-1, 2, 7)]


def tone(track, start, duration, midi, volume, style):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    begin, length = round(start * RATE), round(duration * RATE)
    harmonics = {
        "organ": (1, .35, .2), "synth": (1, .3, .15, .08),
        "bell": (1, .15, .4), "guitar": (1, .25, .12),
    }.get(style, (1, .12, .04))
    for j in range(length):
        t = j / RATE
        envelope = min(1, t / .02, (duration - t) / .09)
        envelope *= math.exp(-t * (5 if style in ("piano", "guitar", "bell") else 1.2))
        sound = sum(weight * math.sin(2 * math.pi * frequency * (k + 1) * t) for k, weight in enumerate(harmonics))
        track[(begin + j) % len(track)] += sound * envelope * volume


def generate(decade, tempo, style):
    beat = 60 / tempo
    track = array.array("f", [0]) * round(16 * beat * RATE)
    shift = ((decade - 1940) // 10 % 3) * 2
    for bar, chord in enumerate(CHORDS):
        for note in chord:
            tone(track, bar * 4 * beat, 3.9 * beat, 48 + note + shift, .08, style)
    for index, note in enumerate(MELODY):
        if index % 4 != 3:
            tone(track, index * beat + (.06 * beat if index % 2 else 0), .72 * beat, 72 + note + shift, .16, style)
    noise = random.Random(decade)
    for index in range(16):
        begin = round(index * beat * RATE)
        for j in range(round(.10 * RATE)):
            t = j / RATE
            kick = math.sin(2 * math.pi * (62 * t - 120 * t * t)) * math.exp(-t * 45) if index % 4 in (0, 2) else 0
            brush = noise.uniform(-1, 1) * math.exp(-t * 80) * (.2 if index % 4 in (1, 3) else .08)
            track[(begin + j) % len(track)] += (kick + brush) * .035
    peak = max(abs(sample) for sample in track)
    pcm = array.array("h", [round(sample / peak * .7 * 32767) for sample in track])
    with wave.open(str(ROOT / f"{decade}.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    for year, settings in STYLES.items():
        generate(year, *settings)
    print(f"Generated {len(STYLES)} original instrumental loops.")
