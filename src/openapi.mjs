import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SPECS_DIR = path.resolve(__dirname, "../vendor/specs");

export const SPECS = [
  {
    id: "bot-channel",
    file: "bot-channel-api.yml",
    title: "Bot channel API",
    docs: "https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.html",
    auth: "unified",
    basePath: "",
  },
  {
    id: "project",
    file: "project-api.yml",
    title: "Project API",
    docs: "https://app.jaicp.com/api/api-gateway/static/specs/project-api.html",
    auth: "unified",
    basePath: "",
  },
  {
    id: "reporter",
    file: "reporter-api.yml",
    title: "Reporter API",
    docs: "https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.html",
    auth: "unified",
    basePath: "",
  },
  {
    id: "async",
    file: "async-api.yml",
    title: "Async API (reporter long-poll)",
    docs: "https://app.jaicp.com/api/api-gateway/static/specs/async-api.html",
    auth: "unified",
    basePath: "",
  },
  {
    id: "text-campaign",
    file: "text-campaign-api.yml",
    title: "Text campaign API",
    docs: "https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.html",
    auth: "unified",
    basePath: "",
  },
  {
    id: "caila",
    file: "direct.yml",
    title: "CAILA NLP Direct API",
    docs: "https://app.jaicp.com/cailapub/static/openapi/direct-api-en.html",
    auth: "nlp",
    basePath: "/cailapub",
    pathToken: "accessToken",
  },
  {
    id: "calls",
    file: "calls.yml",
    title: "Calls / Dialer API",
    docs: "https://app.jaicp.com/dialer/static/openapi/index.html",
    auth: "calls",
    basePath: "",
    pathToken: "token",
  },
];

export const SPEC_IDS = SPECS.map((s) => s.id);

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

const WRITE_OVERRIDES = new Set(["addPhoneGet", "addPhoneGetTest", "addPhonePost", "addPhones"]);

const READ_OVERRIDES = new Set([
  "exportProject",
  "exportIntents",
  "getMessageStats",
  "getSessionStats",
  "getSessionLabelStats",
  "getLogLabelStats",
  "getSessionDataByFilter",
  "getClientDataByFilter",
  "getAllClientDataForBot",
  "getMessageDataByFilter",
  "getStateRoutesDataByFilter",
  "getFilterOptions",
  "getIntervalFilterOptions",
  "getAvailableFilters",
]);

const yamlCache = new Map();
let allCache;

export function resetSpecCache() {
  yamlCache.clear();
  allCache = undefined;
}

