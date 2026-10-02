# Existing engine: script → executable specification → preview

This work extends only the existing engine's draft branch. It is not the
separate Yeejay AI Vid Engine V 2.0 project and is not transferred to V2.0.

## What is implemented

- Strict JSON schema for objects, shared metrics, timed actions, narration beats,
  source/illustrative claims and action-linked sound cues.
- An explicit object renderer for platform, shop, cart, person, counter, bar,
  connector, document, label, card, building, landscape and ring primitives.
- Stateful playback from a declared initial state. Tracks cannot overlap or
  teleport to a different value between actions. Charts and counters share metrics.
- Rejection of unsupported object types, missing references, off-canvas geometry,
  unsupported claims, unsafe extra fields, and incomplete beat timing.
- A native Canvas/FFmpeg preview API with event-linked SFX, independent of a
  browser download. The optional Remotion SemanticScene uses the same drawing code.
- A ten-node, inactive n8n workflow that prepares a structured OpenAI request,
  preserves the supplied script and claims, validates the result, and requests a preview.

## Reference flow

Approved script and upstream claim ledger → renderer capabilities → OpenAI scene
plan → script/claim preservation check → semantic validation → preview render →
human review and voice alignment.

The OpenAI adapter uses Responses API `text.format` with strict JSON Schema.
It treats incomplete responses and refusals as errors and never invokes code
from model output. The model ID is explicitly configured, not assumed.

Official references:

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://docs.n8n.io/integrations/builtin/credentials/httprequest

## Demonstrated example

`examples/platform-dependency.json` illustrates platform support, customer growth,
support withdrawal and reduced customer quantity. The numbers are explicitly
illustrative. No real-market claim is implied. Another test changes the businesses
and metric values without changing the renderer code.

The example specification was prepared during development. It did not come from
a live automated OpenAI/n8n run. Passing fixture tests does not prove that an LLM
will consistently plan compelling scenes.

## Preview routes

Configure the existing Railway service's `RENDER_TOKEN` before using these routes.
All require `Authorization: Bearer <RENDER_TOKEN>`.

| Route | Purpose |
| --- | --- |
| GET /semantic-capabilities | Schema and supported behaviours |
| POST /validate-semantic-scene | Validate `{ "spec": ... }` without rendering |
| POST /render-semantic-preview | Render `{ "spec": ..., "width": 1080 }` |
| GET /semantic-manifest/:renderId | Retrieve the exact editable specification |

Render errors stop before the queue when the specification is invalid. Valid
previews use the existing sequential queue. The exact spec hash identifies the
reviewed content. Editable specifications are stored outside the public output
directory. Preview responses explicitly include `releaseEligible: false`,
`creativeApproval: pending`, and `voicePending: true`.

This does not retrofit the existing final-assembly endpoints with a release gate.
Those endpoints are unchanged; full integration of review is still required.

## Connect n8n after draft backend deployment

1. Import `workflows/Semantic_Plan_To_Preview_DRAFT.json` as a new inactive workflow.
2. In Configure Preview, select the current OpenAI model ID and the renderer's
   HTTPS host. Supply an approved short script and its upstream claim ledger.
3. On OpenAI Plan Scene, choose the existing OpenAI credential.
4. On the three renderer HTTP nodes, select an HTTP Header Auth credential with
   header `Authorization` and value `Bearer <RENDER_TOKEN>`. Store the secret only
   in the credential; never put it into workflow fields or source control.
5. Execute manually and review the returned MP4.

The workflow has no Telegram send, Drive upload or Sheets write nodes yet. It does
not modify existing workflows and is not imported or activated in the live account.

## Validation and remaining work

Automated tests cover state continuity, duplicate/overlapping actions, invalid
targets and types, metric bounds, script/claim preservation, API refusal and
incomplete responses, endpoint authentication, rejection before render, a real
HTTP-rendered video, and protected manifest retrieval. Generated n8n Code nodes
are run with fixtures and connections are checked.

Native 1080×1920 previews are rendered and visually inspected. The Remotion entry
bundles, but full Remotion browser rendering has not been verified locally.

Still pending: a live OpenAI/n8n execution using the user's credentials, natural
voice selection and generation, word timestamps, retiming against voice, exact
sample creative approval, more animation primitives and benchmarks, source
verification upstream, automatic repair/review routing, full assembly integration,
durable Drive outputs, Sheets logs, and automatic topic intake.

No arbitrary topic-to-publish quality guarantee follows from this prototype.
