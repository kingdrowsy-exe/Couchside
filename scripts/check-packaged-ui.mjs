import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export function packagedIndex(files) {
  return (
    files.find((file) => {
      const name = file.replaceAll("\\", "/");
      return name === "/web/dist/index.html" || name.endsWith("/web/dist/index.html");
    }) ?? null
  );
}

export function asarIn(root) {
  if (root.endsWith(".asar")) return root;
  const nested = path.join(root, "resources", "app.asar");
  return existsSync(nested) ? nested : null;
}

function main() {
  const root = process.argv[2];
  if (!root) {
    console.error("usage: node scripts/check-packaged-ui.mjs <unpacked-dir-or-asar>");
    process.exit(1);
  }
  const asarPath = asarIn(path.resolve(root));
  if (!asarPath || !existsSync(asarPath)) {
    console.error(`No app.asar under ${root}`);
    process.exit(1);
  }
  const asar = require("@electron/asar");
  const index = packagedIndex(asar.listPackage(asarPath));
  if (!index) {
    console.error(`Packaged app ${asarPath} has no web/dist/index.html`);
    process.exit(1);
  }
  console.log(index);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
