import * as childProcess from "node:child_process";
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

const result = childProcess.spawnSync(
  vscePath,
  ["publish", "--packagePath", vsixPath],
  {
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`vsce publish exited with status ${result.status}.`);
}
