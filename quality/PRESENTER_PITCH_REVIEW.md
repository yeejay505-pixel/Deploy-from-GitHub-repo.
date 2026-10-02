# Commercial investor pitch: original Emirati presenter review

The investor pitch now uses a recurring original Emirati presenter in a white
kandura, ghutra and agal. It retains the reviewed slide4–14 claim ledger and the
measured91.44-second temporary narration, with a Problem → Mechanism →
Consequence spine. This is a creative review, not an approved final baseline.

The native composition is in `src/semantic/presenter-pitch.mjs`. It reuses the
existing exact office/floor geometry and metric state from `investor-pitch.mjs`.
The local JSON manifest contains18 grammatical sentence beats, each with the
requested visual metaphor, object identities, before/action/after states,
quantity treatment, text role, sound cue and transition. It also contains62
state actions,67 declared objects,27 presenter pose events,11 short scene
dissolves and40 timed stereo SFX cues. Numbers, chart geometry and readable
text are drawn deterministically. No generated video is used.

The presenter master and six-pose transparent PNG are generated original assets,
kept with the local inputs. Pose changes use brief eased dissolves, anchored
feet and subtle speech-timed nods. This is pose animation, not phoneme lip sync.
Final voice and creative approval remain pending. The exact generation prompts,
assets, fonts, source data, stems and JSON plan belong in the reproduction packet.

Commands:

```sh
node scripts/render-presenter-pitch.mjs stills /path/to/inputs/render-plan.json /path/to/still 5,23,46,69,75,90
node scripts/render-presenter-pitch.mjs render /path/to/inputs/render-plan.json /path/to/output.mp4
node scripts/verify-investor-pitch.mjs /path/to/inputs/render-plan.json /path/to/inputs/claim-ledger.json /path/to/state-qc.json
node scripts/verify-presenter-pitch.mjs /path/to/inputs/render-plan.json /path/to/presenter-qc.json
```

The second verifier measures diagram changes across every spoken sentence with
headlines, captions and the presenter excluded. It also checks actual text
bounds and presenter collisions. Pixel change and technical checks do not
certify artistic quality; the user must assess the combined rendered film.

The new composition remains an explicit local review mode for the existing
Animated AI Explainer Videos engine. It is not added to the live API capability
schema, deployed to n8n, or transferred into the separate V2.0 project.
`releaseEligible` remains false.
