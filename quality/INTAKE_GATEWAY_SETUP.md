# Durable intake gateway — existing Animated AI Explainer Videos

The next offline integration is implemented: atomic intake storage, original
source retention, bounded extraction and a guarded intelligence handoff.
`Explainer_Engine_00G_Durable_Intake_Gateway_DRAFT.json` is an inactive n8n
sub-workflow companion to Workflow 00. This is not a live deployment or a
universal production renderer, and it is not part of the separate V2.0 project.

## Implemented behavior

- Re-normalizes the original Telegram envelope on the server using the chat
  allowlist and canonical approved visual profile. User-supplied route and
  approval flags do not decide execution.
- Commits the request and its source BLOB in one SQLite transaction, with a
  unique event key and content fingerprint. Retries return the retained job;
  changed content under the same event raises a conflict rather than replacing
  its brief or source. Source bytes have a SHA-256 and stable source ID.
- Extracts PPTX slide text in presentation order, DOCX paragraphs, PDF text
  layers and UTF-8 text/Markdown/CSV lines. Explicit slide/page ranges are
  respected. Each paragraph becomes an unverified claim candidate with source
  location, number tokens and uncertainty/causal cues. The complete original
  file remains retained. This is text extraction, not semantic fact-checking,
  OCR, chart interpretation or automatic thesis selection.
- Unsupported media and extraction failures retain the source and wait for a
  compatible analysis adapter. No external URLs are fetched by this step.
- A configured intelligence binding must accept `intake-handoff.v1`, the exact
  visual profile and benchmark hash. Missing or mismatched bindings block;
  old generic graphics are not substituted.
- A transaction grants one handoff lease. The downstream adapter must
  independently deduplicate the same event before paid work and return an
  `intake-receipt.v1`. Receipt acknowledgement is idempotent. It means intake
  was accepted, not that a video is finished.
- A timeout, invalid receipt or expired lease becomes an uncertain handoff.
  It requires reconciliation with downstream state and cannot automatically
  start a second paid job. Known pre-dispatch releases are limited to three
  reservations; the release operation is deliberately not exposed over HTTP.
- Real-estate project/session commands, revisions, voice and final assembly
  remain blocked until trusted existing-project adapters and production gates
  are implemented. Incoming text cannot approve final voice or publication.

## Deployment configuration — pending

Use the existing reviewed worker repository and accounts. The new API is
opt-in: no intake routes are registered unless `INTAKE_STORE_DIR` is set.
Existing renderer routes remain unchanged. When enabled, configure:

| Setting | Required value |
| --- | --- |
| Runtime | Node 22.13+ with `node:sqlite` available without a CLI flag, or newer |
| `INTAKE_STORE_DIR` | Absolute directory on an actual persistent local volume; outside all static web roots |
| `INTAKE_DURABLE_STORAGE_CONFIRMED` | `1`, after verifying the mount survives redeployment |
| `INTAKE_TOKEN` | Secret kept in service environment and n8n Header Auth credentials |
| `INTAKE_ALLOWED_CHAT_IDS` | JSON array of allowed private Telegram chat IDs |
| `INTAKE_BINDINGS_FILE` | Absolute path to operator-controlled binding JSON, optional until handoff is tested |
| Extraction tools | `python3` and `pdftotext`; Dockerfile adds Python and Poppler |

Use one service host/replica and a local filesystem. This SQLite backend is
not a multi-host shared database or an HA deployment. It uses rollback-journal
transactions with `synchronous=FULL`; no new paid database is required by the
implementation. A persistent volume still needs to be confirmed on the actual
service. Local tests cannot establish Railway retention or current plan costs.

Keep the database outside `outputs`, `render-assets`, repository directories
and any publicly served path. Do not back up only an open database file: take
a SQLite-consistent backup or stop the intake service for a filesystem copy.
Restore must include the stored source BLOBs, which are inside the database.

Binding example (operator values, not incoming brief content):

```json
{
  "research_story": {
    "workflow_id": "ACTUAL_TESTED_INTELLIGENCE_ADAPTER_ID",
    "stage": "intelligence",
    "contract": "intake-handoff.v1",
    "profile_id": "commercial-explainer-v05",
    "benchmark_sha256": "bbe16b9b82eb225ee9c6f781c1573a4f6d439ca53e85f316f0c68bdd509c23f4"
  }
}
```

The workflow ID is not supplied by this draft. A current Telegram-triggered
workflow needs a compatible sub-workflow entry point and context mapping.
For source jobs the adapter can retrieve the retained source through the
authenticated `/intake/jobs/:event_id/source` endpoint. References are not
unauthenticated public file URLs. Retained filenames are metadata, never paths.

## API and n8n import

| Endpoint | Purpose |
| --- | --- |
| `POST /intake/requests` | JSON topic or multipart `request` JSON + `source` binary; server recomputes the normalized brief from `telegram_update` |
| `GET /intake/jobs/:event_id` | Stored status, sources, extraction and claim candidates |
| `GET /intake/jobs/:event_id/source` | Original retained file bytes; protected by intake token |
| `POST /intake/jobs/:event_id/claim` | Reserve a compatible intelligence handoff |
| `POST /intake/jobs/:event_id/complete` | Persist a matching lease token and downstream receipt |

All endpoints require `Authorization: Bearer <INTAKE_TOKEN>`. One file per
Telegram event is supported, up to 32 MiB. Media-group batching, verified open
asset sessions, OCR, URL fetching and multi-file brief assembly remain pending.

1. Import 00G inactive. **Manual Dry Run** makes no external calls and should
   return `retention_performed=false`, `handoff_performed=false`.
2. After reviewed deployment and volume verification, set `base_url` in
   **Configure Gateway**. Bind the same intake Header Auth credential to its
   four HTTP Request nodes. Never put a token in a Code node or export.
3. Enable retention only. Test a topic and a real source file through the
   sub-workflow input. Confirm a duplicate returns the original job and that
   the source hash, slide/page references and pending claim review are correct.
4. Implement a compatible intelligence adapter with its own durable
   idempotency handling and a receipt carrying schema, event key, unique
   receipt ID, `accepted=true` and the exact benchmark hash. Configure the
   server-side binding file. Then test `handoff_enabled` manually.
5. Bind the actual imported 00G workflow ID in Workflow 00. Connect only after
   the tests pass; keep one Telegram ingress. No bot migration or activation
   was performed here.

## Validation and limits

Run:

```sh
node scripts/build-intake-gateway-workflow.mjs
node scripts/verify-intake-gateway-workflow.mjs
node scripts/verify-intake-gateway.mjs /absolute/path/to/source.pptx
node scripts/verify-intake-worker.mjs
node scripts/verify-universal-intake.mjs /absolute/path/to/v05.mp4
npm run check
```

The tests cover process-level duplicate reservation, source integrity,
restart recovery, extraction, explicit slides 4–14 on the supplied commercial
source, stale leases, receipt mismatches, bounded pre-dispatch retries,
authenticated multipart HTTP and the exported n8n Code-node graph. They also
verify the actual worker starts with intake disabled, uses a separate
intake credential when enabled, and retains the job after process restart.
They do not certify live credentials, n8n import/runtime compatibility or end-to-end
exactly-once paid generation. A downstream adapter must satisfy that contract.

After live gateway validation: complete trusted project/session adapters,
bind the richer approved renderer to new manifests, approve final voice and
evidence, then run topic/file-to-final-video and new-topic regression tests.

Primary technical references: [SQLite transactions](https://www.sqlite.org/lang_transaction.html),
[Node SQLite API](https://nodejs.org/api/sqlite.html),
[n8n HTTP multipart bodies](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/).
