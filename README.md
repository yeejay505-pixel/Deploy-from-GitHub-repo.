# Yeejay DXBinteract Browser Worker

Private browser-automation worker for Yeejay Listing OS / WF-02E.

## Endpoints

- `GET /health` — public liveness check
- `GET /session/status` — authenticated DXBinteract session check
- `POST /verify-unit` — exact-property history verification
- `POST /admin/reset-browser` — restart browser/context after selector or session changes

All endpoints except `/health` require `x-api-key: $WORKER_API_KEY`.

## Required production variables

- `WORKER_API_KEY`
- `DXB_STORAGE_STATE_B64` — base64 Playwright storageState exported from an authorized DXBinteract session

## Optional variables

- `DXB_BASE_URL`
- `DXB_HISTORY_URL`
- `NAV_TIMEOUT_MS`
- `PLAYWRIGHT_HEADLESS`
- `DXB_SELECTOR_PROPERTY_TYPE`
- `DXB_SELECTOR_PROJECT_INPUT`
- `DXB_SELECTOR_UNIT_INPUT`
- `DXB_SELECTOR_PROPERTY_NO_INPUT`
- `DXB_SELECTOR_SEARCH_BUTTON`
- `DXB_SELECTOR_RESULT_ROOT`
- `DEBUG_SIGNATURE`

## Safety behavior

The worker never treats technical failure as evidence of no sale. Missing session, missing selectors, no exact property mapping, or ambiguous results return an explicit non-success state so WF-02E can HOLD the prospect.
