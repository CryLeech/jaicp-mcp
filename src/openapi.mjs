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

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);

const yamlCache = new Map();

function loadYamlFile(filePath) {
  const resolved = path.resolve(filePath);
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
    if (cur == null || !(key in cur)) {
      return undefined;
    }
    cur = cur[key];
  }
  return cur;
}

function resolveRef(ref, specDir, currentDoc) {
  if (!ref) {
    return undefined;
  }
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

function resolveParam(param, specDir, currentDoc) {
  if (!param) {
    return undefined;
  }
  if (param.$ref) {
    return resolveParam(resolveRef(param.$ref, specDir, currentDoc), specDir, currentDoc);
  }
  return param;
}

function flattenParams(operation, pathItem, specDir, currentDoc) {
  const raw = [...(pathItem.parameters || []), ...(operation.parameters || [])];
  const out = [];
  for (const item of raw) {
    const param = resolveParam(item, specDir, currentDoc);
    if (!param?.name || param.in === "header" && param.name.toLowerCase() === "authorization") {
      continue;
    }
    out.push({
      name: param.name,
      in: param.in,
      required: Boolean(param.required),
      description: param.description || "",
    });
  }
  return out;
}

function hasRequestBody(operation) {
  return Boolean(operation.requestBody);
}

export function loadSpec(specMeta) {
  const filePath = path.join(SPECS_DIR, specMeta.file);
  const doc = loadYamlFile(filePath);
  const operations = [];
  const paths = doc.paths || {};
  for (const [rawPath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== "object") {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || !operation || typeof operation !== "object") {
        continue;
      }
      const operationId =
        operation.operationId ||
        `${method}_${rawPath.replace(/[^a-zA-Z0-9]+/g, "_")}`;
      const params = flattenParams(operation, pathItem, SPECS_DIR, doc);
      operations.push({
        specId: specMeta.id,
        operationId,
        method: method.toUpperCase(),
        path: rawPath,
        summary: operation.summary || operation.description || "",
        tags: operation.tags || [],
        params,
        hasBody: hasRequestBody(operation),
      });
    }
  }
  return { meta: specMeta, operations };
}

let allCache;

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

export function findOperation(specId, operationId) {
  const spec = loadAllSpecs()[specId];
  if (!spec) {
    throw new Error(`Unknown spec: ${specId}. Use one of: ${SPECS.map((s) => s.id).join(", ")}`);
  }
  const matches = spec.operations.filter((op) => op.operationId === operationId);
  if (matches.length === 0) {
    throw new Error(`Unknown operationId "${operationId}" in spec ${specId}`);
  }
  if (matches.length > 1) {
    throw new Error(
      `operationId "${operationId}" is ambiguous in ${specId}: ${matches.map((m) => m.method).join(", ")}`,
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
