import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sdkRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(join(sdkRoot, "package.json"), "utf8"),
);
const expectedRepository = "yasir-mrwt/inflowAPM";
const expectedTag = `node-v${packageJson.version}`;
const initialPackageName = "@inflowapm/node";
const initialPackageVersion = "0.1.0";
const initialReleaseTag = "node-v0.1.0";
const npmRegistry = "https://registry.npmjs.org/";
const isInitialPublish = process.env.INFLOWAPM_INITIAL_PUBLISH === "true";

function git(...args) {
  return execFileSync("git", args, {
    cwd: sdkRoot,
    encoding: "utf8",
  }).trim();
}

if (isInitialPublish) {
  const intendedCommit = process.env.INFLOWAPM_INITIAL_PUBLISH_COMMIT;
  const headCommit = git("rev-parse", "HEAD^{commit}");
  const tagType = git("cat-file", "-t", initialReleaseTag);
  const tagCommit = git("rev-parse", `${initialReleaseTag}^{commit}`);
  const exactTag = git("describe", "--tags", "--exact-match");
  const status = git("status", "--porcelain", "--untracked-files=all");

  assert.notEqual(
    process.env.GITHUB_ACTIONS,
    "true",
    "the initial publish path is manual-only; GitHub Actions must use trusted publishing",
  );
  assert.equal(packageJson.name, initialPackageName, "initial publish package name is locked");
  assert.equal(packageJson.version, initialPackageVersion, "initial publish version is locked");
  assert.equal(expectedTag, initialReleaseTag, "initial publish release tag is locked");
  assert.equal(
    process.env.npm_config_access,
    "public",
    "initial publish must be invoked with --access public",
  );
  assert.match(
    intendedCommit ?? "",
    /^[0-9a-f]{40}$/,
    "set INFLOWAPM_INITIAL_PUBLISH_COMMIT to the reviewed full release commit SHA",
  );
  assert.equal(tagType, "tag", `${initialReleaseTag} must be an annotated tag`);
  assert.equal(exactTag, initialReleaseTag, `checked-out tag must be exactly ${initialReleaseTag}`);
  assert.equal(headCommit, intendedCommit, "HEAD must equal the explicitly approved release commit");
  assert.equal(tagCommit, intendedCommit, `${initialReleaseTag} must resolve to the approved commit`);
  assert.equal(status, "", "initial publishing requires a completely clean worktree");
} else {
  assert.equal(
    process.env.GITHUB_ACTIONS,
    "true",
    "publishing is restricted to the GitHub Actions release workflow",
  );
  assert.equal(
    process.env.GITHUB_EVENT_NAME,
    "release",
    "publishing requires a published GitHub Release",
  );
  assert.equal(
    process.env.GITHUB_REPOSITORY,
    expectedRepository,
    `publishing is restricted to ${expectedRepository}`,
  );
  assert.equal(
    process.env.GITHUB_REF_NAME,
    expectedTag,
    `release tag must be exactly ${expectedTag}`,
  );
}
assert.equal(packageJson.name, initialPackageName, "release package name must remain @inflowapm/node");
assert.equal(packageJson.private, false, "remove private:true only when publication is approved");
assert.equal(
  packageJson.publishConfig?.access,
  "public",
  "release package must explicitly publish with public access",
);
assert.equal(
  packageJson.publishConfig?.registry,
  npmRegistry,
  `release package must use ${npmRegistry}`,
);
assert.equal(
  packageJson.publishConfig?.provenance,
  true,
  "trusted-workflow releases must retain npm provenance",
);
assert.equal(
  packageJson.license,
  "MIT",
  "release metadata must retain the approved MIT license",
);
assert.ok(
  existsSync(join(sdkRoot, "LICENSE")) || existsSync(join(sdkRoot, "LICENCE")),
  "include the selected license text before publishing",
);

const changelog = readFileSync(join(sdkRoot, "CHANGELOG.md"), "utf8");
assert.match(
  changelog,
  new RegExp(`^## \\[?${packageJson.version.replaceAll(".", "\\.")}\\]?`, "m"),
  `CHANGELOG.md must contain a release section for ${packageJson.version}`,
);

console.log(
  `Release guard passed for ${packageJson.name}@${packageJson.version} (${isInitialPublish ? "one-time initial publish" : "trusted workflow"}).`,
);
