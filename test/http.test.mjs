import assert from "node:assert/strict";
import { test } from "node:test";
import { formatResult, jaicpFetch, redactSecrets, redactUrl, redactedError } from "../src/http.mjs";

test("redacts api_key, Bearer, telegram and campaign tokens", () => {
  const redacted = redactSecrets({
    api_key: "should-redact",
    accessToken: "abc",
    note: "Bearer sk-secret and 123456:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    nested: { password: "x" },
  });
  assert.equal(redacted.api_key, "[redacted 13 chars]");
  assert.equal(redacted.accessToken, "[redacted 3 chars]");
  assert.match(redacted.note, /Bearer \[redacted\]/);
  assert.match(redacted.note, /\[telegram-token\]/);
  assert.equal(redacted.nested.password, "[redacted 1 chars]");
});

test("redactUrl strips secret query and path tokens", () => {
  assert.match(
    redactUrl("https://app.jaicp.com/cailapub/api/caila/p/SECRET/export?token=abc"),
    /\/p\/\[token\]/,
  );
  assert.match(redactUrl("https://x/api/calls/campaign/SECRET/status"), /campaign\/\[token\]/);
});

test("redactedError hides Bearer", () => {
  assert.match(redactedError(new Error("Authorization Bearer abc.def")), /Bearer \[redacted\]/);
});

test("jaicpFetch encodes form body and refuses absolute URLs", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      arrayBuffer: async () => new TextEncoder().encode('{"ok":true}'),
    };
  };
  const result = await jaicpFetch({
    host: "https://app.jaicp.com",
    skipAuth: true,
    method: "POST",
    path: "/api/crmCalls/campaign/t/addPhone",
    contentType: "application/x-www-form-urlencoded",
    body: { phone: "999" },
    fetchImpl,
  });
  assert.equal(result.ok, true);
  assert.equal(calls[0].init.body.toString(), "phone=999");
  await assert.rejects(
    () => jaicpFetch({ host: "https://app.jaicp.com", skipAuth: true, method: "GET", path: "https://evil", fetchImpl }),
    /Absolute URLs/,
  );
});

test("jaicpFetch does not follow redirects and rejects oversized bodies", async () => {
  await assert.rejects(
    () =>
      jaicpFetch({
        host: "https://app.jaicp.com",
        skipAuth: true,
        method: "GET",
        path: "/x",
        fetchImpl: async () => ({
          status: 302,
          headers: new Headers({ location: "https://evil" }),
          arrayBuffer: async () => new Uint8Array(),
        }),
      }),
    /Unexpected redirect 302/,
  );
  await assert.rejects(
    () =>
      jaicpFetch({
        host: "https://app.jaicp.com",
        skipAuth: true,
        method: "GET",
        path: "/x",
        maxBytes: 4,
        fetchImpl: async () => ({
          status: 200,
          headers: new Headers({ "content-type": "text/plain" }),
          arrayBuffer: async () => new TextEncoder().encode("12345"),
        }),
      }),
    /too large/,
  );
});

test("binary responses stay base64 blobs", () => {
  const formatted = formatResult({
    ok: true,
    status: 200,
    url: "https://app.jaicp.com/export",
    binary: true,
    mediaType: "application/octet-stream",
    byteLength: 3,
    data: Buffer.from("abc").toString("base64"),
  });
  assert.match(formatted.text, /byteLength/);
  assert.equal(formatted.blob.mimeType, "application/octet-stream");
  assert.equal(formatted.blob.data, Buffer.from("abc").toString("base64"));
});

test("multipart rejects local paths", async () => {
  await assert.rejects(
    () =>
      jaicpFetch({
        host: "https://app.jaicp.com",
        skipAuth: true,
        method: "POST",
        path: "/upload",
        contentType: "multipart/form-data",
        body: { path: "C:\\\\secrets.csv", data: "Zg==" },
        fetchImpl: async () => {
          throw new Error("should not fetch");
        },
      }),
    /Local file paths/,
  );
});
