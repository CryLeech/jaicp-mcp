import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_HOST = "https://app.jaicp.com";

function parseEnvFile(filePath) {
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

export function loadConfig() {
  const override = process.env.JAICP_ENV;
  const file = firstExisting([
    override,
    path.join(os.homedir(), ".cursor", "secrets", "jaicp.env"),
    path.join(process.cwd(), ".env"),
  ]);
  const fileEnv = file ? parseEnvFile(file) : {};
  const get = (key, fallback = "") =>
    process.env[key] || fileEnv[key] || fallback;

  const host = get("JAICP_HOST", DEFAULT_HOST).replace(/\/+$/, "");

  let envSource = null;
  if (file) {
    if (override && file === override) {
      envSource = "JAICP_ENV";
    } else if (file === path.join(os.homedir(), ".cursor", "secrets", "jaicp.env")) {
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
  };
}
