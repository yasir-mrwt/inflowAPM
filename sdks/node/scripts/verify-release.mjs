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
const isBootstrapRelease = process.env.INFLOWAPM_BOOTSTRAP_RELEASE === "true";

if (isBootstrapRelease) {
  const exactTag = execFileSync("git", ["describe", "--tags", "--exact-match"], {
    cwd: sdkRoot,
    encoding: "utf8",
  }).trim();
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: sdkRoot,
    encoding: "utf8",
  }).trim();

  assert.equal(exactTag, expectedTag, `checked-out tag must be exactly ${expectedTag}`);
  assert.equal(status, "", "bootstrap publishing requires a clean worktree");
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
assert.equal(packageJson.private, false, "remove private:true only when publication is approved");
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
  `Release guard passed for ${packageJson.name}@${packageJson.version} (${isBootstrapRelease ? "bootstrap" : "trusted workflow"}).`,
);
