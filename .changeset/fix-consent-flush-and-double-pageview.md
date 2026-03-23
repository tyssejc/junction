---
"@junctionjs/core": patch
"@junctionjs/next": patch
---

fix(core): flush event buffer on consent change so queued events dispatch immediately

fix(next): derive single URL dep in PageTracker to prevent double pageview on navigation
