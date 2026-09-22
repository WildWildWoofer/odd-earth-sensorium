# Real dataset integration — Sensorium v0.2

## Heart — CirCor DigiScope
Source: https://physionet.org/content/circor-heart-sound/1.0.3/

- Original recordings are streamed directly from PhysioNet.
- Dataset license: Open Data Commons Attribution 1.0.
- `data/real-data.js` contains a deliberately small curated set.
- Production rule: hold out entire patient IDs.

## Lungs — SPRSound
Source: https://github.com/SJTU-YONGFU-RESEARCH-GRP/SPRSound

- CC BY 4.0.
- WAV files and JSON annotations live in the public GitHub repository.
- v0.2 streams labelled event windows from real recordings.
- Initial classes: Normal / Wheeze / Crackles.
- Blind benchmark subjects are distinct from training subjects.

## Echo — VisualEchoes
Source: https://github.com/facebookresearch/VisualEchoes

- VisualEchoes dataset: CC BY 4.0; review underlying Habitat-Sim / Replica / SoundSpaces terms too.
- Current task generates binaural reflection geometry in-browser.
- v0.3 target: scene-held-out genuine binaural echo/RIR samples.

## Pulse — Pulse Wave Database
Source: https://zenodo.org/records/3339560

- Start with the small six-subject baseline bundle.
- Convert arterial pressure waveforms to compact browser JSON.
- Verify redistribution terms before committing derived waveform data publicly.

## Provenance rules

Every stimulus should eventually log:
- dataset + version,
- subject/scene ID,
- source file,
- segment boundaries,
- label,
- train/evaluation/transfer split,
- transformation applied,
- playback gain,
- user answer,
- confidence,
- reaction time.

Never split repeated recordings from the same person across train and evaluation.
