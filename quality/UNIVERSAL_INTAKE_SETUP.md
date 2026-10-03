# Workflow 00: approved visual reference and universal intake

The owner approved the visual design and animation of Commercial Offplan
Supply Gap Investor Pitch v05 on 3 October 2026. The immutable video hash and
approval scope live in `approved-visual-reference.json`. Future topics inherit
this quality reference, with their own creative review. The current character
can be replaced later. Approval does not certify the unverified figures,
temporary guide voice, publication or live deployment.

Workflow 24's saved setup identifies Universal Intake + Router as the next
architecture step. This implementation belongs to **Animated AI Explainer
Videos**, not the separate Yeejay AI Vid Engine V2.0.

## What is implemented

`intake/universal-router.mjs` normalizes one Telegram event, preserves the
original brief and downloaded binary, selects an intelligence/command route,
and attaches the approved visual reference. It reuses the existing Projects
fields and stores profile requirements in `requested_visuals_json`; it does
not invent an extra required Projects column. Event keys are stable across
retries and scoped by chat. This key supports durable deduplication but is not
itself a durable deduplication store.

| Input | Intended route | Existing destination |
| --- | --- | --- |
| Topic or detailed brief | Research / story | Bind compatible current general intelligence workflow |
| Captioned document, image or video | Source extraction / intelligence | Source-aware adapter required |
| Uncaptioned media | Reference analysis | Analyze before inferring a video brief |
| Voice note | Transcription | Transcription adapter required |
| `/reprelaunch KEY` | Real-estate intelligence | 18.1 |
| `/recreative KEY` | Asset-aware script / creative | 19B |
| `/assetmode KEY`, `/assetdone` | Durable asset session | 19A |
| `/voice VID-ID` | Voice production | 20.2 |
| `/final VID-ID` | Final assembly | 24.1 |
| Revision with explicit VID-ID | Revision router | Adapter required |

The inactive generated workflow supports manual dry runs and sub-workflow
input. It makes no external calls in its default configuration. It does not
send Telegram messages or install a second webhook. Its optional dispatch
node has no gateway ID configured. A handoff is not a completed render or a
publication approval.

## Gateway implementation and remaining live contract

Atomic request/source storage, bounded text extraction, lease reservation and
receipt handling are now implemented locally with an inactive 00G export.
See `INTAKE_GATEWAY_SETUP.md`. They are not deployed or live-bound. Trusted
project/session adapters, semantic intelligence and renderer production gates
remain pending. The checklist below defines the full live contract.

The bound gateway must be a tested sub-workflow, with **When Executed by
Another Workflow / Accept all data** and access restricted to the ingress.
It receives the entire normalized item and binary. Before paid operations:

1. Atomically reserve `idempotency_key` in a durable store with a unique
   constraint. A duplicate returns its existing job status; concurrent retries
   must not start another generation. Do not use an in-memory Set or a Sheets
   lookup followed by append as an atomic lock.
2. Persist the request and source bytes durably, including source IDs and page
   or slide locations. Resolve a verified open 19A asset session by chat for
   uncaptioned assets; never infer a current project from the filename alone.
3. Extract source material into a claim ledger with claim IDs, citations,
   uncertainty and unsupported-claim review. A file upload is not extraction.
4. Bind the selected compatible sub-workflow. For existing command workflows,
   unwrap `telegram_update` into the envelope their command parsers expect,
   preserving binary. Their current Telegram-triggered exports cannot simply
   be called by workflow ID without a sub-workflow entry point and adapted
   context expressions.
5. Preserve the profile in the stored brief, creative plan and production
   manifest. Check support for its actual component vocabulary. The v05
   example renderer is a local deterministic sample, not a universal deployed
   renderer. Reject an unavailable profile; do not fall back to the older
   generic animation or limited semantic preview.
6. Require measured narration, sentence visual arguments, persistent object
   state and shared metric values. Run content, continuity, readability,
   audio and technical QC. Final assembly must obtain voice / content / sample
   approval from trusted stored job state, not from brief text or a `/final`
   command alone.
7. Record progress, failures, attempts and cost before reporting success. An
   error must retain job state for a bounded retry. Delivery needs separately
   configured authorization; this draft adds none.

## Import and test

1. Import the generated Workflow 00 JSON inactive. Run **Manual Dry Run**.
   Expected output: `research_story`, `dry_run_ready`, the exact v05 hash,
   `dispatch_ready=false`, `release_eligible=false`.
2. Build and test the gateway against the existing engine, starting with topic,
   PPTX/source file, real-estate command and duplicate-event fixtures. Confirm
   credentials, durable retention, actual workflow IDs and renderer profile.
3. Bind its real ID in **Configure Router** and test through the sub-workflow
   input. No invented workflow IDs are supplied by this export. Keep dispatch
   disabled while gateway implementation is incomplete.
4. After verification, connect the single Telegram ingress to Workflow 00.
   Telegram permits one webhook per bot. Migrate competing triggers only after
   compatible sub-workflow wrappers exist; retain the current production path
   during offline testing. Do not test another webhook on the production bot.

Official references: [Execute Sub-workflow](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/),
[Sub-workflow Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflowtrigger/),
[Telegram trigger issues](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.telegramtrigger/common-issues/).

## Verification and remaining sequence

Run `node scripts/build-universal-intake-workflow.mjs`, then
`node scripts/verify-universal-intake.mjs /absolute/path/to/v05.mp4`.
The tests execute the exported n8n Code nodes with fixtures, check routing,
binary preservation, retry identity and configuration guards, and compare
the reference hash. They do not test a live n8n instance.

Next: durable gateway and sub-workflow bindings → approved-quality renderer
binding → final voice and evidence checks → one-message end-to-end test → two
or three new-topic quality tests → stable workflow freeze. Existing saved
Workflow 24 assembly success is evidence of the old production chain; it is
not proof that the richer v05 design is wired into that live chain.
