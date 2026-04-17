# tests/golden/ — Regression baselines (metadata only)

This directory contains **hashes and stylometric fingerprints** of the three canonical
benchmark reports. Privileged case content lives under `Cases/<id>/expected/` and is
gitignored — hashes and fingerprints are one-way derivations and are safe to commit.

## Current baseline files

Layer 1 (hash verify):
- `gleason.sha256` — SHA-256 hashes of `Cases/gleason/expected/**`
- `heagy.sha256` — SHA-256 hashes of `Cases/heagy/expected/**`
- `anderson.sha256` — SHA-256 hashes of `Cases/anderson/expected/**`

Layer 2 (stylometric fingerprint):
- `gleason.voice.json` — extracted features of `Cases/gleason/expected/**`
- `heagy.voice.json` — extracted features of `Cases/heagy/expected/**`
- `anderson.voice.json` — extracted features of `Cases/anderson/expected/**`

## Pending bless actions

Per `.voice-bless-pending`, fingerprints for all three goldens are awaiting
generation. They must be blessed on a machine where `Cases/<id>/expected/` is
staged. Run from the repo root:

    /ultraplan voice-bless gleason
    /ultraplan voice-bless heagy
    /ultraplan voice-bless anderson

Each command is confirmation-gated (Tier 1). After all three, commit the three
generated `.voice.json` files. Delete `.voice-bless-pending` in the same commit.

The same pattern applies to Layer 1 hashes (`/ultraplan bless <id>`) — those
baselines are also pending.

## Privilege posture

Only `.sha256` and `.voice.json` files may live here, plus this README and the
transient `.voice-bless-pending` marker. Any other file is a HARD FAIL per
Invariants E and F — `/ultraplan audit` will flag and refuse.
