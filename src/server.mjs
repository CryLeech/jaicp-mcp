#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./env.mjs";
import { formatResult, jaicpFetch, redactedError } from "./http.mjs";
import { SPECS, SPEC_IDS, findOperation, loadAllSpecs } from "./openapi.mjs";
import { buildCall, tokenFor } from "./request.mjs";
import { packageVersion } from "./version.mjs";

const VERSION = packageVersion();
const specEnum = z.enum(SPEC_IDS);
const scalar = z.union([z.string(), z.number(), z.boolean()]);

export function textResult(text) {
  return { content: [{ type: "text", text }] };
}

export function errorResult(err) {
  return {
    isError: true,
    content: [{ type: "text", text: redactedError(err) }],
  };
}

function formattedResult(formatted) {
  if (typeof formatted === "string") {
    return textResult(formatted);
  }
  const content = [{ type: "text", text: formatted.text }];
  if (formatted.blob) {
    content.push({
      type: "resource",
      resource: {
        uri: formatted.blob.uri,
        mimeType: formatted.blob.mimeType,
        blob: formatted.blob.data,
      },
    });
  }
  return { content };
}

export function slimOperation(op, specOps) {
  const ambiguous = specOps.filter((other) => other.operationId === op.operationId).length > 1;
  return {
    operationId: op.operationId,
    method: op.method,
    path: op.path,
    summary: op.summary,
    tags: op.tags,
    pathParams: op.params.filter((p) => p.in === "path").map((p) => p.name),
    queryParams: op.params.filter((p) => p.in === "query").map((p) => p.name),
    headerParams: op.params.filter((p) => p.in === "header").map((p) => p.name),
    hasBody: op.hasBody,
    bodyRequired: op.bodyRequired,
    required: op.params.filter((p) => p.required).map((p) => `${p.in}.${p.name}`),
    defaults: Object.fromEntries(
      op.params.filter((p) => p.default !== undefined).map((p) => [p.name, p.default]),
    ),
    requestContentTypes: op.requestContentTypes,
    responseContentTypes: op.responseContentTypes,
    isWrite: op.isWrite,
    ambiguous,
  };
}

export async function handleJaicpCall(args, config, fetchImpl = fetch) {
  const { spec, operation } = findOperation(args.spec, args.operationId, args.path);
  if (operation.isWrite && config.readOnly) {
    return textResult(
      JSON.stringify({
        error: "read_only",
        hint: "JAICP_READ_ONLY forbids mutating calls.",
        spec: spec.id,
        operationId: operation.operationId,
        method: operation.method,
        path: operation.path,
      }),
    );
  }
  if (operation.isWrite && args.confirm !== true) {
    return textResult(
      JSON.stringify({
        error: "write_not_confirmed",
        hint: "Mutating call. Pass confirm=true.",
        spec: spec.id,
        operationId: operation.operationId,
        method: operation.method,
        path: operation.path,
      }),
    );
  }
  const built = buildCall({ spec, operation, config, args });
  const skipAuth = spec.auth !== "unified";
  const result = await jaicpFetch({
    host: config.host,
    token: skipAuth ? undefined : tokenFor(config, "unified"),
    skipAuth,
    method: operation.method,
    path: built.pathname,
    queryPairs: built.queryPairs,
    headers: built.headers,
    body: args.body,
    contentType: built.contentType,
    timeoutMs: config.timeoutMs,
    maxBytes: config.maxBytes,
    fetchImpl,
  });
  return formattedResult(formatResult(result));
}

export function createServer(config) {
  const server = new McpServer({
    name: "jaicp",
    version: VERSION,
  });

  server.tool(
    "jaicp_specs",
    "Official JAICP/Tovie OpenAPI specs this MCP was built from. No network.",
    async () => {
      const all = loadAllSpecs();
      return textResult(
        JSON.stringify(
          {
            host: config.host,
            envSource: config.envSource,
            readOnly: config.readOnly,
            hasUnifiedToken: Boolean(config.unifiedToken),
            hasNlpToken: Boolean(config.nlpToken),
            hasCallsToken: Boolean(config.callsToken),
            defaultProject: config.defaultProject || null,
            version: VERSION,
            specs: SPECS.map((s) => ({
              id: s.id,
              title: s.title,
              docs: s.docs,
              auth: s.auth,
              operations: all[s.id].operations.length,
            })),
          },
          null,
          2,
        ),
      );
    },
  );

  server.tool(
    "jaicp_operations",
    "List OpenAPI operations from one spec. Optional search over operationId, path, summary.",
    {
      spec: specEnum,
      search: z.string().optional(),
    },
    async (args) => {
      const all = loadAllSpecs();
      let ops = all[args.spec].operations;
      if (args.search) {
        const q = args.search.toLowerCase();
        ops = ops.filter((op) =>
          [op.operationId, op.path, op.summary, ...(op.tags || [])].join(" ").toLowerCase().includes(q),
        );
      }
      const slim = ops.map((op) => slimOperation(op, all[args.spec].operations));
      return textResult(JSON.stringify({ spec: args.spec, count: slim.length, operations: slim }, null, 2));
    },
  );

  server.tool(
    "jaicp_call",
    "Call a JAICP/Tovie OpenAPI operation by spec id + operationId. Writes need confirm=true unless JAICP_READ_ONLY.",
    {
      spec: specEnum,
      operationId: z.string(),
      path: z.string().optional().describe("Exact OpenAPI path when operationId is duplicated"),
      pathParams: z.record(z.union([z.string(), z.number()])).optional(),
      query: z.record(z.union([scalar, z.array(z.union([z.string(), z.number()]))])).optional(),
      headers: z.record(z.union([z.string(), z.number()])).optional(),
      body: z.unknown().optional(),
      confirm: z
        .boolean()
        .optional()
        .describe("Required true for mutating calls. Ignored when JAICP_READ_ONLY=true"),
    },
    async (args) => {
      try {
        return await handleJaicpCall(args, config);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  return server;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
