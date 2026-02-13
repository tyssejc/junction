# Ship Junction

## Step 1: Copy to your projects directory

```bash
cp -r ~/Desktop/tagpilot ~/Code/projects/junction
cd ~/Code/projects/junction
```

(Or wherever your Cowork outputs folder maps to on your Mac.)

## Step 2: Init and push to GitHub

```bash
git init -b main
git add -A
git commit -m "Initial architecture: core, client, gateway, Astro integration, destinations"
gh repo create junctionjs/junction --public --source=. --push
```

That's it. Four commands. Repo is live.

## Step 3: npm publishing (when you're ready)

This is NOT required right now. The prototype needs a build step
before it's publishable to npm. But here's the path when you want it:

### 3a. Add a build tool

```bash
npm install -D tsup
```

### 3b. Add package.json to each package

Each package under `packages/` needs its own `package.json`.
Example for `packages/core/package.json`:

```json
{
  "name": "@junctionjs/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "peerDependencies": {},
  "license": "MIT"
}
```

Destination packages would add `@junctionjs/core` as a peer dependency.

### 3c. Build and publish

```bash
# Build all packages
npm run build

# Login to npm (you already have the @junctionjs org)
npm login

# Publish each package
cd packages/core && npm publish --access public && cd ../..
cd packages/client && npm publish --access public && cd ../..
cd packages/gateway && npm publish --access public && cd ../..
cd packages/astro && npm publish --access public && cd ../..
cd packages/destination-amplitude && npm publish --access public && cd ../..
cd packages/destination-ga4 && npm publish --access public && cd ../..
cd packages/destination-meta && npm publish --access public && cd ../..
```

### 3d. Automate with Turborepo (optional)

The root `package.json` already references `turbo`. Once you add
individual package.json files, `turbo build` and `turbo publish`
will handle the dependency graph for you.

## What to do first

1. Copy the folder and push to GitHub (2 minutes)
2. Write the blog post (next Cowork session)
3. Add per-package builds when you want to npm publish (an afternoon)

Don't let step 3 block steps 1 and 2.
