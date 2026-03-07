# Releasing Packages

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing. Packages are published to npm via GitHub Actions using [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC — no tokens stored).

## Day-to-day workflow

### 1. Add a changeset with your code changes

```bash
npx changeset
```

- Select the affected package(s)
- Choose bump type: `patch` (bug fix), `minor` (new feature), `major` (breaking change)
- Write a short summary (this becomes the changelog entry)
- Commit the generated `.changeset/*.md` file with your code

### 2. Open a PR and merge to `main`

CI runs as usual. The changeset file is just a markdown file in the PR.

### 3. Merge the "Version Packages" PR

After merging to `main`, the release workflow automatically opens (or updates) a **"chore: version packages"** PR that:

- Bumps `version` in each affected `package.json`
- Updates `CHANGELOG.md` for each package
- Bumps internal dependents (e.g., if `core` changes, `client` gets a patch bump)

When you're ready to release, **merge this PR**.

### 4. Packages are published

Merging the version PR triggers the release workflow again, which:

- Builds all packages
- Publishes to npm with provenance attestation
- Creates GitHub Releases with changelogs

## Common commands

| Command | Description |
|---|---|
| `npx changeset` | Add a changeset (interactive) |
| `npx changeset add --empty` | Add an empty changeset (no version bumps) |
| `npx changeset status` | Show pending changesets and expected version bumps |
| `npm run version-packages` | Apply changesets locally (usually done by CI) |
| `npm run release` | Build and publish (usually done by CI) |

## Tips

- **Multiple changesets per PR are fine.** If a PR touches several packages for different reasons, add multiple changesets.
- **One changeset can cover multiple packages.** If a single change affects `core` and `client`, select both in the interactive prompt.
- **Forgot to add a changeset?** Add one in a follow-up commit or a new PR. Changesets accumulate until the version PR is merged.
- **Want to batch releases?** Just let changesets accumulate. The version PR stays open and updates with each merge to `main`. Merge it when you're ready to cut a release.
- **Internal dependencies auto-bump.** If `@junctionjs/core` gets a patch bump, packages that depend on it (like `client`, `gateway`, etc.) automatically get a patch bump too (`updateInternalDependencies: "patch"` in config).

## Pushing directly to main

If you push directly to `main` (instead of via PR), the release workflow still triggers. The flow is the same — if there are changesets, a "Version Packages" PR is opened. If there are no changesets (e.g., after merging the version PR), it publishes.

## Ignored packages

- `@junctionjs/demo` — private, never published

## Trusted publishing maintenance

Each package has a trusted publisher configured on npmjs.com linking it to the `release.yml` workflow. No npm tokens are stored as secrets — authentication uses OIDC.

### Adding a new publishable package

1. Do a one-time manual publish: `cd packages/<name> && npm publish --access public --no-provenance`
2. Configure trusted publishing at `npmjs.com/package/@junctionjs/<name>/access`:
   - GitHub owner: `tyssejc`
   - Repository: `junction`
   - Workflow: `release.yml`
   - Environment: *(leave blank)*
3. Add `publishConfig` to the package's `package.json`:
   ```json
   "publishConfig": {
     "access": "public",
     "provenance": true,
     "registry": "https://registry.npmjs.org/"
   }
   ```
4. Use proper semver (not `"*"`) for any `dependencies` or `peerDependencies` on internal packages

### Required GitHub repo settings

Under **Settings > Actions > General > Workflow permissions**:
- "Read and write permissions" must be selected
- "Allow GitHub Actions to create and approve pull requests" must be checked
