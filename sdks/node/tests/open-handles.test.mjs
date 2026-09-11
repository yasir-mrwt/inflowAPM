import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("an idle client does not keep the host process alive", () => {
  const fixture = fileURLToPath(
    new URL("./fixtures/no-handles.mjs", import.meta.url),
  );
  const result = spawnSync(process.execPath, [fixture], {
    encoding: "utf8",
    timeout: 2_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
});
