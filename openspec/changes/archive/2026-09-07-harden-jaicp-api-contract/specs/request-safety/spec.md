## Purpose

Определяет безопасное построение и выполнение HTTP-вызовов.

## ADDED Requirements

### Requirement: Mutation classification uses operation metadata
The server SHALL decide whether a call is mutating from the OpenAPI operation (HTTP method, `x-security-authority`, and an explicit override list), not from an unnormalized URL substring.

#### Scenario: Reporter filter POST is read
- **WHEN** `getSessionDataByFilter` is called without `confirm`
- **THEN** the request is allowed as a read

#### Scenario: Dialer addPhone GET is write
- **WHEN** `addPhoneGet` is called without `confirm`
- **THEN** the tool returns `write_not_confirmed` and does not fetch

#### Scenario: Authority READ wins for POST
- **WHEN** an operation has `x-security-authority` ending in `_READ`
- **THEN** the call is treated as read unless an explicit write override applies

### Requirement: Path parameters cannot escape the template
The server SHALL reject path parameter values that contain `/`, `\`, `.` or `..` as a segment, encoded dot-segments, or control characters.

#### Scenario: Dot-segment is rejected
- **WHEN** a path parameter is `..` or `%2e%2e`
- **THEN** the tool returns a local validation error

### Requirement: Read-only mode blocks mutations
When `JAICP_READ_ONLY` is true, the server SHALL refuse mutating calls even if `confirm` is true.

#### Scenario: Confirm cannot override read-only
- **WHEN** `JAICP_READ_ONLY=true` and a write operation is called with `confirm=true`
- **THEN** the tool returns a read-only error and does not fetch

### Requirement: Host, timeout, redirects, and size are bounded
The server SHALL accept only an `http:` or `https:` host without userinfo, require HTTPS except for localhost or an explicit insecure override, abort hung fetches, refuse automatic cross-origin redirects, and truncate oversized responses.

#### Scenario: Userinfo host is rejected
- **WHEN** `JAICP_HOST` contains userinfo
- **THEN** configuration loading fails

#### Scenario: Redirect is not followed
- **WHEN** the HTTP response is 3xx
- **THEN** the tool returns an error and does not send the Authorization header to another origin

### Requirement: Secrets are redacted in tool output
The server SHALL redact token-like object keys, Bearer credentials, Telegram bot tokens, and secret path/query segments. It SHALL NOT claim that all personal data is removed.

#### Scenario: api_key is redacted
- **WHEN** a JSON field named `api_key` is a non-empty string
- **THEN** the tool output replaces the value with a redacted marker
