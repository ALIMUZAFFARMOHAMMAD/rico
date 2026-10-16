"""Idempotently extend pnpm download timeouts in the pinned Vexa bot build."""
import sys
from pathlib import Path


def prepare(root):
    file = Path(root) / "core/meetings/services/bot/Dockerfile"
    source = file.read_text(encoding="utf-8")
    before = "pnpm install --frozen-lockfile=false"
    after = before + " --fetch-timeout=600000 --fetch-retries=5 --network-concurrency=4"
    if source.count(after) == 1:
        return False
    if source.count(before) != 1:
        raise RuntimeError("Unexpected bot Dockerfile; no files changed.")
    file.write_text(source.replace(before, after, 1), encoding="utf-8", newline="\n")
    return True


if __name__ == "__main__":
    changed = prepare(sys.argv[1])
    print("Download retry settings updated." if changed else "Download retry settings already applied.")
