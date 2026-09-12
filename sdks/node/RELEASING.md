# Node SDK Release Procedure

This document covers releases after the public `0.1.0` package. Publishing changes external state and must be explicitly approved by the project owner.

## Current release status

The SDK uses the approved package name `@inflowapm/node`. The owner has confirmed control of the `@inflowapm` npm organization, and the package carries the approved MIT license in both its metadata and included license text.

`@inflowapm/node@0.1.0` is available on npm. The temporary first-release bootstrap has been removed.

All future publishing is restricted to the npm Trusted Publisher relationship for `.github/workflows/node-sdk-release.yml`. The release guard requires the GitHub Actions release event, the expected repository, and an exact `node-v<package-version>` tag. Package, visibility, registry, provenance, license, changelog, build, lint, type, test, open-handle, and tarball checks remain active.

## Trusted publishing

The npm package is configured with these values:

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization or user | `yasir-mrwt` |
| Repository | `inflowAPM` |
| Workflow filename | `node-sdk-release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

The protected `npm-production` GitHub environment gates the publish job. Do not add `NPM_TOKEN` or any npm secret. The workflow grants only `contents: read` and `id-token: write`, pins third-party actions by commit SHA, disables package-manager caching, and publishes from the release tag. npm supplies short-lived OIDC credentials and automatically attaches provenance.

## Release preflight

From `sdks/node` on Node 24, with the intended version already in `package.json` and `package-lock.json`:

```bash
npm ci
npm run release:check
npm audit --audit-level=high
npm pack --dry-run
```

Then repeat `npm run release:check` on Node 26 or require the `Node SDK CI` matrix to pass on the release commit. Run `npm run test:e2e` against the real local backend whenever SDK behavior, protocol fields, ingestion, or analytics expectations changed.

Inspect the tarball report. It must contain the README, package metadata, compiled ESM, compiled CommonJS, declarations, source maps, and the selected license text. It must not contain source files, tests, examples, benchmarks, environment files, credentials, or repository-only documentation.

## Versioning and tags

Use Semantic Versioning for the public package:

- Patch: backwards-compatible fixes, documentation-only package corrections, and internal changes with no public contract change.
- Minor: backwards-compatible public API, option, event, or integration additions.
- Major: incompatible API, behavior, runtime baseline, export, or telemetry contract changes.

Before `1.0.0`, treat any incompatible public change as potentially disruptive and explain it prominently even when SemVer permits a minor bump.

Update `CHANGELOG.md`, update both lockfile and manifest together, and commit the release. Create an annotated tag whose version exactly matches the manifest:

```bash
git tag -a node-vX.Y.Z -m "@inflowapm/node X.Y.Z"
git push origin node-vX.Y.Z
```

Create a GitHub Release from that tag only after CI is green. Publishing the GitHub Release triggers the protected npm job. Do not create or move release tags before the release commit has passed review.

## Post-release verification

After the trusted workflow succeeds, verify registry metadata and clean consumer imports:

```bash
npm view @inflowapm/node@X.Y.Z name version license engines dist.integrity dist.tarball
npm view @inflowapm/node@X.Y.Z --json
npm pack @inflowapm/node@X.Y.Z --dry-run

VERIFY_DIR="$(mktemp -d)"
cd "$VERIFY_DIR"
npm init -y
npm install @inflowapm/node@X.Y.Z express@5
node --input-type=module --eval "import { createInflowAPM } from '@inflowapm/node'; const client = createInflowAPM({ enabled: false }); await client.shutdown();"
node --input-type=commonjs --eval "const { createInflowAPM } = require('@inflowapm/node'); const client = createInflowAPM({ enabled: false }); client.shutdown().then(() => console.log('CommonJS OK'));"
```

Confirm the npm page is public, shows the expected README, MIT license, repository, Node engine, provenance, and tarball integrity, and that both ESM and CommonJS consumers resolve.

Published versions are immutable. If a release has a non-critical problem, deprecate the affected version with a useful migration message and publish a corrected version. Reserve unpublishing for a confirmed secret, malware, or similarly severe incident, and follow npm policy rather than treating unpublish as rollback.
