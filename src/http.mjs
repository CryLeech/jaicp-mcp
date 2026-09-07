const DEFAULT_MAX_CHARS = 120_000;

export const SECRET_KEY_RE =
  /^(.*)?(token|secret|password|authorization|api[_-]?key|justAiKey|accessToken|verifyToken|bearer|credential|private[_-]?key|refresh[_-]?token)(.*)?$/i;

export function redactUrl(value) {
  if (typeof value !== "string") {
    return value;
  }
  let next = value
    .replace(/\/chatapi\/[^/?#]+/gi, "/chatapi/[token]")
    .replace(/\/cailapub\/api\/caila\/p\/[^/?#]+/gi, "/cailapub/api/caila/p/[token]")
    .replace(/\/api\/caila\/p\/[^/?#]+/gi, "/api/caila/p/[token]")
    .replace(/\/campaign\/[^/?#]+/gi, "/campaign/[token]")
    .replace(/\d{6,}:AA[A-Za-z0-9_-]+/g, "[telegram-token]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  try {
    const url = new URL(next);
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_KEY_RE.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    next = `${url.origin}${url.pathname}${url.search}`;
  } catch {
    next = next.replace(/([?&](?:token|accessToken|api[_-]?key|authorization)=)[^&#]+/gi, "$1[redacted]");
  }
  return next;
}

function redactString(value) {
  return redactUrl(value)
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\d{6,}:AA[A-Za-z0-9_-]+/g, "[telegram-token]");
}

export function redactSecrets(value) {
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
  if (typeof value === "string") {
    return redactString(value);
  }
  return value;
}

export function redactedError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return redactString(msg);
}

function encodeBody(contentType, body) {
  if (body === undefined || body === null) {
    return { headers: {}, body: undefined };
  }
  if (contentType === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams();
    const obj = typeof body === "string" ? Object.fromEntries(new URLSearchParams(body)) : body;
    if (!obj || typeof obj !== "object") {
      throw new Error("form-urlencoded body must be an object");
    }
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) {
        continue;
      }
      params.set(k, String(v));
    }
    return { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params };
  }
  if (contentType === "multipart/form-data") {
    const file = body?.file && typeof body.file === "object" ? body.file : body;
    if (file?.path) {
      throw new Error("Local file paths are not allowed");
    }
    if (!file?.data || typeof file.data !== "string") {
      throw new Error("multipart body requires { filename, mediaType, data } as base64");
    }
    const bytes = Buffer.from(file.data, "base64");
    const blob = new Blob([bytes], { type: file.mediaType || "application/octet-stream" });
    const form = new FormData();
    form.append(file.field || "file", blob, file.filename || "upload.bin");
    return { headers: {}, body: form };
  }
  return {
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

export async function jaicpFetch({
  host,
  token,
  method,
  path: reqPath,
  queryPairs = [],
  body,
  headers: extraHeaders,
  skipAuth = false,
  contentType = "application/json",
  timeoutMs = 120_000,
  maxBytes = 2_000_000,
  fetchImpl = fetch,
}) {
  if (!skipAuth && !token) {
    throw new Error("Missing API token for this call");
  }
  if (typeof reqPath === "string" && /^https?:\/\//i.test(reqPath)) {
    throw new Error("Absolute URLs are not allowed");
  }
  const url = new URL(`${host}${reqPath}`);
  for (const [k, v] of queryPairs) {
    url.searchParams.append(k, v);
  }

  const headers = {
    Accept: "application/json, application/octet-stream, */*",
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

  const encoded = encodeBody(contentType, body);
  Object.assign(headers, encoded.headers);
  const init = {
    method: method.toUpperCase(),
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (encoded.body !== undefined && init.method !== "GET" && init.method !== "HEAD") {
    init.body = encoded.body;
  }

  const res = await fetchImpl(url, init);
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`Unexpected redirect ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > maxBytes) {
    throw new Error(`Response too large: ${buf.byteLength} bytes`);
  }
  const mediaType = (res.headers.get("content-type") || "").split(";")[0].trim();
  const redacted = redactUrl(`${url.origin}${url.pathname}`);
  const ok = typeof res.ok === "boolean" ? res.ok : res.status >= 200 && res.status < 300;
  if (mediaType === "application/octet-stream" || mediaType === "application/zip") {
    return {
      ok,
      status: res.status,
      url: redacted,
      binary: true,
      mediaType,
      byteLength: buf.byteLength,
      data: Buffer.from(buf).toString("base64"),
    };
  }
  const text = new TextDecoder().decode(buf);
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return {
    ok,
    status: res.status,
    url: redacted,
    binary: false,
    mediaType,
    data: parsed,
  };
}

export function formatResult(result, maxChars = DEFAULT_MAX_CHARS) {
  if (result.binary) {
    const text = JSON.stringify(
      {
        ok: result.ok,
        status: result.status,
        url: redactUrl(result.url),
        mediaType: result.mediaType,
        byteLength: result.byteLength,
        data: "[binary base64 in attached blob]",
      },
      null,
      2,
    );
    return {
      text,
      blob: {
        uri: `jaicp://binary${result.url}`,
        mimeType: result.mediaType || "application/octet-stream",
        data: result.data,
      },
    };
  }
  const payload = {
    ok: result.ok,
    status: result.status,
    url: redactUrl(result.url),
    data: redactSecrets(result.data),
  };
  let text = JSON.stringify(payload, null, 2);
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n… truncated, ${text.length} chars total`;
  }
  return text;
}
