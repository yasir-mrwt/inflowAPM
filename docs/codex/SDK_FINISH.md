# InflowAPM — Finish Node SDK Efficiently (SDK-6 remainder + SDK-7 release)

Act as a senior package engineer, software engineer, optimizer, and debugger.

## Token / context efficiency rules

- Treat SDK-0 through SDK-5 and the completed parts of SDK-6 as already done.
- Do **not** re-audit the whole repository.
- Inspect only files relevant to the unresolved SDK-6 validation, SDK docs/homepage/SEO changes, and release files.
- Reuse existing test/build scripts and existing reports instead of re-explaining prior work.
- Keep progress updates brief.
- Do not repeat large code blocks or documentation in chat unless needed to explain a failure.
- Prefer targeted tests while debugging; run full gates only after the root cause is fixed.
- Do not modify unrelated backend/frontend code.

## Current state

SDK-0 through SDK-5: complete.

SDK-6 implementation is mostly complete:
- SDK README/docs work
- homepage SDK onboarding
- `/docs`
- sitemap
- robots/crawler policy
- structured data
- `llms.txt`
- responsive checks
- frontend lint/TypeScript/build/runtime checks

Unresolved SDK-6 blocker:
- one Node 26 concurrency test became flaky
- one repetition did not exit cleanly

The SDK is still unpublished.
Frontend feature development remains paused after F7.
Python is not started.

---

# Stage A — Finish SDK-6

## Goal

Resolve the Node 26 flaky concurrency/open-exit issue, revalidate SDK-6, and mark it complete only if release readiness is stable.

## Required work

1. Preserve all existing SDK-6 changes.
2. Identify the exact flaky concurrency test and reproduce it in isolation.
3. Determine the real cause:
   - SDK race/resource bug,
   - flaky timing/test assumption,
   - or interference from previous browser/frontend processes.
4. Inspect for:
   - timers,
   - retry timers,
   - sockets,
   - HTTP servers,
   - child processes,
   - pending fetches,
   - unhandled promises,
   - open handles.
5. Fix the root cause.
6. Do **not** hide the issue by only increasing sleeps/timeouts.

## Validation

Run isolated SDK gates:

### Node 24
- lint
- TypeScript
- full tests
- build
- ESM import
- CommonJS import
- types
- open-handle check
- npm pack verification

### Node 26
- same full gate
- repeat the previously flaky concurrency test multiple times
- run the full suite at least twice if practical
- confirm natural process exit every run

Then run only the minimum frontend checks required to confirm SDK-6 docs/homepage/SEO changes still work.

## SDK-6 completion gate

Only mark SDK-6 complete if:

- Node 24: PASS
- Node 26: PASS
- flaky test: stable
- natural exit: PASS
- open handles: NONE
- frontend docs/homepage: PASS
- SDK docs match real API
- npm pack: PASS
- npm remains unpublished

Return a concise SDK-6 completion report.

If SDK-6 is not stable, STOP and report the blocker.

If SDK-6 passes, continue to Stage B.

---

# Stage B — SDK-7: First Release Activation & External Verification

SDK-7 is the final Node SDK completion stage.

## Goal

Prepare and verify the first public release of:

`@inflowapm/node`

Current intended license: MIT  
Current npm scope: `@inflowapm`  
Current organization owner access: confirmed  
Current package state: release-ready but intentionally blocked from publication

## Important safety rule

Do **not** publish silently.

Prepare everything for publication, run all pre-release checks, and stop at the final irreversible publish command unless the user has explicitly authorized publication in the current Codex session.

If explicit publication authorization is already present, publish once and continue with post-publish verification.

## Release activation tasks

1. Re-check:
   - package name
   - version
   - MIT license
   - `engines.node >=24`
   - Node 24 + 26 compatibility
   - exports
   - types
   - ESM/CJS
   - files whitelist
   - repository/homepage/bugs metadata
   - public access
   - provenance/release workflow
   - changelog
   - security policy
   - clean working tree expectations
2. Verify no secrets or local files are included.
3. Run:
   - tests
   - build
   - `npm pack --dry-run`
   - packed consumer import checks
   - audit
4. Remove/adjust only the intentional publication guard required for the real release.
5. Do not weaken CI/release safety.

## First publication

Target command after all checks pass:

`npm publish --access public`

Use the actual package version from `package.json`.

Do not invent a new version unless required.

## Post-publish verification

After successful publication:

1. Verify registry metadata:
   - `npm view @inflowapm/node`
2. Create a clean temporary consumer project outside the repository.
3. Install from the public registry:
   - `npm install @inflowapm/node`
4. Verify:
   - ESM import
   - CommonJS import
   - TypeScript types
   - Express integration can initialize
5. Do not depend on workspace/local package resolution for this verification.
6. Confirm the installed version matches the published version.

## Website/docs publication-state update

Only after the npm package is actually public and installable:

Change public wording from something like:

`Release ready / Publishing next`

to truthful wording such as:

`Available on npm`

Show the real command:

`npm install @inflowapm/node`

Do not modify unrelated homepage sections.

Re-run relevant frontend validation after this small state change.

## Final Node SDK completion report

Return only a concise report:

### NODE SDK PROGRAM COMPLETE

- SDK-6 stable: YES / NO
- Flaky test root cause:
- Node 24: PASS / FAIL
- Node 26: PASS / FAIL
- Open handles: NONE / issue
- Package: `@inflowapm/node`
- Version:
- License: MIT
- Runtime dependencies:
- Tarball size:
- npm published: YES / NO
- Public install verified: YES / NO
- ESM consumer: PASS / FAIL
- CommonJS consumer: PASS / FAIL
- Types consumer: PASS / FAIL
- Express consumer: PASS / FAIL
- Homepage/docs publication state updated: YES / NO
- Backend modified: YES / NO
- Python started: NO
- F8 started: NO
- Remaining blockers:

### NEXT PROJECT STEP

`F8 — Authentication UI`

STOP after this report.

Do not start F8 automatically.
Do not start Python automatically.
