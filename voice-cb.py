# Reads narration lines with Chatterbox (Resemble AI, MIT licence). This is "Voice 1", the owner's
# chosen narrator: the model's built in default voice, default settings.
#   python voice-cb.py <lines.json> <outDir>     lines.json = { lines: [{ key, text }] }
# Clips that already exist are skipped, so a run that was cut short can be continued.
import json, os, sys, time, wave, zlib
import numpy as np, torch
from chatterbox.tts import ChatterboxTTS

job = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
todo = [l for l in job["lines"] if not os.path.exists("%s/%s.raw.wav" % (out, l["key"]))]
print("voice 1: %d lines to read, %d already saved" % (len(todo), len(job["lines"]) - len(todo)), flush=True)
if todo:
    model = ChatterboxTTS.from_pretrained(device="cpu"); t0 = time.time(); total = 0.0
    for n, l in enumerate(todo):
        torch.manual_seed(zlib.crc32(l["key"].encode()))
        x = model.generate(l["text"]).squeeze().detach().cpu().numpy()
        tmp = "%s/%s.part" % (out, l["key"])
        with wave.open(tmp, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(int(model.sr)); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
        os.replace(tmp, "%s/%s.raw.wav" % (out, l["key"])); total += len(x) / model.sr
        print("voice 1 %s %d of %d, %.1fs of audio, %.0fs elapsed" % (l["key"], n + 1, len(todo), total, time.time() - t0), flush=True)
