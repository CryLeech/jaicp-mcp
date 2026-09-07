import assert from "node:assert/strict";
import { test } from "node:test";
import { findOperation, loadAllSpecs, resetSpecCache, SPECS } from "../src/openapi.mjs";

test("loads 160 operations and sandboxed refs", () => {
  resetSpecCache();
  const all = loadAllSpecs();
  const total = SPECS.reduce((n, s) => n + all[s.id].operations.length, 0);
  assert.equal(total, 160);
  const addPhones = findOperation("calls", "addPhones").operation;
  assert.ok(addPhones.params.some((p) => p.name === "Idempotence-Key"));
});

test("duplicate text-campaign ids require path", () => {
  assert.throws(() => findOperation("text-campaign", "getTextCampaign"), /ambiguous[\s\S]*path/);
  assert.throws(() => findOperation("text-campaign", "updateTextCampaign"), /ambiguous/);
  const getV1 = findOperation(
    "text-campaign",
    "getTextCampaign",
    "/api/v1/text-campaign-service/projects/{projectShortName}/text-campaigns/{textCampaignId}",
  );
  const getAccount = findOperation(
    "text-campaign",
    "getTextCampaign",
    "/api/text-campaign-service/accounts/{accountId}/projects/{projectShortName}/text-campaigns/{textCampaignId}",
  );
  assert.notEqual(getV1.operation.path, getAccount.operation.path);
  const upd = findOperation(
    "text-campaign",
    "updateTextCampaign",
    "/api/v1/text-campaign-service/projects/{projectShortName}/text-campaigns/{textCampaignId}",
  );
  assert.equal(upd.operation.method, "PUT");
});

test("every operation is uniquely selectable and classified", () => {
  const all = loadAllSpecs();
  for (const spec of SPECS) {
    const ops = all[spec.id].operations;
    for (const op of ops) {
      assert.equal(typeof op.isWrite, "boolean");
      const sameId = ops.filter((other) => other.operationId === op.operationId);
      if (sameId.length === 1) {
        assert.equal(findOperation(spec.id, op.operationId).operation.path, op.path);
      } else {
        assert.equal(findOperation(spec.id, op.operationId, op.path).operation.path, op.path);
      }
    }
  }
});

test("safety classification for known operations", () => {
  assert.equal(findOperation("reporter", "getSessionDataByFilter").operation.isWrite, false);
  assert.equal(findOperation("reporter", "createFilterSetId").operation.isWrite, false);
  assert.equal(findOperation("reporter", "createSessionReport").operation.isWrite, true);
  assert.equal(findOperation("calls", "addPhoneGet").operation.isWrite, true);
  assert.equal(findOperation("calls", "getCallTask").operation.isWrite, false);
  assert.equal(findOperation("caila", "exportProject").operation.isWrite, false);
  assert.equal(findOperation("caila", "createEntity").operation.isWrite, true);
  assert.equal(findOperation("project", "getAll").operation.isWrite, false);
  assert.equal(findOperation("bot-channel", "create").operation.isWrite, true);
});

test("content types are extracted", () => {
  assert.deepEqual(findOperation("calls", "addPhonePost").operation.requestContentTypes, [
    "application/x-www-form-urlencoded",
  ]);
  assert.ok(findOperation("caila", "uploadRecords").operation.requestContentTypes.includes("multipart/form-data"));
  assert.ok(findOperation("caila", "exportIntents").operation.responseContentTypes.includes("application/octet-stream"));
});
