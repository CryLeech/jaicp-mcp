import { fillPath } from "./path.mjs";

export function tokenFor(config, kind) {
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

export function injectPathTokens(spec, pathParams, config) {
  const values = { ...pathParams };
  if (spec.pathToken === "accessToken" && !values.accessToken) {
    values.accessToken = tokenFor(config, "nlp");
  }
  if (spec.pathToken === "token" && !values.token) {
    values.token = tokenFor(config, "calls");
  }
  if (spec.pathToken && !values[spec.pathToken]) {
    throw new Error(
      `No ${spec.pathToken} for ${spec.id}. Set it in pathParams or in the env file`,
    );
  }
  return values;
}

function empty(value) {
  return value === undefined || value === null || value === "";
}

export function applyDefaults(operation, { pathParams, query, headers, defaultProject }) {
  const nextPath = { ...pathParams };
  const nextQuery = { ...query };
  const nextHeaders = { ...headers };
  for (const param of operation.params) {
    const bucket =
      param.in === "path" ? nextPath : param.in === "query" ? nextQuery : param.in === "header" ? nextHeaders : null;
    if (!bucket) {
      continue;
    }
    if (!empty(bucket[param.name])) {
      continue;
    }
    if (param.name === "projectShortName" && defaultProject) {
      bucket[param.name] = defaultProject;
      continue;
    }
    if (param.default !== undefined) {
      bucket[param.name] = param.default;
    }
  }
  return { pathParams: nextPath, query: nextQuery, headers: nextHeaders };
}

export function assertRequired(operation, { pathParams, query, headers, body }) {
  const missing = [];
  for (const param of operation.params) {
    if (!param.required) {
      continue;
    }
    const bucket =
      param.in === "path" ? pathParams : param.in === "query" ? query : param.in === "header" ? headers : null;
    if (empty(bucket?.[param.name]) && !(Array.isArray(bucket?.[param.name]) && bucket[param.name].length)) {
      missing.push(`${param.in}.${param.name}`);
    }
  }
  if (operation.bodyRequired && (body === undefined || body === null)) {
    missing.push("body");
  }
  if (missing.length) {
    throw new Error(`Missing required: ${missing.join(", ")}`);
  }
}

export function serializeQuery(operation, query) {
  const pairs = [];
  const byName = new Map(operation.params.filter((p) => p.in === "query").map((p) => [p.name, p]));
  for (const [name, value] of Object.entries(query || {})) {
    if (empty(value) && !Array.isArray(value)) {
      continue;
    }
    const param = byName.get(name);
    const explode = param?.explode !== false;
    if (Array.isArray(value)) {
      if (explode) {
        for (const item of value) {
          if (!empty(item)) {
            pairs.push([name, String(item)]);
          }
        }
      } else if (value.length) {
        pairs.push([name, value.map(String).join(",")]);
      }
      continue;
    }
    pairs.push([name, String(value)]);
  }
  return pairs;
}

export function requestContentType(operation) {
  const types = operation.requestContentTypes || [];
  if (types.includes("multipart/form-data")) {
    return "multipart/form-data";
  }
  if (types.includes("application/x-www-form-urlencoded")) {
    return "application/x-www-form-urlencoded";
  }
  if (types.includes("application/json") || types.length === 0) {
    return "application/json";
  }
  return types[0];
}

export function buildCall({ spec, operation, config, args }) {
  const applied = applyDefaults(operation, {
    pathParams: args.pathParams || {},
    query: args.query || {},
    headers: args.headers || {},
    defaultProject: config.defaultProject,
  });
  const pathValues = injectPathTokens(spec, applied.pathParams, config);
  assertRequired(operation, {
    pathParams: pathValues,
    query: applied.query,
    headers: applied.headers,
    body: args.body,
  });
  const pathname = `${spec.basePath}${fillPath(operation.path, pathValues)}`;
  return {
    pathname,
    queryPairs: serializeQuery(operation, applied.query),
    headers: applied.headers,
    contentType: requestContentType(operation),
  };
}
