---
"@junctionjs/destination-ga4": patch
---

Fix gtag.js integration: use Arguments object instead of Array for dataLayer

The gtag stub function was using an arrow function with rest parameters, which
pushed plain Arrays to the dataLayer. gtag.js silently ignores array entries —
it expects the Arguments object. Switched to a named function declaration using
`arguments` to match Google's official snippet.

Also added `gtag("consent", "default", {...})` call before `gtag("config", ...)`
when consent mode is enabled. Without this, gtag.js doesn't know consent mode
is active and consent state is never communicated to Google.
