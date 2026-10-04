# Existing Animated AI Explainer Videos: 03S → 04R

## Observed 04R test

User supplied workflow https://yeejay.app.n8n.cloud/workflow/H5lLMa2U0RYPrylE
and the output of Return Review Video and Receipt on 2026-10-04.
Event TG-8580375575-610032107 returned completed_review, technical_qc pass,
and download.status downloaded. Expected video size 4,579,326 bytes and SHA256
7b34c69170ea5c616fa4b63740ffc45c79e4bfc38fda3af4a57a0e6c38bda6b6
match the earlier independently downloaded local video. The current attachment
contains JSON metadata, not new video bytes. This proves the reported retrieval
path, not a fresh autonomous model-to-video run. Guide voice, facts unverified,
creative approval pending, release_eligible false remain unchanged.

## Prepared upstream patch

scripts/bind-live-source-render.mjs consumes a CURRENT 03S export and preserves
its credential references, node IDs, adapter enabled setting, and unrelated nodes.
It binds the tested 04R ID, rejects mismatched event/profile/receipt/stage,
routes cached valid results after call-reservation denial into render dispatch,
and stops on dispatch failure instead of masking it as draft success.
Dispatch remains asynchronous: requested does not mean rendering completed.
The output stays inactive and clears pinned test data. It makes no provider calls.

Run:

    node scripts/bind-live-source-render.mjs CURRENT_03S.json BOUND_03S.json
    node scripts/verify-live-source-render-binding.mjs

Local simulation passed valid handoff, 11 invalid state/receipt cases, dispatch
failure, cached-result route, credential preservation and graph checks.
This patch has NOT been imported or executed in n8n.

## Next blocking input

Current export of 03S ZxiylbB3SVGDPhWU is needed before generating its replacement.
Do not replace the user's live workflow with the repo's old credential-free draft.
Direct n8n automation was blocked by credential protection in this session;
do not bypass it or extract tokens. Import and live execution remain user actions.

04R adapter enqueue and Railway paid/render gates were last disabled. Binding
03S alone does not activate the whole engine. Before a fresh end-to-end test,
coordinate those gates and current router/gateway exports; preserve provider
call reservations and original failed model records. Do not replay the exhausted
original job by relabelling it as a new event. Reviewed revisions are a separate
explicit path; this model handoff accepts only validated_draft.
