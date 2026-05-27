import * as childProcess from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  requireEnvironmentVariable,
  writeEnvironmentVariable,
} from "./write-workflow-state.mjs";

const assetName = requireEnvironmentVariable("RELEASE_ASSET");
const expectedDigest = requireEnvironmentVariable("RELEASE_DIGEST");
const executableName = requireEnvironmentVariable("RELEASE_EXECUTABLE");
const releaseRepository = requireEnvironmentVariable("RELEASE_REPOSITORY");
const releaseTag = requireEnvironmentVariable("RELEASE_TAG");
const runnerTemp = requireEnvironmentVariable("RUNNER_TEMP");
const executableEnvironmentVariable =
  process.env.RELEASE_EXECUTABLE_ENVIRONMENT_VARIABLE?.trim() ||
  "ALEXANDRITE_PATH";
requireEnvironmentVariable("GH_TOKEN");

const downloadDirectory = path.join(runnerTemp, "release-asset-download");
const extractDirectory = path.join(runnerTemp, "release-asset");
const downloadPath = path.join(downloadDirectory, assetName);

fs.rmSync(downloadDirectory, { force: true, recursive: true });
fs.rmSync(extractDirectory, { force: true, recursive: true });
fs.mkdirSync(downloadDirectory, { recursive: true });
fs.mkdirSync(extractDirectory, { recursive: true });

downloadAsset();
verifyDigest(downloadPath, expectedDigest);
extractAsset(downloadPath, extractDirectory);

const executablePath = findExecutable(extractDirectory, executableName);
if (!executablePath) {
  throw new Error(`Could not find ${executableName} in ${assetName}.`);
}

fs.chmodSync(executablePath, 0o755);
writeEnvironmentVariable(executableEnvironmentVariable, executablePath);

console.log(`Installed ${releaseRepository} ${releaseTag} from ${assetName}.`);

function downloadAsset() {
  run("gh", [
    "release",
    "download",
    releaseTag,
    "--repo",
    releaseRepository,
    "--pattern",
    assetName,
    "--dir",
    downloadDirectory,
    "--clobber",
  ]);

  if (!fs.existsSync(downloadPath)) {
    throw new Error(`Expected gh to download ${assetName} to ${downloadPath}.`);
  }
}

function verifyDigest(filePath, expectedSha256) {
  const actualDigest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");

  if (actualDigest !== expectedSha256) {
    throw new Error(
      `Digest mismatch for ${filePath}: expected ${expectedSha256}, got ${actualDigest}.`,
    );
  }
}

function extractAsset(filePath, outputDirectory) {
  if (filePath.endsWith(".zip")) {
    if (process.platform === "win32") {
      run("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-Command",
        "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1]",
        filePath,
        outputDirectory,
      ]);
    } else {
      run("unzip", ["-q", filePath, "-d", outputDirectory]);
    }
    return;
  }

  if (filePath.endsWith(".tar.gz")) {
    run("tar", ["-xzf", filePath, "-C", outputDirectory]);
    return;
  }

  throw new Error(`Unsupported Alexandrite asset: ${filePath}.`);
}

function run(command, args) {
  const result = childProcess.spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`);
  }
}

function findExecutable(directory, name) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const result = findExecutable(entryPath, name);
      if (result) {
        return result;
      }
    }

    if (entry.isFile() && entry.name === name) {
      return entryPath;
    }
  }

  return undefined;
}
