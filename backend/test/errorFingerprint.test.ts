import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createErrorFingerprint,
  normalizeFingerprintValue,
} from "../src/utils/errorFingerprint.js";

test("error fingerprints are stable across case and whitespace differences", () => {
  const first = createErrorFingerprint({
    errorKey: "HTTP:500",
    message: "  Database   CONNECTION failed\n",
    route: " /API/orders/:id ",
  });
  const second = createErrorFingerprint({
    errorKey: "http:500",
    message: "database connection failed",
    route: "/api/orders/:id",
  });

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(normalizeFingerprintValue("  A\n\tB  "), "a b");
});

test("meaningful error differences produce different fingerprints", () => {
  const baseline = createErrorFingerprint({
    errorKey: "http:500",
    message: "database connection failed",
    route: "/api/orders/:id",
  });
  const variations = [
    createErrorFingerprint({ errorKey: "http:503", message: "database connection failed", route: "/api/orders/:id" }),
    createErrorFingerprint({ errorKey: "http:500", message: "validation failed", route: "/api/orders/:id" }),
    createErrorFingerprint({ errorKey: "http:500", message: "database connection failed", route: "/api/payments/:id" }),
  ];

  for (const fingerprint of variations) assert.notEqual(fingerprint, baseline);
});

test("fingerprints never depend on occurrence identity or time", () => {
  const input = {
    errorKey: "event:error",
    message: "cache unavailable",
    route: "error",
  };
  assert.equal(createErrorFingerprint(input), createErrorFingerprint(input));
});
