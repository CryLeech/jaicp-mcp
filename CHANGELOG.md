# Changelog

## 0.1.0 — first public test

Spec-driven MCP for JAICP. Three tools, seven official OpenAPI specs, write-guard, secret redaction.

### Specs

- Bot channel, Project, Reporter, Async, Text campaign (`app.jaicp.com/api/api-gateway/static/specs/`)
- CAILA Direct (`/cailapub/static/openapi/`)
- Dialer / Calls (`/dialer/static/openapi/`)

### Tools

- `jaicp_specs`
- `jaicp_operations`
- `jaicp_call` (`confirm=true` required for mutating calls)

### Auth

Unified Bearer token for gateway APIs. Separate path tokens for CAILA and Dialer.

### Safety

- Mutating HTTP (and Dialer `addPhone` GET) blocked unless `confirm=true`
- Tokens in URLs and fields like `accessToken` are redacted in tool output
