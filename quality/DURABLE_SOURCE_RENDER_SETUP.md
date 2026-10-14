# Durable source-plan composition and review rendering

This extends the existing Animated AI Explainer Videos engine. The exact v05
visual benchmark remains unchanged. Workflow 04R is an inactive adapter; 03S
can dispatch it asynchronously after an accepted source-intelligence draft.
The gateway receives its intelligence receipt promptly instead of waiting on
a full render while its handoff lease expires.

## Private worker configuration

Use Node 22.13+ (or a tested newer Node version), Python 3, FFmpeg/FFprobe,
Canvas and libflite1 with the CMU AWB voice libraries. The Docker image now
includes libflite1; building/deploying this image still requires the actual
deployment environment. The local test used Node 24.19.0. Guide speech is
temporary and never approved by this adapter.

Keep the existing `INTAKE_STORE_DIR`, `INTAKE_TOKEN`, explicit durable-storage
confirmation, chat allowlist and source-intelligence configuration. Add:

| Setting | Purpose | Default |
| --- | --- | --- |
| `INTAKE_RENDER_ASSET_DIR` | Trusted local directory containing `asset-catalog.json`, presenter PNG and two hashed fonts | Unbound |
| `INTAKE_RENDER_GUIDE_ENABLED=1` | Allow measured local guide speech and template composition | Disabled |
| `INTAKE_RENDER_WORKER_ENABLED=1` | Start one sequential durable queue consumer with restart recovery | Disabled |

The store and `source-renders/` must be on the same private persistent local
volume outside all served directories. Use one host; SQLite rollback journaling
is not a distributed database or an NFS coordination mechanism. HTTP does not
accept asset paths, narration files, plans, designs, approvals or executable
scene code. Presenter/font files live under `assets/` or `fonts/` in the trusted
catalog directory and must match their SHA-256 values. File/symlink escapes,
changed source bytes and asset checksum mismatches stop the handoff.

## Server API

All routes use the intake Bearer credential, including previews and stills:

| Request | Result |
| --- | --- |
| `POST /intake/jobs/:id/render/enqueue` with an empty body | Freeze the accepted stored plan, original source and trusted asset bytes; queue once |
| `GET /intake/jobs/:id/render` | Durable stage, attempts, frame progress, review report and receipt |
| `GET /intake/jobs/:id/render/artifacts/:key` | Checksum-verified video, QC, manifest, timing, voice provenance or scene still |

Enqueue requires `intelligence_runs.status=validated_draft` and revalidates the
strict plan against the retained claim ledger. It never treats a supplied
receipt as proof of a stored plan. Duplicate requests return the original run,
including review failures. Unsupported states are not silently simplified.
An accepted draft is source-bound contract output, not verified factual truth.

Input JSON and asset bytes commit in one SQLite transaction. Each attempt
materializes a new isolated bundle from these snapshots. Source extraction,
claims, profile/hash, plan, catalog, source files and runtime fingerprint are
retained. The fingerprint includes local pipeline dependencies, package lock,
Node version/platform and architecture. It does not certify installed external
FFmpeg/Flite binaries; pin and record the deployed image for reproduction.

The worker measures guide word boundaries on the actual waveform, composes
supported deterministic templates, performs all-frame text-fit preflight,
renders Canvas frames, mixes narration and action SFX, encodes H.264/AAC at
1080 × 1920 / 30 fps and independently probes the completed file. It syncs
artifacts before committing a `completed_review` receipt. Frame progress refers
to encoding work, not a creative-quality percentage. Music and natural final
voice are still separate pending integrations.

Leases last 45 seconds and heartbeat every five seconds. Only one process wins
a queued job. Expired deterministic work may retry in a new attempt directory,
at most three attempts; stale workers cannot commit or overwrite the selected
attempt. This is not an exactly-once CPU-work guarantee. Shutdown aborts the
child process group and leaves its lease recoverable. Composition, runtime,
alignment and QC failures stop for review; they are not automatically retried.
Changed runtime fingerprints also stop queued jobs for review.

Paid source-model calls have their own durable reservation and are never
replayed by this worker. Downloads verify artifact size/hash on every read;
missing, changed or escaping artifacts invalidate the completion receipt and
hold the run for review. Failed/unselected attempt directories remain private;
retention/cleanup policy is still needed for production disk management.

There is no HTTP completion/approval endpoint. Receipts remain guide-voice,
facts-unverified and creative-review-pending with `release_eligible=false`.
Technical QC and text fit do not establish causal truth, visual clarity or
v05-level creative quality. No project/session binding or publishing is added.

## Inactive n8n adapters

1. Import `Explainer_Engine_04R_Durable_Source_Render_DRAFT.json` inactive.
   Verify its manual dry run makes no HTTP request or success receipt.
2. Bind the existing intake HTTPS host and Header Auth on Enqueue and Poll.
   Configure/verify the persistent volume, trusted assets and worker first.
3. Test a stored accepted draft. Expect `queued` → measured guide → composing →
   rendering → QC → `completed_review`, or a persisted review stop.
4. Only after this test, set 04R `enabled=true`. Bind its actual imported ID
   in 03S `render_workflow_id`, then set `render_enabled=true` deliberately.
   Both source planning and render dispatch remain disabled in the exports.

03S dispatches without waiting for the sub-workflow. It preserves its original
intelligence receipt even if the optional render-dispatch attempt errors.
Repeating 03S with an already validated stored plan can dispatch 04R again
without a new model call; enqueue deduplicates the render. This also recovers
a crash between source acceptance and optional dispatch. 04R polls every ten
seconds at most 120 times. Reaching its poll limit does not cancel or re-enqueue
the server job; query the durable status before deciding what to do next.
HTTP errors return a review stop. No Telegram, Drive, Sheets or paid generation
action is included in 04R. No secrets are embedded in either export.

## Local verification

```sh
node scripts/verify-durable-render.mjs TRUSTED_ASSET_DIRECTORY
node scripts/verify-durable-render.mjs TRUSTED_ASSET_DIRECTORY TRIAL_BUNDLE PROOF_DIRECTORY
node scripts/verify-durable-render-workflow.mjs
node scripts/verify-source-render-worker.mjs TRUSTED_ASSET_DIRECTORY
```

The full proof ingests the actual PPTX slides 4–14, stores a synthetic response
containing the earlier hand-authored eight-sentence trial plan, enqueues through
authenticated HTTP, closes/reopens the gateway and runs the actual guide,
composer and renderer subprocesses. It checks the authenticated output and
deliberately corrupts the private test copy to exercise integrity rejection.
The delivered proof video and reproduction bundle are copied before corruption.
This is a source-backed offline integration test, not an actual model or live
n8n result, a new investor recommendation or a new creative approval.

The separate server-process test verifies opt-in environment configuration,
intake authentication, termination during active work, restart recovery,
guide rendering/QC and completed-download persistence after another restart.
It uses a three-sentence synthetic source fixture. After the stopped process
exits, the test advances the stored lease expiry to exercise recovery without
waiting 45 seconds. The recovered run uses a new isolated attempt, does not
replay intelligence and retains its receipt on the next restart.

The source consumer is sequential within its own queue. Existing Remotion
routes still use their existing queue; cross-queue CPU scheduling and volume
retention limits need deployment-specific validation before production load.

Live n8n credentials/IDs, deployed volume verification, an actual source-model
result, final voice, facts, new-topic quality review and authorized delivery
remain pending. No authenticated n8n or Railway connector was available in the
implementation session; account/subscription status was not inferred.
