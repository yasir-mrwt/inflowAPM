import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "inflowapm-package-"));

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: sdkRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_cache: join(temporaryRoot, "npm-cache"),
    },
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

try {
  const packed = JSON.parse(
    run("npm", [
      "pack",
      "--json",
      "--silent",
      "--pack-destination",
      temporaryRoot,
    ]),
  )[0];

  assert.ok(packed, "npm pack did not describe an artifact");
  assert.ok(packed.filename, "npm pack did not return a filename");
  assert.ok(packed.integrity, "npm pack did not return an integrity digest");

  const packageJson = JSON.parse(
    readFileSync(join(sdkRoot, "package.json"), "utf8"),
  );
  assert.equal(packed.name, packageJson.name);
  assert.equal(packed.version, packageJson.version);
  assert.equal(packageJson.license, "MIT", "package metadata must use MIT");

  const paths = packed.files.map(({ path }) => path).sort();
  const requiredPaths = [
    "LICENSE",
    "README.md",
    "dist/cjs/index.js",
    "dist/esm/index.d.ts",
    "dist/esm/index.js",
    "package.json",
  ];

  for (const requiredPath of requiredPaths) {
    assert.ok(paths.includes(requiredPath), `packed artifact is missing ${requiredPath}`);
  }

  const permittedRootFiles = new Set([
    "LICENSE",
    "LICENCE",
    "README.md",
    "package.json",
  ]);
  const unexpected = paths.filter(
    (path) => !path.startsWith("dist/") && !permittedRootFiles.has(path),
  );
  assert.deepEqual(unexpected, [], `unexpected packed files: ${unexpected.join(", ")}`);

  const consumerRoot = join(temporaryRoot, "consumer");
  mkdirSync(consumerRoot);
  writeFileSync(
    join(consumerRoot, "package.json"),
    `${JSON.stringify({ name: "inflowapm-package-check", private: true }, null, 2)}\n`,
  );

  const tarball = join(temporaryRoot, packed.filename);
  const unpackedRoot = join(temporaryRoot, "unpacked");
  mkdirSync(unpackedRoot);
  run("tar", ["-xzf", tarball, "-C", unpackedRoot]);
  const unpackedPackageRoot = join(unpackedRoot, "package");
  const unpackedPackageJson = JSON.parse(
    readFileSync(join(unpackedPackageRoot, "package.json"), "utf8"),
  );
  const unpackedLicense = readFileSync(
    join(unpackedPackageRoot, "LICENSE"),
    "utf8",
  );
  assert.equal(unpackedPackageJson.name, "@inflowapm/node");
  assert.equal(unpackedPackageJson.version, packageJson.version);
  assert.equal(unpackedPackageJson.license, "MIT");
  assert.match(unpackedLicense, /^MIT License$/m);
  assert.match(unpackedLicense, /Copyright \(c\) 2026 InflowAPM contributors/);

  const installedRoot = join(
    consumerRoot,
    "node_modules",
    "@inflowapm",
    "node",
  );
  mkdirSync(dirname(installedRoot), { recursive: true });
  renameSync(unpackedPackageRoot, installedRoot);

  const esmProbe = [
    'import assert from "node:assert/strict";',
    'import { InflowAPM, SDK_NAME } from "@inflowapm/node";',
    'assert.equal(typeof InflowAPM, "function");',
    'assert.equal(SDK_NAME, "@inflowapm/node");',
  ].join("\n");
  run("node", ["--input-type=module", "--eval", esmProbe], {
    cwd: consumerRoot,
  });

  const cjsProbe = [
    'const assert = require("node:assert/strict");',
    'const { InflowAPM, SDK_NAME } = require("@inflowapm/node");',
    'assert.equal(typeof InflowAPM, "function");',
    'assert.equal(SDK_NAME, "@inflowapm/node");',
  ].join("\n");
  run("node", ["--input-type=commonjs", "--eval", cjsProbe], {
    cwd: consumerRoot,
  });

  console.log(
    `Verified ${packed.filename}: ${packed.entryCount} files, ${packed.size} bytes packed, ESM and CommonJS imports passed.`,
  );
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
