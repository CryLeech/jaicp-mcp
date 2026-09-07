<div align="center">

# jaicp-mcp

**An MCP server that connects AI agents to JAICP and Tovie Platform**

[![Release](https://img.shields.io/github/v/release/CryLeech/jaicp-mcp?display_name=tag)](https://github.com/CryLeech/jaicp-mcp/releases)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-5A67D8)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Русский](README.md) · [English](README.en.md)

</div>

`jaicp-mcp` gives Cursor, Claude Code, Codex CLI, and other MCP clients access to the HTTP APIs of [JAICP](https://help.cloud.just-ai.com/jaicp/api/) and [Tovie Platform](https://help.cloud.tovie.ai/platform/api/).

The server builds requests from the official OpenAPI documents, validates parameters before making network calls, and protects mutating operations. The shared contract exposes 160 operations for both clouds.

> [!IMPORTANT]
> This is an unofficial project. It is not a Just AI or Tovie AI product.

## Features

- seven APIs: projects, bot channels, analytics, asynchronous reports, text campaigns, CAILA, and Dialer;
- automatic required/default parameter handling from OpenAPI;
- JSON, form-urlencoded, base64 multipart files, and binary responses;
- mutation protection through `confirm` and the global `JAICP_READ_ONLY` mode;
- request timeouts, no redirects, response size limits, and common secret redaction;
- one contract for JAICP and Tovie Platform — only the host and tokens change;
- offline tests with no calls to real APIs.

## Quick start

### 1. Install the server

Git and Node.js 20 or later are required.

```bash
git clone https://github.com/CryLeech/jaicp-mcp.git
cd jaicp-mcp
npm ci
cp .env.example .env
```

In PowerShell, use:

```powershell
Copy-Item .env.example .env
```

### 2. Add a token

Open `.env` and provide at least a unified token from the JAICP/Tovie API access settings:

```dotenv
JAICP_HOST=https://app.jaicp.com
JAICP_UNIFIED_TOKEN=your-unified-token
JAICP_PROJECT_SHORT_NAME=your-project-short-name
```

For Tovie Platform, set `JAICP_HOST=https://platform.tovie.ai` and use a token issued by that cloud.

> [!CAUTION]
> Never commit `.env` or place tokens in the MCP client configuration.

### 3. Connect an MCP client

Add the server to `~/.cursor/mcp.json` or `.cursor/mcp.json`, replacing the path with an absolute one:

```json
{
  "mcpServers": {
    "jaicp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/jaicp-mcp/src/server.mjs"]
    }
  }
}
```

After Cursor restarts, the server provides three tools: `jaicp_specs`, `jaicp_operations`, and `jaicp_call`.

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add --transport stdio jaicp -- node /absolute/path/to/jaicp-mcp/src/server.mjs
```

See [Claude Code MCP](https://code.claude.com/docs/en/mcp).

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

```toml
[mcp_servers.jaicp]
command = "node"
args = ["/absolute/path/to/jaicp-mcp/src/server.mjs"]
cwd = "/absolute/path/to/jaicp-mcp"
```

See [Codex MCP](https://developers.openai.com/codex/mcp/).

</details>

## Example prompts

Once connected, you can use natural language:

- "List my JAICP projects."
- "Find operations that return session statistics."
- "Show text campaigns for project `my-project`."
- "Export CAILA intents."

Before each call, the server resolves the exact OpenAPI operation, validates required parameters, and determines whether it changes data.

## Tools

### `jaicp_specs`

Shows the configured APIs, host, server version, and whether the required tokens are present. Token values are never returned.

### `jaicp_operations`

Searches one spec by `operationId`, path, tag, or description. Returns required/default parameters, body and response formats, and mutation status.

### `jaicp_call`

Calls an operation by `spec` + `operationId`. When an `operationId` is duplicated, pass the exact OpenAPI `path` to disambiguate it.

```json
{
  "spec": "project",
  "operationId": "getByProjectShortName",
  "pathParams": {
    "projectShortName": "my-project"
  }
}
```

## Supported APIs

- `bot-channel` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/bot-channel-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/bot-channel-api.html)
- `project` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/project-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/project-api.html)
- `reporter` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/reporter-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/reporter-api.html)
- `async` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/async-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/async-api.html)
- `text-campaign` — [JAICP](https://app.jaicp.com/api/api-gateway/static/specs/text-campaign-api.html) · [Tovie](https://platform.tovie.ai/api/api-gateway/static/specs/text-campaign-api.html)
- `caila` — [JAICP](https://app.jaicp.com/cailapub/static/openapi/direct-api-en.html) · [Tovie](https://platform.tovie.ai/cailapub/static/openapi/direct-api-en.html)
- `calls` — [JAICP](https://app.jaicp.com/dialer/static/openapi/index.html) · [Tovie](https://platform.tovie.ai/dialer/static/openapi/index.html)

Vendored YAML files live in `vendor/specs/`. `npm run check-specs` compares them with both clouds.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `JAICP_HOST` | JAICP or Tovie Platform host | `https://app.jaicp.com` |
| `JAICP_UNIFIED_TOKEN` | Projects, channels, reporter, and text campaigns | — |
| `JAICP_PROJECT_SHORT_NAME` | Project for path/query when omitted from a call | — |
| `JAICP_NLP_TOKEN` | CAILA / NLP Direct | — |
| `JAICP_CALLS_TOKEN` | Dialer | — |
| `JAICP_READ_ONLY` | Block every mutation | `false` |
| `JAICP_FETCH_TIMEOUT_MS` | HTTP request timeout | `120000` |
| `JAICP_MAX_RESPONSE_BYTES` | Maximum response size | `2000000` |
| `JAICP_ENV` | Path to a different env file | — |

The server looks for configuration in `~/.cursor/secrets/jaicp.env`, then in the project `.env`. Explicit environment variables take precedence.

`JAICP_PROJECT_SHORT_NAME` fills both query and `{projectShortName}` path parameters.

## Security

> [!WARNING]
> `confirm: true` only prevents accidental calls because the same AI model supplies the flag. Use `JAICP_READ_ONLY=true` when mutations must be impossible.

- mutations are classified from the HTTP method and `x-security-authority`;
- Dialer `addPhone*` is treated as a mutation even when it uses GET;
- path parameters containing `/`, `\`, dot-segments, or control characters are rejected;
- automatic HTTP redirects are disabled;
- multipart accepts base64 but cannot read arbitrary local paths;
- common tokens are redacted, but personal data is not guaranteed to be removed;
- reporter exports may contain personal data.

Plain HTTP is allowed only for localhost. `JAICP_ALLOW_INSECURE_HOST=1` is available as an explicit development override.

## Data formats

- JSON is used by default;
- `application/x-www-form-urlencoded` is supported for Dialer;
- `multipart/form-data` accepts `{ filename, mediaType, data }`, where `data` is base64;
- JSON and text responses are returned as MCP text;
- `application/octet-stream` is returned as an MCP embedded resource.

## Development

```bash
npm test
npm run check
npm run check-specs
openspec validate --all --strict --no-interactive
```

Changes are designed with [OpenSpec](https://github.com/Fission-AI/OpenSpec). Active changes live in `openspec/changes/`.

## License

Source code is available under the [MIT License](LICENSE). JAICP and related marks belong to Just AI; Tovie AI Platform and related marks belong to Tovie AI. See [NOTICE.md](NOTICE.md).
