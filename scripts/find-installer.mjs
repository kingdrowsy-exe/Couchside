import { readdirSync } from "node:fs";

const files = readdirSync("release").filter((name) => name.startsWith("Couchside-Setup-") && name.endsWith(".exe"));
if (files.length !== 1) {
  console.error(`Expected one Couchside-Setup exe in release/, found ${files.length}: ${files.join(", ")}`);
  process.exit(1);
}
process.stdout.write(`release/${files[0]}`);
