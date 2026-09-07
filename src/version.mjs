import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function packageVersion() {
  const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return pkg.version;
}
