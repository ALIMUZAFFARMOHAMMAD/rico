"""Prepare the pinned CPU bot build without optional CUDA downloads."""
import sys
from pathlib import Path


def prepare(root):
    file = Path(root) / "core/meetings/services/bot/Dockerfile"
    source = file.read_text(encoding="utf-8")
    before = "pnpm install --frozen-lockfile=false"
    retry = before + " --fetch-timeout=600000 --fetch-retries=5 --network-concurrency=4"
    after = "ONNXRUNTIME_NODE_INSTALL=skip " + retry
    if source.count(after) == 1:
        return False
    if source.count(before) != 1:
        raise RuntimeError("Unexpected bot Dockerfile; no files changed.")
    old = retry if retry in source else before
    file.write_text(source.replace(old, after, 1), encoding="utf-8", newline="\n")
    return True


if __name__ == "__main__":
    changed = prepare(sys.argv[1])
    print("CPU-only dependency download settings updated." if changed else "CPU-only dependency download settings already applied.")
