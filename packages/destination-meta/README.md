# @junctionjs/destination-meta

Meta Pixel + Conversions API destination for Junction.

## Features

- Client-side via Meta Pixel (`fbq`)
- Server-side via Conversions API (CAPI)
- Both modes can run simultaneously for redundant delivery with deduplication via `event_id`
- Standard event mapping (PageView, ViewContent, Purchase, etc.)
- Advanced matching support
- Consent management via `fbq("consent", ...)`

## Install

```bash
npm install @junctionjs/destination-meta
```

## Usage

```typescript
import { meta } from "@junctionjs/destination-meta";

// In your collector config
const config = {
  destinations: [
    {
      destination: meta,
      config: {
        pixelId: "YOUR_PIXEL_ID",
        accessToken: process.env.META_CAPI_TOKEN, // server-side only
      },
      consent: ["marketing"],
    },
  ],
};
```

## License

MIT
