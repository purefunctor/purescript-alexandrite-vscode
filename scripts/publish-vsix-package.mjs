import { $ } from "bun";
import * as fs from "node:fs";
import * as path from "node:path";

import { verifyReleaseAssets } from "./manage-release-assets.mjs";
import { requireEnvironmentVariable } from "./write-workflow-state.mjs";

requireEnvironmentVariable("VSCE_PAT");

const { vsixPath } = verifyReleaseAssets();
const vscePath = path.join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vsce.cmd" : "vsce",
);

if (!fs.existsSync(vscePath)) {
  throw new Error(`Could not find publishing tool: ${vscePath}.`);
}

await $`${vscePath} publish --packagePath ${vsixPath}`;
