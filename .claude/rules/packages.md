---
paths:
  - "packages/**"
---

# Package Standards

## Dependency Layering

Packages form a strict hierarchy. No circular deps.

```
@junctionjs/{astro,next}          <- Framework integrations
@junctionjs/destination-*          <- Destinations
@junctionjs/{client,gateway}       <- Runtime wrappers
@junctionjs/core                   <- Foundation
```

| Package type | How it depends on core |
|---|---|
| `client`, `gateway` | `dependencies` |
| `destination-*` | `peerDependencies` |
| Framework integrations | `peerDependencies` on core + client |

- Destinations must never import from `client` or `gateway`
- Core has no workspace dependencies (only Zod)
- No package may depend on a package in a higher layer

## ESM-Only Build

All packages output ESM only. No CJS.

```bash
tsup src/index.ts --format esm --dts --sourcemap --target es2022 --no-config
```

- Always: `--format esm --dts --sourcemap --target es2022 --no-config`
- Mark workspace dependencies as `--external`
- Mark framework dependencies as `--external`
- No tsup config files — CLI flags only
- Output to `dist/`

## Package Exports

All packages use `@junctionjs/*` scope.

- Destinations: `@junctionjs/destination-{provider}`
- Framework integrations: `@junctionjs/{framework}`

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  }
}
```

- ESM only — no `require` condition
- Every export needs both `.js` and `.d.ts`
- `files` field: `["dist", "README.md"]`
- `publishConfig`: `{ "access": "public", "provenance": true }`

## Code Style (Biome)

- Double quotes, always semicolons, trailing commas everywhere
- 2-space indent, 120 char line width
- Unused variables/imports: warn (not error)
- `noExplicitAny`: off, `noNonNullAssertion`: off
- Import organization enabled (Biome sorts imports)
- Never add ESLint or Prettier configs
- Don't disable Biome rules without good reason
