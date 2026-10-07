"""Original TGSlots music and sound effects. Requires numpy/scipy and FFmpeg.

All sound is synthesized from oscillators and seeded noise; no sampled recordings.
Writes lossless masters plus browser MP3 assets. Music tails wrap into the start.
"""
from pathlib import Path
import json
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

RATE = 48000
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'apps/web-client/public/assets/sounds/original'
MASTERS = ROOT.parent / 'audio-masters'
OUT.mkdir(parents=True, exist_ok=True)
MASTERS.mkdir(parents=True, exist_ok=True)
random = np.random.default_rng(194852)


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def tone(note, duration, kind='pluck'):
    t = np.arange(round(duration * RATE)) / RATE
    f = frequency(note)
    if kind == 'pad':
        wave = sum(np.sin(2 * np.pi * f * detune * harmonic * t)
                   / harmonic ** 2.3
                   for detune in (0.9985, 1.0015) for harmonic in (1, 2, 3, 4)) / 2
        envelope = np.minimum(t / .75, 1) * np.minimum((duration - t) / 1.8, 1)
        return wave * np.maximum(envelope, 0) * .065
    if kind == 'flute':
        vibrato = .0018 * np.sin(2 * np.pi * 4.6 * t) * np.minimum(t / .4, 1)
        phase = 2 * np.pi * np.cumsum(f * (1 + vibrato)) / RATE
        wave = np.sin(phase) + .12 * np.sin(phase * 2) + .04 * np.sin(phase * 3)
        envelope = np.minimum(t / .12, 1) * np.minimum((duration - t) / .35, 1)
        breath = sosfilt(butter(2, [700, 3500], 'bandpass', fs=RATE, output='sos'),
                        random.normal(0, 1, len(t))) * .015
        return (wave * .07 + breath) * np.maximum(envelope, 0)
    if kind == 'bell':
        wave = sum(np.sin(2 * np.pi * f * harmonic * t)
                   * np.exp(-t * (1.8 + i * .45)) / (i + 1) ** 1.7
                   for i, harmonic in enumerate((1, 2, 3, 4.2, 5.4)))
        return wave * np.minimum(t / .008, 1) * .095
    if kind == 'bass':
        wave = np.sin(2 * np.pi * f * t) + .15 * np.sin(4 * np.pi * f * t)
        return wave * np.minimum(t / .025, 1) * np.exp(-t * 2.2) * .13
    wave = sum(np.sin(2 * np.pi * f * harmonic * t)
               * np.exp(-t * (2 + harmonic * .45)) / harmonic ** 1.45
               for harmonic in range(1, 8))
    return wave * np.minimum(t / .005, 1) * .105


def add(buffer, sound, at, gain=1, pan=0, wrap=False):
    start = round(at * RATE)
    indexes = np.arange(len(sound)) + start
    if wrap:
        indexes %= len(buffer)
    else:
        valid = indexes < len(buffer)
        indexes, sound = indexes[valid], sound[valid]
    angle = (pan + 1) * np.pi / 4
    np.add.at(buffer[:, 0], indexes, sound * gain * np.cos(angle))
    np.add.at(buffer[:, 1], indexes, sound * gain * np.sin(angle))


def export(name, samples, loudness):
    samples = sosfilt(butter(2, 38, 'highpass', fs=RATE, output='sos'), samples, axis=0)
    peak = np.max(np.abs(samples))
    if peak > .85:
        samples *= .85 / peak
    source = MASTERS / f'{name}.wav'
    write(source, RATE, samples.astype(np.float32))
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                    '-af', f'loudnorm=I={loudness}:TP=-2:LRA=7', '-ar', str(RATE),
                    '-c:a', 'libmp3lame', '-q:a', '3', str(OUT / f'{name}.mp3')], check=True)
    return {'file': f'{name}.mp3', 'seconds': round(len(samples) / RATE, 3),
            'targetLufs': loudness, 'synthesis': 'Original oscillators and seeded noise'}


