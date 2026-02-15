# @junctionjs/destination-ga4

Google Analytics 4 destination for Junction.

## Features

- Client-side via gtag.js (loaded lazily if not present)
- Server-side via GA4 Measurement Protocol
- Google Consent Mode v2 — automatically maps Junction consent state to Google's consent signals
- GA4 recommended event mapping (view_item, add_to_cart, purchase, etc.)
- Custom event name and parameter overrides

## Install

```bash
npm install @junctionjs/destination-ga4
```

## Usage

```typescript
import { ga4 } from "@junctionjs/destination-ga4";

// In your collector config
const config = {
  destinations: [
    {
      destination: ga4,
      config: {
        measurementId: "G-XXXXXXXXXX",
        consentMode: true,
        sendPageView: false, // Junction handles page views
      },
      consent: ["analytics"],
    },
  ],
};
```

## License

MIT
