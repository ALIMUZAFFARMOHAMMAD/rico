"""Keep a closed speaker turn until its pending STT responses settle.

Patch only the pinned Vexa pipeline. No changes to AI disclosure, ownership,
audio permissions, confidence filtering or echo protection.
"""
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
for relative in ("core/meetings/modules/gmeet-pipeline/src/gmeet-pipeline.ts",
                 "core/meetings/modules/gmeet-pipeline/dist/gmeet-pipeline.js"):
    target = root / relative
    if not target.is_file():
        continue
    source = target.read_text()
    typescript = target.suffix == ".ts"
    typed = ": string" if typescript else ""
    if "transcriptionQueue" not in source:
        # A CPU service accepts one request at a time. Keep per-channel identities,
        # but serialize STT so simultaneous turns do not exhaust all retries.
        needle = "const mgr = new SpeakerStreamManager(opts.config);"
        if source.count(needle) != 1:
            raise RuntimeError("Unexpected pinned pipeline: manager declaration")
        source = source.replace(needle, """const mgr = new SpeakerStreamManager({ ...opts.config, callbackStampedFrames: true });
  let transcriptionQueue = Promise.resolve();
""")
        needle = "const r = await opts.transcribe(audio, mgr.getLastConfirmedText(speakerId) || undefined);"
        if source.count(needle) != 1:
            raise RuntimeError("Unexpected pinned pipeline: transcribe call")
        source = source.replace(needle, """const task = transcriptionQueue.then(() =>
          opts.transcribe(audio, mgr.getLastConfirmedText(speakerId) || undefined));
        transcriptionQueue = task.then(() => {}, () => {});
        const r = await task;""")
        # A one-second delivery gap under CPU pressure is not a reliable end of
        # utterance. Confident speaker-name changes still split immediately.
        source = source.replace("opts.onsetGapMs ?? 1000", "opts.onsetGapMs ?? 3000")
    if "closedTurns" in source:
        target.write_text(source)
        print("Updated CPU queue", relative)
        continue
    needle = "const inflight = new Set<Promise<void>>();" if typescript else "const inflight = new Set();"
    extra = f"""
  // Closed turns must outlive slow STT and any deferred final resubmission.
  const pendingTurns = new Map{"<string, number>" if typescript else ""}();
  const closedTurns = new Set{"<string>" if typescript else ""}();
  const releaseClosedTurn = (key{typed}) => {{
    if (closedTurns.has(key) && !pendingTurns.get(key)) {{
      closedTurns.delete(key);
      pendingTurns.delete(key);
      mgr.removeSpeaker(key);
    }}
  }};
"""
    if source.count(needle) != 1:
        raise RuntimeError("Unexpected pinned pipeline: inflight declaration")
    source = source.replace(needle, needle + extra)
    needle = "mgr.onSegmentReady = (speakerId, _name, audio) => {"
    if source.count(needle) != 1:
        raise RuntimeError("Unexpected pinned pipeline: segment callback")
    source = source.replace(needle, needle + "\n    pendingTurns.set(speakerId, (pendingTurns.get(speakerId) || 0) + 1);")
    needle = "void p.finally(() => inflight.delete(p));"
    if source.count(needle) != 1:
        raise RuntimeError("Unexpected pinned pipeline: finalizer")
    source = source.replace(needle, """void p.finally(() => {
      inflight.delete(p);
      pendingTurns.set(speakerId, (pendingTurns.get(speakerId) || 1) - 1);
      releaseClosedTurn(speakerId);
    });""")
    start = source.index("  const closeTurn = " if typescript else "    const closeTurn = ")
    end = source.index("\n  };" if typescript else "\n    };", start) + (5 if typescript else 7)
    source = source[:start] + f"""  const closeTurn = (key{typed}) => {{
    closedTurns.add(key);
    void mgr.flushSpeaker(key, true).catch(() => {{ /* nothing owed */ }})
      .finally(() => releaseClosedTurn(key));
  }};""" + source[end:]
    target.write_text(source)
    print("Patched", relative)
