# Yeejay DXBinteract Verification Bridge

This branch contains two parts:

1. Railway bridge/API used by n8n.
2. Mac Local Chrome Agent used to browse DXBinteract with the user's normal visible Chrome session.

## Railway bridge

Public service:
`https://dxbinteract-worker-production.up.railway.app`

n8n-facing endpoints:
- `POST /jobs` — queue DISCOVER / SESSION_CHECK / VERIFY_UNIT
- `GET /jobs/:id` — read job status/result
- `GET /health` — service health

Local-agent endpoints:
- `POST /agent/lease`
- `POST /agent/result`
- `GET /agent/status`

n8n endpoints use header `x-api-key` with `WORKER_API_KEY`.
Local-agent endpoints use header `x-agent-key` with `LOCAL_AGENT_KEY`.

## Mac setup

Use a dedicated Chrome profile. Do not attach Playwright to your everyday Chrome profile.

1. Clone/check out branch `dxbinteract-worker`.
2. Run `npm install`.
3. Copy `.env.local.example` to `.env.local`.
4. In Railway, copy `LOCAL_AGENT_KEY` into `DXB_LOCAL_AGENT_KEY` in `.env.local`.
5. Run:

```bash
chmod +x start-local-chrome.command
./start-local-chrome.command
```

6. In the dedicated Chrome window, manually complete Cloudflare and RERA authentication on DXBinteract.
7. Keep that Chrome window open.
8. In a second Terminal window run:

```bash
npm run local-agent
```

The agent attaches only to Chrome at `127.0.0.1:9222` and polls Railway outbound. No inbound port is exposed from the Mac.

## First test

Queue a DISCOVER job from n8n:

```json
{
  "action": "DISCOVER"
}
```

Then poll `GET /jobs/{jobId}` until `status = COMPLETE`.

The returned result contains the DXBinteract page title, URL, headings, and control metadata needed to finalize selectors.

## Safety behavior

Technical failure is never interpreted as evidence of no sale. Cloudflare, login failure, selector mismatch, ambiguous unit matching, and missing property mapping all return non-success states so WF-02E can HOLD the prospect.
