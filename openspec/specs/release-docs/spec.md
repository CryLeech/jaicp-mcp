# Release Documentation Specification

## Purpose

Определяет публичные документы и версию первого релиза.

## Requirements

### Requirement: Version comes from package metadata
The MCP server version SHALL be `0.1.0` and SHALL be read from `package.json` at runtime.

#### Scenario: Specs tool reports package version
- **WHEN** a client calls `jaicp_specs`
- **THEN** the payload `version` equals the `version` field in `package.json`

### Requirement: Documentation is Russian-first
User-facing docs SHALL exist in Russian first and English second. `README.md` and `CHANGELOG.md` are canonical Russian files. `README.en.md` and `CHANGELOG.en.md` are English mirrors. `NOTICE.md` is bilingual with Russian first. `LICENSE` remains English MIT text.

#### Scenario: Language switchers exist
- **WHEN** a reader opens `README.md`
- **THEN** the file links to `README.en.md`, and the English file links back

### Requirement: JAICP and Tovie share the documented contract
Docs SHALL state that the vendored OpenAPI copies match both `app.jaicp.com` and `platform.tovie.ai`, and that Tovie is used by setting `JAICP_HOST=https://platform.tovie.ai` with Tovie-issued tokens.

#### Scenario: Host examples cover both clouds
- **WHEN** a reader follows the install section
- **THEN** both JAICP and Tovie host examples are present and trademarks are attributed separately
