# Explainer engine — creative reset, benchmark 01

The supplied startup explainer is the visual quality reference. The prior Yards
technical QA pass does not imply creative approval or production readiness.

## First reviewable implementation

`OfficeBenchmark` is a 20-second, 1080 × 1920, 30 fps Remotion composition.
Its deterministic Canvas drawing also renders through the offline preview script.
It is a new composition; the current ProductionScene and production endpoints
are unchanged. It is not yet selected by n8n and does not alter live jobs.

The benchmark demonstrates:

1. A building facade with a specific highlighted floor.
2. That same floor expanding into a top-down layout.
3. A partition forming and moving to accommodate different team sizes.
4. Furniture staying inside the correct room as geometry changes.
5. Twelve illustrative people entering via the corridor, settling at desks,
   and driving a counter that reflects actual settled occupants.
6. A resolved final composition held through the final frame.

The scene is a conceptual diagram, not a real masterplan or market forecast.
The 12 desks and fully populated end state are illustrative, not Yards claims.
The on-screen phrases are a proposed narration guide. The first preview has
event-linked SFX; natural voice, word timestamps and final synchronization are pending.

## Narration draft

> An office building gives you space.
> But different teams need different layouts.
> So the floor has to adapt.
> Then businesses have to move in.
> Space. The right fit. People who use it.

Delivery: conversational, thoughtful and clear. Use pauses between arguments;
emphasize "different", "adapt" and "move in". Select the voice by listening to
short samples before committing to a full render. Fit animation to approved
voice timestamps, rather than speeding up the voice to fit an imposed duration.

## Acceptance

The human reviewer must approve visual logic, finished motion, readability,
natural voice, supportive sound and narration/visual synchronization, and rate
the exact combined sample at least 8/10. Missing voice approval blocks release.
`creative-contract.mjs` defines this rule; it is a draft approval validator and
has not yet been connected to live production endpoints or n8n.

Automated checks can flag geometry, counts, missing assets and timing errors.
They do not establish watchability or faithfully judge narration performance.
The code's state invariants are checked by `verify-office-benchmark.mjs`.

## Next integration work

After the sample is approved, connect explicit component IDs to a renderer
registry. Reject unsupported behaviours rather than converting them into a
generic layout. Keep semantic object IDs and state transitions in the recipe.
Expose a preview route that cannot trigger full production before exact-sample
creative approval, and connect its review outcome to the existing final workflow.

Extend the tested vocabulary with chart growth, dependent systems, object
transformation, comparisons and character interactions. Each component needs
its own visual benchmark; one office scene does not prove a universal engine.

## Local commands

```sh
node scripts/verify-office-benchmark.mjs
node scripts/render-office-benchmark.mjs /absolute/path/sample.mp4 1080
python3 scripts/benchmark-sound.py /absolute/path/sfx.wav
```

The offline script requires `@napi-rs/canvas`, from a local installation or
`CODEX_PRIMARY_RUNTIME_NODE_MODULES`, plus FFmpeg and DejaVu fonts. It is an
optional preview utility, not a new live-service dependency. The existing
Remotion environment can render composition `OfficeBenchmark` directly.
