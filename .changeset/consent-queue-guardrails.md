---
"@junctionjs/core": minor
---

feat(core): add consent queue guardrails — maxQueueSize, queue:drop telemetry, flush() drains queue

- Add `maxQueueSize` option to `ConsentConfig` — drops oldest events when exceeded
- Emit `queue:drop` events with `{ count, reason }` when events are lost to timeout or overflow
- `flush()` now drains the consent queue for permitted events, critical for page unload
