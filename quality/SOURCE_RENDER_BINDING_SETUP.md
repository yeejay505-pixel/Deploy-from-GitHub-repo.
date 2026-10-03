# Source-plan to approved-component render binding

This offline adapter belongs to the existing Animated AI Explainer Videos engine.
It connects the 03S intelligence contract to deterministic Canvas components
reused from the approved commercial-explainer v05 benchmark. The benchmark's
approval remains limited to that video's visuals. A new compiled plan or
render does not inherit creative, factual, voice or publication approval.

## Inputs and execution

A trusted local bundle contains `job.json`, `plan.json`, `timing.json` and
`design.json`, plus the original source, narration WAV, local fonts and
presenter sprite. `job.json` must originate from the retained intake job when
used in production; the CLI trusts its local operator and is not a public API.
`plan.json` is revalidated against its original claim candidates, source
quotes and visual profile before any rendering. This stage makes no model
calls and never generates arbitrary code from prose.

The design is an explicit, reviewed binding: each stable object ID selects a
supported component and maps every prose before/after state to numeric
parameters. Sentence actions select real word indices in the measured
narration, rather than guessed seconds. Unknown objects, states, components,
operations, transitions or metrics stop compilation. A semantic action must
change a visible mechanism parameter; opacity and highlights alone do not
qualify. State tracks carry continuously through sentence boundaries.

Supported components are building/construction, workspace unfolding and
fit-out, conceptual occupier queue, agreed-price lock, lease document,
source-bound metric range and a single-value bar. Building, workspace, tenant
routes, crane and lease geometry reuse the benchmark's deterministic component
library. Generated presenter artwork is a local asset. The paper texture is
procedural and seeded. An unavailable metaphor needs a designed component;
there is no fallback to the older limited scene renderer.

The two currently supported sentence transitions are carry and headline
fade. Full-field morphs/cuts and more elaborate scene choreography are pending.
A range cannot silently become a single bar. Counters and charts resolve the
same source metric by ID, retain measure/period/denominator labels and never
invent intermediate market values. Human review must still verify those
labels, units and source interpretation.

## Measured audio and reproducibility

`measured-narration.v1` specifies the exact narration, ordered word starts/ends,
local audio hash and measured duration. Guide and approved voice are separate
statuses. The compiler checks transcript identity, ordering, bounds and action
anchors. The renderer verifies file hashes and audio duration with FFprobe.
It cannot establish that a supplied alignment actually matches speech; the
alignment provider and human listening review remain required.

Asset paths must be relative to the local bundle and resolve inside it, even
through symlinks. Assets are checksum-checked. Both exact font files are
required. No URL fetching, new image generation or paid voice generation
occurs. Output is H.264/AAC at 1080 × 1920 and 30 fps, with word-timed captions
and action-timed procedural SFX. Music is not yet connected in this adapter.
The final frame count rounds duration up to a 30 fps boundary.

The render manifest retains the canonical claim ledger, all nine sentence
visual-argument fields, source-plan/timing/design hashes and pending review
flags. A saved manifest is provenance, not an independently trusted executable
input: the render CLI always recompiles the original four inputs. The manifest
alone cannot bypass the source, design or asset checks.

```sh
node scripts/render-source-plan.mjs /absolute/path/to/bundle output.mp4
node scripts/verify-source-render-binding.mjs /absolute/path/to/bundle
```

The CLI preflights all frames for text fitting, renders sentence stills and
writes a manifest plus technical QC. Text fitting is not a full readability
or visual-quality test: overlaps, composition, semantics, listening and actual
motion require human review. Width checks stop overflow instead of silently
shrinking or clipping it. All output remains `release_eligible=false`.

## Integration diagnostic

`build-source-render-example.mjs V05_PACKET_DIRECTORY BUNDLE_DIRECTORY` creates
an offline reproduction bundle using three nonconsecutive passages from the
approved sample: suitable supply, agreeing the purchase price during
construction, and the source-estimated yield range. This uses the supplied
investor script as its source, measured guide narration and existing presenter.
The plan and design are hand-authored diagnostic inputs, not a live 03S model
result or a complete investor pitch. The 7–12% assertion remains unverified.

The diagnostic runs 19.3 seconds, with four persistent objects, eight numeric
tracks and three sound events. It tests the adapter's construction, queue,
price-lock and range components; it does not establish regression quality for
every component or topic. The original approved v05 video remains unchanged.

## Remaining live integration

- Bind retained 03S drafts to a trusted design/component selection stage.
  Automatic template composition now supplies bindings for supported roles,
  operations and state names; see `SCENE_COMPOSER_SETUP.md`. Free-form
  metaphors and states still need reviewed designs.
- Connect final narration and a trustworthy alignment provider; verify voice.
- Add music, more transitions and missing visual components as needed.
- Connect this renderer to the live n8n project/session and durable render-job
  adapters with reviewed asset IDs rather than caller-supplied local paths.
- Validate a complete new-topic video through content, motion, audio and
  technical QC, then obtain creative review before release.

No live n8n binding, production deployment, paid call or publication is performed
by these scripts.
