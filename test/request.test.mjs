import assert from "node:assert/strict";
import { test } from "node:test";
import { findOperation } from "../src/openapi.mjs";
import { applyDefaults, assertRequired, buildCall, serializeQuery } from "../src/request.mjs";

const config = {
  host: "https://app.jaicp.com",
  unifiedToken: "u",
  nlpToken: "n",
  callsToken: "c",
  defaultProject: "demo-bot",
};

test("injects default project into path and query", () => {
  const { operation, spec } = findOperation("text-campaign", "getTextCampaigns");
  const built = buildCall({ spec, operation, config, args: {} });
  assert.match(built.pathname, /\/projects\/demo-bot\/text-campaigns$/);
});

test("applies OpenAPI query defaults", () => {
  const { operation } = findOperation("project", "getAll");
  const applied = applyDefaults(operation, { pathParams: {}, query: {}, headers: {}, defaultProject: "" });
  assert.equal(applied.query.page, 0);
  assert.equal(applied.query.size, 20);
});

test("rejects missing required query before HTTP", () => {
  const { operation } = findOperation("caila", "initialMarkup");
  assert.throws(
    () => assertRequired(operation, { pathParams: { accessToken: "n" }, query: {}, headers: {}, body: undefined }),
    /Missing required: query.query/,
  );
});

test("serializes exploded arrays", () => {
  const operation = { params: [{ name: "botIds", in: "query", type: "array", explode: true }] };
  assert.deepEqual(serializeQuery(operation, { botIds: ["a", "b"] }), [
    ["botIds", "a"],
    ["botIds", "b"],
  ]);
  const csv = { params: [{ name: "botIds", in: "query", type: "array", explode: false }] };
  assert.deepEqual(serializeQuery(csv, { botIds: ["a", "b"] }), [["botIds", "a,b"]]);
});

test("addPhoneGet requires phone and is write", () => {
  const { spec, operation } = findOperation("calls", "addPhoneGet");
  assert.equal(operation.isWrite, true);
  assert.throws(
    () => buildCall({ spec, operation, config, args: {} }),
    /Missing required: query.phone/,
  );
});
