# T37 Tactile Material Audio Audition

These mono 48 kHz WAV files are rendered directly from the production `audioPalette` and `renderProceduralSamples` implementation at the source SHA below.
The one-shot renderer applies the production bus/master gains and compressor transfer. It starts no server, browser, watcher, or audio device.
Source SHA: `0bebf8aff1f113990bfcd48a6f1a948b1dd22526`

Automated integrity checks passed: all samples are finite, every procedural layer has zero-valued endpoints, two independent renders produce byte-identical WAV output, peaks are bounded, and no sample clips.

| File | Duration | Peak | RMS | Clipped samples | Density | Listen for |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| [01-controls-repeat.wav](./01-controls-repeat.wav) | 1.71 s | 0.0345 | 0.0028 | 0 | 5.86 cues/s | Fast move and rotate repetition. Judge tactility, separation, and fatigue at realistic input density. |
| [02-contact-reward-ladder.wav](./02-contact-reward-ladder.wav) | 4.38 s | 0.2109 | 0.0162 | 0 | 1.37 cues/s | Lock, hard drop, then one- through four-line clears. Judge physical weight and positive hierarchy without sharpness. |
| [03-countdown.wav](./03-countdown.wav) | 3.17 s | 0.0763 | 0.0052 | 0 | 0.95 cues/s | Two related ticks and one longer resolving strike. Judge calm readiness rather than notification or melody. |
| [04-ice-material.wav](./04-ice-material.wav) | 2.19 s | 0.0920 | 0.0119 | 0 | 0.92 cues/s | Two isolated Ice activations. Judge restrained crystal identity, grain, and repeat comfort. |
| [05-play-cadence.wav](./05-play-cadence.wav) | 5.24 s | 0.2109 | 0.0154 | 0 | 2.48 cues/s | Representative play cadence for masking, contact-to-reward hierarchy, and Ice identity in context. |

## Cue boundaries

- **01-controls-repeat.wav:** move 0.16-0.20 s; move 0.24-0.28 s; move 0.32-0.36 s; move 0.40-0.44 s; move 0.48-0.52 s; move 0.56-0.60 s; rotate 0.78-0.85 s; rotate 0.90-0.97 s; move 1.14-1.18 s; rotate 1.28-1.35 s
- **02-contact-reward-ladder.wav:** lock 0.16-0.25 s; hard-drop 0.58-0.75 s; clear-1 1.06-1.24 s; clear-2 1.72-1.95 s; clear-3 2.48-2.78 s; clear-4 3.34-3.86 s
- **03-countdown.wav:** countdown-tick 0.20-0.34 s; countdown-tick 1.20-1.34 s; countdown-resolve 2.20-2.45 s
- **04-ice-material.wav:** freeze 0.18-0.60 s; freeze 1.24-1.67 s
- **05-play-cadence.wav:** move 0.16-0.20 s; move 0.25-0.29 s; rotate 0.39-0.46 s; hard-drop 0.64-0.81 s; clear-1 1.02-1.20 s; move 1.56-1.60 s; rotate 1.70-1.77 s; hard-drop 1.94-2.11 s; clear-2 2.32-2.55 s; freeze 2.94-3.37 s; move 3.54-3.58 s; hard-drop 3.80-3.97 s; clear-4 4.20-4.72 s

Human listening remains the acceptance boundary. These measurements reject broken renders; they cannot approve timbre, balance, fatigue, material identity, or device loudness.