catalog = []
themes = {
    'dragon-sanctuary': (78, [[48, 55, 63, 67], [44, 51, 60, 63], [46, 53, 62, 65], [43, 50, 58, 62]],
                         [72, 75, 79, 77, 75, 72, 70, 67], 'flute'),
    'forest-afterglow': (72, [[50, 57, 61, 66], [47, 54, 57, 62], [43, 50, 57, 59], [45, 52, 57, 62]],
                         [74, 78, 81, 85, 81, 78, 76, 73], 'bell'),
    'steel-horizon': (92, [[38, 45, 53, 57], [34, 41, 50, 53], [41, 48, 57, 60], [36, 43, 52, 55]],
                      [62, 65, 69, 72, 69, 65, 64, 60], 'pluck'),
}
for name, (bpm, chords, melody, lead) in themes.items():
    beat = 60 / bpm
    length = 32 * 4 * beat
    track = np.zeros((round(length * RATE), 2), dtype=np.float64)
    for bar in range(32):
        chord = chords[(bar // 2) % 4]
        start = bar * 4 * beat
        if bar % 2 == 0:
            for i, note in enumerate(chord):
                add(track, tone(note, 8 * beat + 2, 'pad'), start,
                    .8 if name != 'steel-horizon' else .65, (i - 1.5) * .25, True)
        add(track, tone(chord[0], 1.4, 'bass'), start, .6, 0, True)
        for step in (0, 1.5, 2.5, 3.5):
            index = (bar + round(step * 2)) % len(chord)
            add(track, tone(chord[index] + 12, 2.2, 'pluck'), start + step * beat,
                .26 if name == 'dragon-sanctuary' else .2, (-1 if index % 2 else 1) * .35, True)
        if bar % 4 in (1, 2):
            for phrase in (0, 2):
                note = melody[(bar + phrase + bar // 8) % len(melody)]
                add(track, tone(note, 1.5 * beat, lead), start + (phrase + .5) * beat,
                    .7, -.12 if phrase == 0 else .12, True)
        if name == 'steel-horizon':
            for step in (0, .75, 1.5, 2, 2.75, 3.5):
                add(track, tone(chord[0] + 12, .42, 'bass'), start + step * beat, .3, 0, True)
            for step in (1, 3):
                t = np.arange(round(.09 * RATE)) / RATE
                click = random.normal(0, 1, len(t)) * np.exp(-t * 65)
                click = sosfilt(butter(2, [700, 2800], 'bandpass', fs=RATE, output='sos'), click)
                add(track, click, start + step * beat, .055, .2, True)
    # Tempo-synced circular delays preserve a seamless loop and add stereo depth.
    dry = track.copy()
    for beats, gain in ((.75, .2), (1.5, .10), (2.25, .045)):
        delay = round(beats * beat * RATE)
        track += np.roll(dry[:, ::-1], delay, axis=0) * gain
    catalog.append(export(name, track, -22))

effects = {}
t = np.arange(round(.27 * RATE)) / RATE
noise = random.normal(0, 1, len(t))
whoosh = sosfilt(butter(2, [250, 2800], 'bandpass', fs=RATE, output='sos'), noise)
effects['spin-soft'] = whoosh * np.sin(np.pi * t / .27) ** 2 * .2
t = np.arange(round(.11 * RATE)) / RATE
effects['reel-settle'] = (np.sin(2 * np.pi * (160 * t + 40 * t ** 2))
                          + .25 * random.normal(0, 1, len(t))) * np.exp(-t * 55) * .3
for name, notes in {'win-soft': [72, 76, 79], 'win-major': [60, 67, 72, 76, 79, 84],
                    'feature-rise': [62, 65, 69, 74], 'card-reveal': [81]}.items():
    mix = np.zeros((round((1.5 if len(notes) > 3 else .8) * RATE), 2))
    for i, note in enumerate(notes):
        add(mix, tone(note, .9, 'bell'), i * .085, .8, (i / len(notes) - .5) * .4)
    catalog.append(export(name, mix, -19))
t = np.arange(round(.5 * RATE)) / RATE
launch = sosfilt(butter(2, [120, 4000], 'bandpass', fs=RATE, output='sos'),
                random.normal(0, 1, len(t))) * np.sin(np.pi * t / .5) ** 1.5
effects['launch-air'] = launch * .22
t = np.arange(round(.45 * RATE)) / RATE
impact = (np.sin(2 * np.pi * (80 * t - 45 * t ** 2)) * np.exp(-t * 14)
          + sosfilt(butter(2, 1100, 'lowpass', fs=RATE, output='sos'),
                    random.normal(0, 1, len(t))) * np.exp(-t * 17))
effects['impact-soft'] = impact * .28
for name, sound in effects.items():
    catalog.append(export(name, np.column_stack([sound, sound]), -20))
(OUT / 'provenance.json').write_text(json.dumps({'source': 'compose-game-audio.py',
    'thirdPartyRecordings': False, 'sampleRate': RATE, 'assets': catalog}, indent=2) + '\n')
print(json.dumps(catalog, indent=2))