function assertInsideSpecs(resolved) {
  const root = SPECS_DIR;
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Ref escapes specs dir: ${resolved}`);
  }
}

function loadYamlFile(filePath) {
  const resolved = path.resolve(filePath);
  assertInsideSpecs(resolved);
  if (yamlCache.has(resolved)) {
    return yamlCache.get(resolved);
  }
  const doc = parseYaml(fs.readFileSync(resolved, "utf8"));
  yamlCache.set(resolved, doc);
  return doc;
}

function getByPointer(doc, pointer) {
  let cur = doc;
  for (const part of pointer.split("/").filter(Boolean)) {
    const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
    if (cur == null || typeof cur !== "object" || !(key in cur)) {
      return undefined;
    }
    cur = cur[key];
  }
  return cur;
}

function resolveRef(ref, specDir, currentDoc, seen = new Set()) {
  if (!ref) {
    return undefined;
  }
  if (seen.has(ref)) {
    throw new Error(`Cyclic $ref: ${ref}`);
  }
  seen.add(ref);
  if (ref.startsWith("#/")) {
    return getByPointer(currentDoc, ref.slice(2));
  }
  const hash = ref.indexOf("#/");
  if (hash === -1) {
    return loadYamlFile(path.join(specDir, ref));
  }
  const file = ref.slice(0, hash);
  const pointer = ref.slice(hash + 2);
  const other = loadYamlFile(path.join(specDir, file));
  return getByPointer(other, pointer);
}

function resolveNode(node, specDir, currentDoc, seen = new Set()) {
  if (!node || typeof node !== "object") {
    return node;
  }
  if (node.$ref) {
    return resolveNode(resolveRef(node.$ref, specDir, currentDoc, seen), specDir, currentDoc, seen);
  }
  return node;
}

function flattenParams(operation, pathItem, specDir, currentDoc) {
  const raw = [...(pathItem.parameters || []), ...(operation.parameters || [])];
  const byKey = new Map();
  for (const item of raw) {
    const param = resolveNode(item, specDir, currentDoc);
    if (!param?.name || (param.in === "header" && param.name.toLowerCase() === "authorization")) {
      continue;
    }
    const schema = resolveNode(param.schema, specDir, currentDoc) || {};
    byKey.set(`${param.in}:${param.name}`, {
      name: param.name,
      in: param.in,
      required: param.in === "path" ? param.required !== false : Boolean(param.required),
      description: param.description || "",
      default: schema.default,
      type: schema.type,
      style: param.style,
      explode: param.explode,
    });
  }
  return [...byKey.values()];
}

function contentTypes(node, specDir, currentDoc) {
  const resolved = resolveNode(node, specDir, currentDoc);
  return resolved?.content ? Object.keys(resolved.content) : [];
}

function requestMeta(operation, specDir, currentDoc) {
  const body = resolveNode(operation.requestBody, specDir, currentDoc);
  if (!body) {
    return { hasBody: false, bodyRequired: false, requestContentTypes: [] };
  }
  const types = contentTypes(body, specDir, currentDoc);
  return {
    hasBody: true,
    bodyRequired: Boolean(body.required),
    requestContentTypes: types,
  };
}

function responseMeta(operation, specDir, currentDoc) {
  const responses = operation.responses || {};
  const success = responses["200"] || responses["201"] || responses["202"] || responses.default;
  return {
    responseContentTypes: contentTypes(success, specDir, currentDoc),
  };
}

export function isWriteOperation(operation) {
  const id = operation.operationId;
  if (WRITE_OVERRIDES.has(id)) {
    return true;
  }
  if (READ_OVERRIDES.has(id)) {
    return false;
  }
  if (String(operation.securityAuthority || "").endsWith("_READ")) {
    return false;
  }
  const method = operation.method;
  if (method === "GET" || method === "HEAD") {
    return false;
  }
  return true;
}

export function loadSpec(specMeta) {
  const filePath = path.join(SPECS_DIR, specMeta.file);
  const doc = loadYamlFile(filePath);
  const operations = [];
  const paths = doc.paths || {};
  for (const [rawPath, rawPathItem] of Object.entries(paths)) {
    const pathItem = resolveNode(rawPathItem, SPECS_DIR, doc);
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [method, rawOperation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !rawOperation || typeof rawOperation !== "object") {
        continue;
      }
      const operation = resolveNode(rawOperation, SPECS_DIR, doc);
      const operationId =
        operation.operationId || `${method}_${rawPath.replace(/[^a-zA-Z0-9]+/g, "_")}`;
      const params = flattenParams(operation, pathItem, SPECS_DIR, doc);
      const req = requestMeta(operation, SPECS_DIR, doc);
      const res = responseMeta(operation, SPECS_DIR, doc);
      const next = {
        specId: specMeta.id,
        operationId,
        method: method.toUpperCase(),
        path: rawPath,
        summary: operation.summary || operation.description || "",
        tags: operation.tags || [],
        params,
        hasBody: req.hasBody,
        bodyRequired: req.bodyRequired,
        requestContentTypes: req.requestContentTypes,
        responseContentTypes: res.responseContentTypes,
        securityAuthority: operation["x-security-authority"] || "",
      };
      next.isWrite = isWriteOperation(next);
      operations.push(next);
    }
  }
  return { meta: specMeta, operations };
}

export function loadAllSpecs() {
  if (allCache) {
    return allCache;
  }
  const byId = {};
  for (const meta of SPECS) {
    byId[meta.id] = loadSpec(meta);
  }
  allCache = byId;
  return byId;
}

export function findOperation(specId, operationId, opPath) {
  const spec = loadAllSpecs()[specId];
  if (!spec) {
    throw new Error(`Unknown spec: ${specId}. Use one of: ${SPEC_IDS.join(", ")}`);
  }
  let matches = spec.operations.filter((op) => op.operationId === operationId);
  if (opPath) {
    matches = matches.filter((op) => op.path === opPath);
  }
  if (matches.length === 0) {
    throw new Error(
      opPath
        ? `Unknown operationId "${operationId}" with path "${opPath}" in spec ${specId}`
        : `Unknown operationId "${operationId}" in spec ${specId}`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `operationId "${operationId}" is ambiguous in ${specId}. Pass path: ${matches.map((m) => m.path).join(" | ")}`,
    );
  }
  return { spec: spec.meta, operation: matches[0] };
}

if (process.argv.includes("--print")) {
  const all = loadAllSpecs();
  for (const meta of SPECS) {
    const n = all[meta.id].operations.length;
    process.stdout.write(`${meta.id}\t${n}\n`);
  }
}
