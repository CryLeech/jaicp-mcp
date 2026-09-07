import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, handleJaicpCall } from "../src/server.mjs";
import { packageVersion } from "../src/version.mjs";

const config = {
  host: "https://app.jaicp.com",
  envSource: "test",
  unifiedToken: "unified-token",
  nlpToken: "nlp-token",
  callsToken: "calls-token",
  defaultProject: "jaicp_telegram_react-1000174458-shU",
  readOnly: false,
  timeoutMs: 1000,
  maxBytes: 50_000,
};

function jsonText(result) {
  return JSON.parse(result.content[0].text);
}

test("write guard and read-only happen before fetch", async () => {
  const fetchImpl = async () => {
    throw new Error("fetch should not run");
  };
  const blocked = jsonText(
    await handleJaicpCall({ spec: "project", operationId: "create", body: { name: "x" } }, config, fetchImpl),
  );
  assert.equal(blocked.error, "write_not_confirmed");
  const readOnly = jsonText(
    await handleJaicpCall(
      { spec: "project", operationId: "create", body: { name: "x" }, confirm: true },
      { ...config, readOnly: true },
      fetchImpl,
    ),
  );
  assert.equal(readOnly.error, "read_only");
});

test("unique operation injects Bearer and default project", async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = { url: String(url), auth: init.headers.Authorization, method: init.method };
    return {
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      arrayBuffer: async () => new TextEncoder().encode('{"id":1}'),
    };
  };
  const result = jsonText(
    await handleJaicpCall({ spec: "project", operationId: "getByProjectShortName" }, config, fetchImpl),
  );
  assert.equal(result.ok, true);
  assert.match(seen.url, /\/projects\/jaicp_telegram_react-1000174458-shU\/by-project-short-name$/);
  assert.equal(seen.auth, "Bearer unified-token");
});

test("caila path token and calls form body", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url: String(url), auth: init.headers.Authorization, type: init.headers["Content-Type"], body: init.body });
    return {
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      arrayBuffer: async () => new TextEncoder().encode("[]"),
    };
  };
  await handleJaicpCall({ spec: "caila", operationId: "listEntities" }, config, fetchImpl);
  await handleJaicpCall(
    { spec: "calls", operationId: "addPhonePost", body: { phone: "999" }, confirm: true },
    config,
    fetchImpl,
  );
  assert.match(seen[0].url, /\/cailapub\/api\/caila\/p\/nlp-token\/entities/);
  assert.equal(seen[0].auth, undefined);
  assert.equal(seen[1].type, "application/x-www-form-urlencoded");
  assert.equal(String(seen[1].body), "phone=999");
});

test("multipart uses base64 and binary result attaches a blob", async () => {
  let form;
  const fetchImpl = async (_url, init) => {
    form = init.body;
    return {
      status: 200,
      headers: new Headers({ "content-type": "application/octet-stream" }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]),
    };
  };
  const result = await handleJaicpCall(
    {
      spec: "caila",
      operationId: "uploadRecords",
      pathParams: { entityId: "1" },
      query: { type: "zb-csv" },
      body: { filename: "a.csv", mediaType: "text/csv", data: Buffer.from("n,v").toString("base64") },
      confirm: true,
    },
    config,
    fetchImpl,
  );
  assert.ok(form instanceof FormData);
  assert.equal(result.content[1].type, "resource");
  assert.equal(result.content[1].resource.blob, Buffer.from([1, 2, 3]).toString("base64"));
});

test("stdio-equivalent MCP session lists tools and specs version", async () => {
  const server = createServer(config);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((t) => t.name).sort(),
    ["jaicp_call", "jaicp_operations", "jaicp_specs"],
  );
  const specs = await client.callTool({ name: "jaicp_specs", arguments: {} });
  const payload = JSON.parse(specs.content[0].text);
  assert.equal(payload.version, packageVersion());
  assert.equal(payload.specs.length, 7);
  const ops = await client.callTool({
    name: "jaicp_operations",
    arguments: { spec: "text-campaign", search: "getTextCampaign" },
  });
  const listed = JSON.parse(ops.content[0].text);
  assert.ok(listed.operations.some((op) => op.ambiguous));
  await client.close();
});
