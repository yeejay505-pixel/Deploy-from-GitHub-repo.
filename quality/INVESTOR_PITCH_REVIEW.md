# Existing engine: commercial investor pitch review

The earlier commercial preview did not meet the user's graphics, animation and
SFX expectations. This new composition is a review candidate, not an approved
creative baseline and not a live-production rollout.

## Implemented review pipeline

1. Extract only the requested source slide range and retain slide, shape and
   paragraph locations in a claim ledger.
2. Separate undated market claims and inconsistent supply totals from usable
   definitions, conditional mechanisms and clearly marked worked examples.
3. Choose one mechanism, then record cause, action and consequence for each
   narration sentence.
4. Generate a temporary local guide voice and read its actual phoneme-derived
   word times. Build scene durations from the audio, not words per minute.
5. Render deterministic architectural drawings, selected-floor expansion,
   occupants, construction, leasing, cash flow and shared-value calculations.
6. Mix the guide voice with an original instrumental bed and layered action
   sounds. Preserve stereo and duck music beneath narration.
7. Check claim eligibility, timing coverage, metric arithmetic, track continuity,
   furniture geometry, text margins and encoded video/audio properties.

`src/semantic/investor-pitch.mjs` supplies the drawing and timed-state logic.
`scripts/render-investor-pitch.mjs` prepares a storyboard, renders stills or
encodes a full video. `scripts/verify-investor-pitch.mjs` validates a supplied
plan and ledger. Project-specific supplied content stays outside this repository.

This is an explicit commercial-pitch composition with supported scene modes.
It does not add these modes to the existing strict scene API or expose arbitrary
generated code. Source ingestion and voice generation were executed locally;
the work is not evidence of a live automated OpenAI/n8n run.

## Review limits

The voice is deliberately a timing guide and requires final selection and
approval. Numerical source conflicts remain listed for review rather than
becoming promises of future performance. Automated QC does not certify
watchability. The user still needs to assess the exact combined sample.

The composition belongs to the existing engine only. It is not transferred into
the separate V2.0 project.
