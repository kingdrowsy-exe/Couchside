import assert from "node:assert/strict";
import test from "node:test";
import { packagedIndex } from "./check-packaged-ui.mjs";

test("the packaged app is missing its UI when web/dist/index.html is absent", () => {
  assert.equal(packagedIndex(["/electron/main.js", "/server/dist/index.js", "/node_modules/pino/index.html"]), null);
  assert.equal(packagedIndex(["/web/dist/index.html"]), "/web/dist/index.html");
  assert.equal(packagedIndex(["\\web\\dist\\index.html"]), "\\web\\dist\\index.html");
});
