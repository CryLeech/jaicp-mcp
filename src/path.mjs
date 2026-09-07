const CONTROL_RE = /[\u0000-\u001f\u007f]/;
const ENCODED_UNSAFE_RE = /%2f|%5c|%00|%2e%2e/i;

export function assertSafePathValue(name, value) {
  const raw = String(value);
  if (raw === "" || raw === "." || raw === "..") {
    throw new Error(`Unsafe path param "${name}"`);
  }
  if (CONTROL_RE.test(raw) || /[\\/]/.test(raw) || ENCODED_UNSAFE_RE.test(raw)) {
    throw new Error(`Unsafe path param "${name}"`);
  }
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  if (decoded === "." || decoded === ".." || CONTROL_RE.test(decoded) || /[\\/]/.test(decoded)) {
    throw new Error(`Unsafe path param "${name}"`);
  }
}

export function fillPath(template, values) {
  const missing = [];
  const filled = template.replace(/\{([^}]+)\}/g, (_, name) => {
    const value = values[name];
    if (value === undefined || value === null || value === "") {
      missing.push(name);
      return `{${name}}`;
    }
    assertSafePathValue(name, value);
    return encodeURIComponent(String(value));
  });
  if (missing.length) {
    throw new Error(`Missing path params: ${missing.join(", ")}`);
  }
  return filled;
}
