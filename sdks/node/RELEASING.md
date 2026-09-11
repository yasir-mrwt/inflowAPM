# Node SDK Release Procedure

This document covers SDK-5 release readiness. It does not authorize an npm publish. Publishing changes external state and must be explicitly approved by the project owner.

## Current release status

The SDK uses the approved package name `@inflowapm/node`. The owner has confirmed control of the `@inflowapm` npm organization, and the package carries the approved MIT license in both its metadata and included license text.

Actual publication is still disabled. `package.json` intentionally retains `private: true`, and the release guard rejects publishing until a later, explicit owner authorization removes that final hard lock. No release tag or npm publish is part of SDK-5 finalization.

The first release must also replace the `Unreleased` changelog entry with a versioned release section. The release guard verifies the exact tag, clean worktree, `private: false`, MIT metadata and license text, and matching changelog version before any publish lifecycle can continue.

## One-time npm setup

1. Require account-level two-factor authentication for maintainers of the confirmed `@inflowapm` organization.
2. After explicit publication approval, remove `private: true` in one reviewed change. Keep the package name `@inflowapm/node`, the `MIT` SPDX identifier, and `LICENSE` unchanged.
3. Replace the `Unreleased` changelog heading with the exact release version, then run the complete preflight below and merge it before creating the release tag.
4. If the package does not yet exist on npm, perform the one-time bootstrap release from the exact clean `node-vX.Y.Z` tag with an interactive, 2FA-protected npm account:

   ```bash
   cd sdks/node
   npm login
   INFLOWAPM_BOOTSTRAP_RELEASE=true npm publish --access public --provenance=false
   ```

   The bootstrap escape hatch still checks the exact version tag, clean worktree, package visibility, license metadata, and the complete `prepublishOnly` suite. Do not use a long-lived automation token. The first release cannot use trusted publishing because npm requires the package to exist before a trust relationship can be created.

5. Configure the package's npm trusted publisher with these exact values:

   | Field | Value |
   | --- | --- |
   | Provider | GitHub Actions |
   | Organization or user | `yasir-mrwt` |
   | Repository | `inflowAPM` |
   | Workflow filename | `node-sdk-release.yml` |
   | Environment | `npm-production` |
   | Allowed action | `npm publish` |

6. On GitHub, create the protected `npm-production` environment and require owner approval. Protect `node-v*` tags if repository settings permit it.
7. After the trusted workflow succeeds, configure npm publishing access to require 2FA and disallow traditional write tokens. Revoke any temporary publishing credentials.

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

After the workflow succeeds:

```bash
npm view @inflowapm/node@0.1.0 version dist.integrity dist.tarball
npm install @inflowapm/node@0.1.0
```

Confirm the npm page is public, shows the expected README and repository, exposes provenance, and resolves both ESM and CommonJS. Update this repository's status only after those checks pass.

Published versions are immutable. If a release has a non-critical problem, deprecate the affected version with a useful migration message and publish a corrected version. Reserve unpublishing for a confirmed secret, malware, or similarly severe incident, and follow npm policy rather than treating unpublish as rollback.
