const MAX_CHARS = 120_000;

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const READ_POST_RE =
  /\/(filter|filters|filter-options|stats|by-session|by-client|page-in-|all-for-bot|count)(\/|$)/i;

export function isWriteRequest(method, pathname) {
  const m = method.toUpperCase();
  const p = pathname.toLowerCase();
  if (p.includes("addphone")) {
    return true;
  }
  if (m === "GET" || m === "HEAD") {
    return false;
  }
  if (!WRITE_METHODS.has(m)) {
    return true;
  }
  if (m === "POST" && READ_POST_RE.test(pathname)) {
    return false;
  }
  return true;
}

export async function jaicpFetch({
  host,
  token,
  method,
  path: reqPath,
  query,
  body,
  headers: extraHeaders,
  skipAuth = false,
}) {
  if (!skipAuth && !token) {
    throw new Error("Missing API token for this call");
  }
  const url = new URL(reqPath.startsWith("http") ? reqPath : `${host}${reqPath}`);
  if (query && typeof query === "object") {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") {
        continue;
      }
      url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    Accept: "application/json",
  };
  if (extraHeaders && typeof extraHeaders === "object") {
    for (const [k, v] of Object.entries(extraHeaders)) {
      if (v === undefined || v === null || v === "") {
        continue;
      }
      if (k.toLowerCase() === "authorization") {
        continue;
      }
      headers[k] = String(v);
    }
  }
  if (!skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }
  const init = { method: method.toUpperCase(), headers };
  if (body !== undefined && body !== null && init.method !== "GET" && init.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return {
    ok: res.ok,
    status: res.status,
    url: redactUrl(`${url.origin}${url.pathname}`),
    data: parsed,
  };
}

function redactUrl(value) {
  return value
    .replace(/\/chatapi\/[^/]+/gi, "/chatapi/[token]")
    .replace(/\/cailapub\/api\/caila\/p\/[^/]+/gi, "/cailapub/api/caila/p/[token]")
    .replace(/\/api\/caila\/p\/[^/]+/gi, "/api/caila/p/[token]")
    .replace(/\/campaign\/[^/]+/gi, "/campaign/[token]")
    .replace(/\d{6,}:AA[A-Za-z0-9_-]+/g, "[telegram-token]");
}

const SECRET_KEY_RE =
  /token|secret|password|authorization|apikey|justAiKey|accessToken|verifyToken|bearer/i;

function redactSecrets(value) {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY_RE.test(k) && typeof v === "string" && v.length > 0) {
        out[k] = `[redacted ${v.length} chars]`;
      } else if (k.toLowerCase() === "webhookurl" && typeof v === "string") {
        out[k] = redactUrl(v);
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out;
  }
  return value;
}

export function formatResult(result) {
  const payload = {
    ok: result.ok,
    status: result.status,
    url: redactUrl(result.url),
    data: redactSecrets(result.data),
  };
  let text = JSON.stringify(payload, null, 2);
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS)}\n… truncated, ${text.length} chars total`;
  }
  return text;
}

export function redactedError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return redactUrl(msg).replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}
