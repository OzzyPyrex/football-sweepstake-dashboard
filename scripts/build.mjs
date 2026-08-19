import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(root, "dist");
const outputRelativeToRoot = path.relative(root, output);

if (outputRelativeToRoot !== "dist" || path.isAbsolute(outputRelativeToRoot)) {
  throw new Error("Refusing to clean an unexpected build directory.");
}

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "docs"), { recursive: true });

for (const file of ["app.js", "index.html", "scoring.js", "styles.css"]) {
  await cp(path.join(root, file), path.join(output, file));
}

await cp(path.join(root, "data"), path.join(output, "data"), { recursive: true });
await cp(
  path.join(root, "docs", "dashboard-preview.svg"),
  path.join(output, "docs", "dashboard-preview.svg")
);

console.log("Created safe deployment bundle in dist/.");
