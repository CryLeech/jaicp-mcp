#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./env.mjs";
import { formatResult, isWriteRequest, jaicpFetch, redactedError } from "./http.mjs";
import { SPECS, findOperation, loadAllSpecs } from "./openapi.mjs";

const config = loadConfig();

function textResult(text) {
  return { content: [{ type: "text", text }] };
}

function errorResult(err) {
  return {
    isError: true,
    content: [{ type: "text", text: redactedError(err) }],
  };
}

function tokenFor(kind) {
  switch (kind) {
    case "unified":
      return config.unifiedToken;
    case "nlp":
      return config.nlpToken;
    case "calls":
      return config.callsToken;
    default: {
      const _exhaustive = kind;
      throw new Error(`Unknown token kind: ${_exhaustive}`);
    }
  }
}

function fillPath(template, values) {
  const missing = [];
  const filled = template.replace(/\{([^}]+)\}/g, (_, name) => {
    const value = values[name];
    if (value === undefined || value === null || value === "") {
      missing.push(name);
      return `{${name}}`;
    }
    return encodeURIComponent(String(value));
  });
  if (missing.length) {
    throw new Error(`Missing path params: ${missing.join(", ")}`);
  }
  return filled;
}

function injectPathTokens(spec, pathParams) {
  const values = { ...pathParams };
  if (spec.pathToken === "accessToken" && !values.accessToken) {
    values.accessToken = tokenFor("nlp");
  }
  if (spec.pathToken === "token" && !values.token) {
    values.token = tokenFor("calls");
  }
  if (spec.pathToken && !values[spec.pathToken]) {
    throw new Error(
      `No ${spec.pathToken} for ${spec.id}. Set it in pathParams or in jaicp.env`,
    );
  }
  return values;
}

function injectQueryDefaults(operation, query) {
  const next = { ...query };
  const names = new Set(operation.params.filter((p) => p.in === "query").map((p) => p.name));
  if (names.has("projectShortName") && !next.projectShortName && config.defaultProject) {
    next.projectShortName = config.defaultProject;
  }
  return next;
}

const VERSION = "0.1.0";

const server = new McpServer({
  name: "jaicp",
  version: VERSION,
});

server.tool(
  "jaicp_specs",
  "Official JAICP OpenAPI specs this MCP was built from. No network.",
  async () => {
    const all = loadAllSpecs();
    return textResult(
      JSON.stringify(
        {
          host: config.host,
          envSource: config.envSource,
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
    spec: z
      .enum(["bot-channel", "project", "reporter", "async", "text-campaign", "caila", "calls"]),
    search: z.string().optional(),
  },
  async (args) => {
    const all = loadAllSpecs();
    let ops = all[args.spec].operations;
    if (args.search) {
      const q = args.search.toLowerCase();
      ops = ops.filter((op) =>
        [op.operationId, op.path, op.summary, ...(op.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    const slim = ops.map((op) => ({
      operationId: op.operationId,
      method: op.method,
      path: op.path,
      summary: op.summary,
      tags: op.tags,
      pathParams: op.params.filter((p) => p.in === "path").map((p) => p.name),
      queryParams: op.params.filter((p) => p.in === "query").map((p) => p.name),
      headerParams: op.params.filter((p) => p.in === "header").map((p) => p.name),
      hasBody: op.hasBody,
    }));
    return textResult(JSON.stringify({ spec: args.spec, count: slim.length, operations: slim }, null, 2));
  },
);

server.tool(
  "jaicp_call",
  "Call a JAICP OpenAPI operation by spec id + operationId. Writes need confirm=true.",
  {
    spec: z
      .enum(["bot-channel", "project", "reporter", "async", "text-campaign", "caila", "calls"]),
    operationId: z.string(),
    pathParams: z.record(z.union([z.string(), z.number()])).optional(),
    query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    headers: z.record(z.union([z.string(), z.number()])).optional(),
    body: z.unknown().optional(),
    confirm: z
      .boolean()
      .optional()
      .describe("Required true for create/update/delete and dialer addPhone GET"),
  },
  async (args) => {
    try {
      const { spec, operation } = findOperation(args.spec, args.operationId);
      const pathValues = injectPathTokens(spec, args.pathParams || {});
      const pathname = `${spec.basePath}${fillPath(operation.path, pathValues)}`;
      if (isWriteRequest(operation.method, pathname) && args.confirm !== true) {
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
      const skipAuth = spec.auth !== "unified";
      const result = await jaicpFetch({
        host: config.host,
        token: skipAuth ? undefined : tokenFor("unified"),
        skipAuth,
        method: operation.method,
        path: pathname,
        query: injectQueryDefaults(operation, args.query || {}),
        headers: args.headers,
        body: args.body,
      });
      return textResult(formatResult(result));
    } catch (err) {
      return errorResult(err);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
