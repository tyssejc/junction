# @junctionjs/destination-amplitude

Amplitude Analytics destination for Junction.

## Features

- Client-side and server-side sending via Amplitude HTTP V2 API
- Configurable event name formatting (snake_case, Title Case, entity:action, custom)
- Property mapping overrides
- User identity syncing (anonymous ID, user properties)
- Deduplication via `insert_id`

## Install

```bash
npm install @junctionjs/destination-amplitude
```

## Usage

```typescript
import { amplitude } from "@junctionjs/destination-amplitude";

// In your collector config
const config = {
  destinations: [
    {
      destination: amplitude,
      config: {
        apiKey: "YOUR_AMPLITUDE_API_KEY",
        mode: "client", // or "server"
        eventNameFormat: "snake_case",
      },
      consent: ["analytics"],
    },
  ],
};
```

## License

MIT
