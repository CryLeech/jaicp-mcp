import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_HOST = "https://app.jaicp.com";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BYTES = 2_000_000;

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const out = {};
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function firstExisting(paths) {
  return paths.find((p) => p && fs.existsSync(p));
}

function truthy(value) {
  return /^(1|true|yes)$/i.test(String(value || "").trim());
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid numeric config: ${value}`);
  }
  return n;
}

export function parseHost(raw, { allowInsecure = false } = {}) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid JAICP_HOST: ${raw}`);
  }
  if (url.username || url.password) {
    throw new Error("JAICP_HOST must not contain credentials");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("JAICP_HOST must be http or https");
  }
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "http:" && !isLocal && !allowInsecure) {
    throw new Error("JAICP_HOST must use https unless localhost or JAICP_ALLOW_INSECURE_HOST=1");
  }
  return url.origin;
}

export function loadConfig({
  env = process.env,
  cwd = process.cwd(),
  homedir = os.homedir(),
} = {}) {
  const override = env.JAICP_ENV;
  const file = firstExisting([
    override,
    path.join(homedir, ".cursor", "secrets", "jaicp.env"),
    path.join(cwd, ".env"),
  ]);
  const fileEnv = file ? parseEnvFile(file) : {};
  const get = (key, fallback = "") => env[key] || fileEnv[key] || fallback;

  const host = parseHost(get("JAICP_HOST", DEFAULT_HOST), {
    allowInsecure: truthy(get("JAICP_ALLOW_INSECURE_HOST")),
  });

  let envSource = null;
  if (file) {
    if (override && file === override) {
      envSource = "JAICP_ENV";
    } else if (file === path.join(homedir, ".cursor", "secrets", "jaicp.env")) {
      envSource = "~/.cursor/secrets/jaicp.env";
    } else if (path.basename(file) === ".env") {
      envSource = ".env";
    } else {
      envSource = "file";
    }
  }

  return {
    envSource,
    host,
    unifiedToken: get("JAICP_UNIFIED_TOKEN"),
    nlpToken: get("JAICP_NLP_TOKEN"),
    callsToken: get("JAICP_CALLS_TOKEN"),
    defaultProject: get("JAICP_PROJECT_SHORT_NAME"),
    readOnly: truthy(get("JAICP_READ_ONLY")),
    timeoutMs: parseNumber(get("JAICP_FETCH_TIMEOUT_MS"), DEFAULT_TIMEOUT_MS),
    maxBytes: parseNumber(get("JAICP_MAX_RESPONSE_BYTES"), DEFAULT_MAX_BYTES),
  };
}
