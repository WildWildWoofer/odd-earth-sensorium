# Odd Earth // Sensorium v0.2

A deploy-ready, dependency-free prototype for Odd Earth's Human Instrumentation platform.

## What works now

- Public Odd Earth landing page
- Four training modules:
  - **Heart:** real CirCor / PhysioNet phonocardiograms
  - **Lungs:** real event-labelled SPRSound clips
  - **Echo:** browser-generated binaural reflection task, with VisualEchoes as the open research foundation
  - **Pulse:** arterial-waveform discrimination plus optional Web Serial hardware bridge
- Adaptive difficulty
- Confidence scoring
- Reaction-time logging
- Blind benchmark mode
- Patient-held-out train/evaluation splits in the curated manifests
- Local Human Instrument Profile via `localStorage`
- Exportable JSON profile
- No framework, package manager or build step

## Run locally

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

The repository is ready to publish from the repository root.

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Scientific status

This is a research/training prototype, not a medical diagnostic or competency certification platform.

Before any professional claim, each module should have:

- subject/scene-level train/test separation,
- no-feedback evaluation blocks,
- prospectively held-out transfer sets,
- external validation in the intended professional context.

## Data provenance

See:

- `DATASETS.md`
- `ATTRIBUTIONS.md`
- `data/real-data.js`

Heart and Lung training currently stream the original public research recordings rather than mirroring full datasets.

## Philosophy

> The human is the instrument.

Odd Earth trains biology first, amplifies weak signals second, and translates new physical information into human-readable sensory channels only when necessary.
