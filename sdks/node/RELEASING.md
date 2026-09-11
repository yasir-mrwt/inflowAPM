# Node SDK Release Procedure

This document covers release readiness after SDK-6. It does not authorize an npm publish. Publishing changes external state and must be explicitly approved by the project owner.

## Current release status

The SDK uses the approved package name `@inflowapm/node`. The owner has confirmed control of the `@inflowapm` npm organization, and the package carries the approved MIT license in both its metadata and included license text.

Actual publication has not happened. The manifest is publishable with `private: false`, but the release guard rejects publishing unless it runs from the trusted GitHub release workflow or the narrowly locked first-release path documented below.

The one-time path is limited to `@inflowapm/node@0.1.0` and requires both an explicit opt-in and the reviewed full commit SHA. It only replaces OIDC authentication for the initial package creation; every package, tag, commit, cleanliness, visibility, license, registry, changelog, build, lint, type, test, open-handle, and tarball check remains active.

## One-time npm setup

1. Require account-level two-factor authentication for maintainers of the confirmed `@inflowapm` organization.
2. Confirm the reviewed release commit retains `private: false`, the package name `@inflowapm/node`, the `MIT` SPDX identifier, and the current `LICENSE`.
3. Confirm the changelog heading matches the exact release version, then run the complete preflight below and merge it before creating the release tag.
4. If the package does not yet exist on npm, perform the one-time initial release from the exact clean, annotated `node-v0.1.0` tag with an interactive, 2FA-protected npm account. Replace the placeholder with the reviewed 40-character commit SHA; it must equal both `HEAD` and the tag target:

   ```bash
   cd sdks/node
   npm login
   INFLOWAPM_INITIAL_PUBLISH=true \
   INFLOWAPM_INITIAL_PUBLISH_COMMIT=<FULL_RELEASE_COMMIT_SHA> \
   npm publish --access public --provenance=false
   ```

   `prepublishOnly` runs the complete `release:check` before the release guard. The guard rejects any other package name, version, tag, commit, registry, access level, license, dirty or untracked file, or GitHub Actions attempt. Do not set `INFLOWAPM_INITIAL_PUBLISH` for later versions and do not use a long-lived automation token. `--provenance=false` is intentional for this single interactive release because it does not run through the trusted CI identity.

5. Configure the package's npm trusted publisher with these exact values:

   | Field | Value |
   | --- | --- |
   | Provider | GitHub Actions |
   | Organization or user | `yasir-mrwt` |
   | Repository | `inflowAPM` |
   | Workflow filename | `node-sdk-release.yml` |
   | Environment | `npm-production` |
   | Allowed action | `npm publish` |

6. On GitHub, create the protected `npm-production` environment and require owner approval. Protect `node-v*` tags if repository settings permit it. Do not add `NPM_TOKEN` or any npm secret: the workflow already grants only `contents: read` and `id-token: write` and authenticates through OIDC.
7. Verify the trusted-publisher configuration with the next release workflow. Then remove the initial-publish branch and variables from `scripts/verify-release.mjs`, leaving the GitHub Actions checks unconditional. Remove the initial-publish command from this document in the same reviewed commit. Future releases must use only the GitHub Release workflow.

The release workflow uses a GitHub-hosted runner, grants only `contents: read` and `id-token: write`, pins third-party actions by commit SHA, disables package-manager caching, and publishes from the release tag. npm trusted publishing supplies short-lived OIDC credentials and automatically attaches provenance for a public package from a public repository.

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
git tag -a node-v0.1.0 -m "@inflowapm/node 0.1.0"
git push origin node-v0.1.0
```

Create a GitHub Release from that tag only after CI is green. Publishing the GitHub Release triggers the protected npm job. Do not create or move release tags before the release commit has passed review.

## Post-release verification

After the initial manual publish succeeds, verify registry metadata before configuring trusted publishing:

```bash
npm view @inflowapm/node@0.1.0 name version license engines dist.integrity dist.tarball
npm view @inflowapm/node@0.1.0 --json
npm pack @inflowapm/node@0.1.0 --dry-run

VERIFY_DIR="$(mktemp -d)"
cd "$VERIFY_DIR"
npm init -y
npm install @inflowapm/node@0.1.0 express@5
node --input-type=module --eval "import { createInflowAPM } from '@inflowapm/node'; const client = createInflowAPM({ enabled: false }); await client.shutdown();"
node --input-type=commonjs --eval "const { createInflowAPM } = require('@inflowapm/node'); const client = createInflowAPM({ enabled: false }); client.shutdown().then(() => console.log('CommonJS OK'));"
```

Confirm the npm page is public, shows the expected README, MIT license, repository, Node engine, and tarball integrity, and that both ESM and CommonJS consumers resolve. The initial interactive release is not expected to carry OIDC provenance; later trusted-workflow releases are.

## Remove the initial-release path

Immediately after the package exists and npm trusted publishing is configured:

1. Delete the `INFLOWAPM_INITIAL_PUBLISH` branch, `INFLOWAPM_INITIAL_PUBLISH_COMMIT` handling, and the `0.1.0` bootstrap constants from `scripts/verify-release.mjs`.
2. Keep the shared package/license/public-registry/changelog checks and make the existing GitHub Actions release-event, repository, and exact-tag checks unconditional.
3. Delete the manual initial-publish instructions from this document.
4. Run `npm run release:check`, verify a local `npm publish --dry-run` is denied by the guard, and merge the removal before preparing any later release.

Published versions are immutable. If a release has a non-critical problem, deprecate the affected version with a useful migration message and publish a corrected version. Reserve unpublishing for a confirmed secret, malware, or similarly severe incident, and follow npm policy rather than treating unpublish as rollback.
