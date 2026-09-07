import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadConfig, parseEnvFile, parseHost } from "../src/env.mjs";

test("parseEnvFile skips comments and quotes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jaicp-env-"));
  const file = path.join(dir, ".env");
  fs.writeFileSync(file, "A=1\n# B=2\nC=\"three\"\n");
  assert.deepEqual(parseEnvFile(file), { A: "1", C: "three" });
});

test("parseHost rejects userinfo and requires https", () => {
  assert.equal(parseHost("https://app.jaicp.com/"), "https://app.jaicp.com");
  assert.throws(() => parseHost("https://user:pass@app.jaicp.com"), /credentials/);
  assert.throws(() => parseHost("not-a-url"), /Invalid JAICP_HOST/);
  assert.throws(() => parseHost("http://evil.example"), /must use https/);
  assert.equal(parseHost("http://localhost:9860"), "http://localhost:9860");
  assert.equal(parseHost("http://evil.example", { allowInsecure: true }), "http://evil.example");
});

test("loadConfig reads isolated files and ignores real homedir secrets", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jaicp-cfg-"));
  fs.writeFileSync(path.join(dir, ".env"), "JAICP_HOST=https://platform.tovie.ai\nJAICP_READ_ONLY=true\n");
  const cfg = loadConfig({ env: {}, cwd: dir, homedir: dir });
  assert.equal(cfg.host, "https://platform.tovie.ai");
  assert.equal(cfg.readOnly, true);
  assert.equal(cfg.envSource, ".env");
  assert.equal(cfg.timeoutMs, 120_000);
});
