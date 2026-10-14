# Audited reviewed-plan submission

Operator revisions are source-bound drafts, separate from provider results. They never change `intelligence_runs`, reserve a paid call, approve facts/voice, or authorize publication.

`INTAKE_REVIEWED_PLAN_ENABLED=1` enables explicit authenticated submissions. Default is disabled. `INTAKE_INTELLIGENCE_PAID_ENABLED`, `INTAKE_RENDER_GUIDE_ENABLED` and `INTAKE_RENDER_WORKER_ENABLED` are independent gates.

## Submit

POST `/intake/jobs/:event/intelligence/revisions` using the existing intake bearer credential:

```json
{
  "expected_review_hash": "CURRENT_64_HEX_FINGERPRINT_FROM_INTELLIGENCE_STATUS",
  "expected_parent_revision_id": null,
  "reason": "Explain the actual corrections and scope of this reviewed revision.",
  "acknowledge_source_assertions_unverified": true,
  "plan": {"schema_version": "intelligence-plan.v1"}
}
```

The complete strict plan is required; the example only abbreviates it. Original run must be a completed provider failure, `review_required`, with a response ID. Uncertain calls, active reservations and cached accepted model drafts cannot use this recovery path. Existing paid-retry exhaustion is unchanged.

The current provider row hash, source context, approved benchmark, original source bytes, exact claim quotes, numeric bindings and object continuity are rechecked. Submission does not repair the plan or accept arbitrary design code, asset paths, timing, approvals or executable instructions. Structurally valid but unsupported visuals can still stop at composition.

GET `/intake/jobs/:event/intelligence/revisions` lists immutable versions. GET `/intake/jobs/:event/intelligence/revisions/:revision` returns the selected draft and its receipt. The first parent is null; later edits must name the latest revision ID. Identical submissions are idempotent. Conflicting parents or changed originals/sources are rejected. Each version logs its reason, parent, base review fingerprint, source hash and plan hash. Its receipt explicitly says `operator_reviewed_revision` / `reviewed_intelligence_draft`, release false.

## Render

POST `/intake/jobs/:event/render/enqueue` with only:

```json
{"review_revision_id":"REV-EXACT_STORED_ID"}
```

The queue revalidates that exact stored revision and its unchanged original failure/source context. It freezes the plan, provenance, trusted presenter/font/source bytes and runtime fingerprint. Submitted plan/timing/asset/approval fields in render requests are ignored. A model draft is still selected by omitting the revision ID; reviewed drafts are never silently substituted.

The existing queue allows one frozen render per event. Repeating the same revision deduplicates; selecting another revision for that already-frozen event returns `render_revision_conflict`. It does not replace a previous video. Rendering revised videos after a frozen run requires a future explicit render-version mechanism; this patch does not disguise a new attempt under an existing receipt.

Office lifecycle scenes coexisting with source counters use the compact supported layout so numeric scope labels do not overlap the persistent office. All geometry remains conceptual except the exact source metrics. Final voice, semantic/factual review and creative approval remain pending.

## Evidence

`verify-reviewed-plan-path.mjs` tests default gates, explicit review, invented citations/numbers, changed source bytes, source/plan fingerprints, immutable original provider results, append-only version history, idempotency, restart, concurrent submissions, authentication and pinned render provenance. It also accepts the actual commercial PPTX and 13-beat reviewed plan for offline source-to-revision-to-queue validation. Provider failures in tests are synthetic, never a live accepted model response.

## Operator-pinned live rendering and private review retrieval

A trusted server deployment can enqueue an already-stored reviewed revision without another n8n edit. Set `INTAKE_RENDER_PINNED_REVIEW` to JSON containing its exact `event_id`, `revision_id` and `plan_hash`; set `INTAKE_RENDER_WORKER_EVENT_ID` to the same event and enable the guide/worker gates. Missing/mismatched scope or hash stops startup. The ordinary revision/source/receipt checks and frozen queue deduplication still apply. An existing review failure is never converted into a model response or reset. Repeated deployment cannot enqueue a different revision or regenerate a completed video.

A separate temporary `INTAKE_REVIEW_READ_TOKEN` can retrieve only GET render status and verified render artifacts for `INTAKE_REVIEW_READ_EVENT_ID`, until the Unix-millisecond deadline `INTAKE_REVIEW_READ_EXPIRES_AT`. It does not grant source, intelligence, write, model-call or cross-job access. It is passed only as an Authorization bearer header; never publish it, put it in URLs or commit it. The original intake credential remains unchanged. Disable the worker/pin and revoke or expire this scoped token after the bounded review run.

`verify-pinned-review-render.mjs` checks exact scope/hash, duplicate activation, worker isolation, read-only access boundaries, existing intake access and expiry across restart.
