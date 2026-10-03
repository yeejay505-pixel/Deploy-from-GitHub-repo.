# Source-aware intelligence adapter — existing engine

Workflow 03S connects the durable intake gateway to a source-grounded thesis,
draft narration and sentence visual-argument plan. It is implemented locally,
exported inactive, and defaults to an offline dry run. It belongs to Animated
AI Explainer Videos; it is not a transfer to the separate V2.0 engine.

## Contract and behavior

The server loads the retained job by event ID. It uses the original brief,
selected source range, exact claim IDs/quotes/locations and approved v05
profile. It does not trust caller-supplied source text, approval flags or route
instructions. The model request uses a strict structured schema and no tool
actions. API storage is disabled. The model is an operator-configured value;
no model or credential is guessed by the export.

The plan includes one central mechanism, source-backed thesis, definitions,
examples, causal interpretations, uncertainties and unsupported items for
review. Its narration follows Problem → mechanism → consequence. Every
sentence declares metaphor, persistent objects, before state, visible action,
after state, quantity treatment, text role, sound and transition.

Validation checks the full schema, exact source quotes and references, numeric
tokens, selected source metric values, shared metric IDs, phase order and
stable object state. A presenter/caption-only action does not count as a
meaningful diagram change. SFX must target a visible action. Unknown claims,
metric IDs, object IDs or an unavailable profile do not pass validation.

These are structural and identity checks. They cannot prove paraphrase
entailment, causal truth, correct units/denominators, the quality of an actual
visual scene, or facts stated with numbers written as words. All source
assertions remain unverified and semantic human review remains required.
The output has no measured timings and is not an executable renderer manifest.
New renders, final voice, factual verification and publication need their own
approvals. The old 60-second limited semantic-preview planner is not used as
an automatic quality fallback.

## Durable paid-call boundary

The same SQLite store has a separate intelligence run per event. A prepared
input hash is immutable. One transaction reserves a model call before n8n
sends the request. Concurrent executions or restarts cannot reserve another
call for that run. If the outcome is unknown, refused, incomplete or invalid,
it stops for reconciliation or review. There is no automatic repair retry or
automatic paid-call replay.

A valid draft is saved with canonical source references, response ID and
token-usage fields. A repeat returns its cached draft and stored receipt. The
receipt means the intelligence draft was accepted; it does not report a
finished video. It completes the existing gateway handoff while retaining
`release_eligible=false`.

The adapter tests use synthetic model response fixtures. They do not call
OpenAI, prove a model's creative performance, certify a live n8n import, or
establish actual token costs. The fixture narration is explicitly not verified
Dubai market research and is not a user-facing investor pitch.

## Live connection — pending

1. Deploy the reviewed opt-in gateway with its private persistent volume and
   intake token, following `INTAKE_GATEWAY_SETUP.md`.
2. Set `INTAKE_INTELLIGENCE_MODEL` to your chosen existing compatible model.
   `INTAKE_INTELLIGENCE_PAID_ENABLED` stays unset/disabled until the credential
   and model are verified. Only setting it to `1` allows a call reservation.
3. Import `Explainer_Engine_03S_Source_Intelligence_DRAFT.json` inactive. Its
   manual run reports `calls_performed=false` and no success receipt.
4. Configure its HTTPS `base_url`, bind the intake Header Auth credential on
   Prepare/Reserve/Store, and choose your existing OpenAI credential on the
   model node. No secrets belong in Code nodes or JSON exports.
5. Validate the actual source job, model limits and request size. The current
   adapter refuses sources above 1,500 claim candidates or 700,000 JSON
   characters; chunking is pending. It does not silently drop source text.
6. Bind the actual imported 03S workflow ID under `source_brief_intelligence`
   with stage `intelligence`, contract `intake-handoff.v1`, profile ID
   `commercial-explainer-v05` and its exact benchmark hash. Enable the adapter
   and test one retained source through 00G. Keep production bot migration
   pending until the whole chain is validated.

Bare topics have no retained evidence and stop with `source_research_required`.
A compatible research module still needs to acquire and cite evidence before
this source-bound planner can run. OCR, image/video reference analysis,
transcription, verified real-estate sessions and final production adapters
remain separate pending steps.

## New authenticated API endpoints

| Endpoint suffix under `/intake/jobs/:event_id` | Purpose |
| --- | --- |
| `GET /intelligence` | Cached draft, run status, stored receipt and usage |
| `POST /intelligence/prepare` | Load the retained source and prepare one strict request |
| `POST /intelligence/call` | Reserve one call, only when the server-side paid gate is enabled |
| `POST /intelligence/result` | Validate and persist the response with the reserved call token |

All use the existing intake token. The service itself does not call OpenAI;
the inactive n8n adapter contains the optional model request. Loss of a call
response or a timeout is ambiguous and requires reconciliation with provider
and stored state. Blindly clearing the run would defeat duplicate protection.

## Validation

```sh
node scripts/build-source-intelligence-workflow.mjs
node scripts/verify-source-intelligence-workflow.mjs
node scripts/verify-source-intelligence.mjs /absolute/path/to/source.pptx
node scripts/verify-intake-gateway.mjs /absolute/path/to/source.pptx
node scripts/verify-intake-worker.mjs
npm run check
```

Primary API references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[Responses migration and storage](https://developers.openai.com/api/docs/guides/migrate-to-responses).
