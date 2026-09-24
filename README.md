# Explainer Render Worker v0.9

Headless scene-render service for Workflow 09.

- `GET /health`
- `POST /render-scene`
- 1080×1920, 30fps, H.264
- Remotion is the render clock
- Three.js scenes render through `@remotion/three`

Railway detects the root `Dockerfile` and deploys this service directly.
