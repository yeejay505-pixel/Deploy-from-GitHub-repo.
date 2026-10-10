# Automatic visual design and scene composition — existing engine

`composer-1` selects deterministic components, numeric state bindings, fixed
persistent layouts, measured action anchors, presenter poses and headline
transitions from a validated source-intelligence plan. It replaces manual
`design.json` authoring for the specifically supported semantic templates.
It is an offline stage of Animated AI Explainer Videos, not the standalone
V2.0 engine and not a claim of universal creative automation.

## Flow

Retained source job → validated 03S visual argument → measured narration →
trusted local asset catalog → automatic composition → source renderer → QC.

The source-planning request now includes optional `composition_state_hints`.
They list exact supported semantic states, without numeric construction or
queue fractions. The planner should use them only when they fit the intended
mechanism. An unfamiliar metaphor stays explicit for review; source arguments
must not be simplified merely to fit the available renderer.

The composer chooses components from object role, kind, metric IDs and the
full sequence of requested operations. It maps the exact declared states to
local numeric presets. Supported graphics are building/construction, workspace,
continuous office lifecycle, conceptual queue, price lock, lease, assessment
checklist, source range and single-value bar. The lifecycle graphic retains one
object ID as the building becomes its selected floor, fitted desks and routed
occupiers. The checklist is a conceptual assessment cue, not passed diligence.

Numeric construction, queue, furniture and occupancy progress is illustrative.
It does not become a completion schedule, market count, occupancy estimate or
source claim. A source chart/counter instead uses the exact selected metric
and its measure, period and denominator. A range is never collapsed into a
single bar. Qualified figures such as “less than,” “around” or “at least”
are not allowed to masquerade as exact bars; they need an appropriate panel
or a new component. Source quantities need supported spoken-number anchors; otherwise
the composer requests review.

## Boundaries and failure behavior

- Known state phrases are normalized only for case, whitespace and punctuation.
  This is a finite semantic vocabulary, not an AI understanding of arbitrary
  prose. Free-form states need an additional reviewed template or design step.
- Components support only their declared operations. Generated presenter,
  atmospheric imagery, standalone text objects, balance scales, negative-value
  charts, multiple independent metrics and novel metaphors need other designs.
- A supported component still needs an action that changes a visible mechanism;
  opacity/highlights alone cannot substitute for one.
- Layouts are persistent fixed template slots. Conservative component/text
  bounds check source-state/action starts, midpoints and ends against safe
  areas, the presenter reservation and co-visible objects. A conflict requests
  review. There is not yet a general packing or camera-layout solver.
- Context retirements are anchored to initial measured words. A new panel in
  the same area starts after the retirement finishes, using actual word
  boundaries. Only carry and headline-fade transitions are supported.
- Composition failure is atomic: there is no partial renderable design. The
  CLI clears previous generated design/manifest files before checking inputs
  or assets and writes an explicit review report. A missing or changed asset
  cannot leave a stale successful design for the current run.
- Local asset catalogs are trusted operator inputs; hashes establish byte
  identity, not creative approval. Paths must resolve within the bundle. A
  public service must use retained server jobs and curated asset IDs, not
  arbitrary caller-provided JSON or local paths.

`composition-review.json` records component and anchor decisions, issues and
input/design hashes. `composition-capabilities.json` lists actual supported
states and operations. Ready means structurally composable; it does not mean
factual, semantic, voice, visual or publication approval. Output stays
`release_eligible=false`.

## Local reproduction

Bundle inputs: `job.json`, `plan.json`, `timing.json`, `asset-catalog.json`,
original source, local narration, presenter and exact font files.

```sh
node scripts/compose-source-plan.mjs /absolute/path/to/bundle
node scripts/render-source-plan.mjs /absolute/path/to/bundle output.mp4
node scripts/verify-scene-composer.mjs TRIAL_BUNDLE EARLIER_BINDING_BUNDLE
```

`build-measured-guide.py BUNDLE` can create an offline temporary CMU AWB guide
using installed libflite libraries. It measures synthesizer word/phoneme
boundaries on the exact waveform and verifies transcript token merging. There
is no time-stretching or target-duration squeeze. It is not a final voice or
speech-recognition forced alignment, and requires that local library runtime.
No network, paid model, image or voice call occurs in this stage.

## Source-based full-story trial

`build-composition-trial.mjs SOURCE_PPTX V05_ASSET_DIRECTORY OUTPUT_BUNDLE`
creates an eight-sentence story from the supplied commercial presentation,
selected slides 4–14. It explains delivery → useful fit-out → occupier use →
lease conditions → asset assessment. Narration and semantic argument are
hand-authored, with six exact source claims. No numerical return or tax claim
is narrated. Source interpretation remains for human review.

The resulting design is generated by the composer with no handcrafted design
file. The trial runs 40.7 seconds at 1080 × 1920 / 30 fps, H.264/AAC, with four
persistent objects, thirteen parameter tracks and eight action-timed SFX.
All 1,220 frames passed text-fitting preflight and technical QC. The original
approved v05 remains unchanged and is still the visual benchmark; this trial
has not received creative approval.

Twenty composer checks cover supported composition, deterministic output, original
citations, unknown states/metaphors, profile/assets, measured quantity anchors,
collision checks, continuity, stale-output removal and actual pixel changes in
each sentence's explanatory component. Pixel tests freeze incidental crane
motion and exclude captions/presenter changes. These checks do not prove that
the visual action expresses the intended causal meaning or matches v05's
complete creative quality.

## Remaining integration

Live 03S model execution, durable composition/render jobs, trusted project and
asset adapters, final voice/alignment, music and additional components or
transitions remain pending. The automatic source request now advertises the
composer's vocabulary, but the actual model has not been run through this new
stage. A complete fresh-topic model → design → final video trial and human
creative review are still required before production activation.
