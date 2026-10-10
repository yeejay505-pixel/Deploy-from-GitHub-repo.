# Reviewed intelligence retry

Authenticated POST `/intake/jobs/:id/intelligence/retry` prepares one operator-requested retry of a completed invalid model output. It does not call the provider or enable paid calls/rendering.

GET intelligence status first. Only `review_required` with a provider response ID is eligible. Review the failure; supply the current `review_hash` as `expected_review_hash`, a meaningful `reason` (12–1000 characters), and `acknowledge_paid_call: true`. Existing intake bearer authentication is required. Do not attach an automatic retry branch.

One transaction archives the complete original database row in `intelligence_retry_history` and rebuilds the request from unchanged retained sources and current planner instructions. Old call tokens are invalidated. A second retry is refused, including after restart. Calling/uncertain/validated states, stale review hashes and source/profile changes are refused.

The paid-call switch remains independent. Existing `/call` reserves the new attempt once; `/result` requires its new token. No new event, source upload, caller-supplied plan, fact approval or render acceptance occurs. Publication remains review-pending.

Validation: `node scripts/verify-source-intelligence.mjs [optional-local-pptx]`. Provider responses in tests are synthetic; tests do not demonstrate live model quality.
