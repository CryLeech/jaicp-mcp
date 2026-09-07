# API Contract Specification

## Purpose

Определяет, как MCP читает vendored OpenAPI и строит вызов JAICP/Tovie.

## Requirements

### Requirement: Spec inventory is complete
The server SHALL load all seven specs from `vendor/specs/` and expose each operation through `jaicp_operations`.

#### Scenario: All operations are indexed
- **WHEN** `loadAllSpecs()` runs against the vendored YAML
- **THEN** every HTTP operation from the seven specs is present and `$ref` files resolve only inside `vendor/specs/`

### Requirement: Operation lookup is unambiguous
The server SHALL select an operation by `spec` + `operationId` when that pair is unique, and SHALL accept an exact OpenAPI `path` when the `operationId` is duplicated.

#### Scenario: Unique operationId
- **WHEN** a client calls `jaicp_call` with a unique `operationId`
- **THEN** the matching operation is used without requiring `path`

#### Scenario: Duplicate operationId needs path
- **WHEN** a client calls `getTextCampaign` or `updateTextCampaign` without `path`
- **THEN** the server returns an error that lists both paths

#### Scenario: Duplicate operationId with path
- **WHEN** a client calls a duplicated `operationId` with the exact OpenAPI path
- **THEN** that path is used

### Requirement: Required values and defaults are applied before HTTP
The server SHALL reject missing required path, query, header, or body values before making a network request, inject `JAICP_PROJECT_SHORT_NAME` into both query and `{projectShortName}` path params, and apply OpenAPI parameter defaults when the client omitted a value.

#### Scenario: Missing required query
- **WHEN** a call omits a required query parameter
- **THEN** the tool returns a local error and does not fetch

#### Scenario: Default project fills path
- **WHEN** `JAICP_PROJECT_SHORT_NAME` is set and the operation has `{projectShortName}`
- **THEN** the path is filled without repeating the value in `pathParams`

### Requirement: Request and response content types follow the spec
The server SHALL send `application/json` by default, `application/x-www-form-urlencoded` when the operation declares it, and multipart form data from an explicit base64 file object. Binary success responses SHALL be returned as an MCP blob rather than decoded as UTF-8 JSON.

#### Scenario: Form-urlencoded Dialer body
- **WHEN** `addPhonePost` is called with a JSON object body
- **THEN** the HTTP request uses `application/x-www-form-urlencoded`

#### Scenario: Multipart without filesystem access
- **WHEN** a CAILA upload operation receives `{ filename, mediaType, data }`
- **THEN** the request is multipart and no local file path is read

#### Scenario: Binary export
- **WHEN** a response `Content-Type` is `application/octet-stream`
- **THEN** the tool result includes a blob with the raw bytes encoded as base64
