"use strict";

const assert = require("node:assert/strict");
const { InflowAPM, SDK_NAME } = require("@inflowapm/node");

assert.equal(typeof InflowAPM, "function");
assert.equal(SDK_NAME, "@inflowapm/node");
assert.equal(typeof new InflowAPM({
  apiKey: "import-check",
  endpoint: "http://127.0.0.1:1",
  service: "import-check",
  environment: "test",
}).express(), "function");
