# Changelog

[Русский](CHANGELOG.md) · [English](CHANGELOG.en.md)

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-09-07

### Added

- Three stdio tools: `jaicp_specs`, `jaicp_operations`, `jaicp_call`
- Seven official OpenAPI specs: bot-channel, project, reporter, async, text-campaign, CAILA, Dialer
- JAICP and Tovie Platform support via `JAICP_HOST`
- Mutation guard from operation metadata, `confirm`, and `JAICP_READ_ONLY`
- Required/default checks and `path` disambiguation for duplicate `operationId`s
- JSON, form-urlencoded, base64 multipart, and binary responses
- Timeouts, no automatic redirects, size limits, host and path validation
- Offline tests (`npm test`) and YAML drift check (`npm run check-specs`)

### Security

- Typical secrets are redacted in tool output
- Path parameters cannot contain `..` or segment separators

[Unreleased]: https://github.com/CryLeech/jaicp-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/CryLeech/jaicp-mcp/releases/tag/v0.1.0
