import { $ } from "bun";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { requireEnvironmentVariable } from "./write-workflow-state.mjs";

const releaseDirectory = process.env.RELEASE_DIRECTORY?.trim() || "release";

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const command = process.argv[2];
  if (command === "prepare") {
    prepareReleaseAssets();
  } else if (command === "verify") {
    verifyReleaseAssets();
  } else if (command === "download") {
    await downloadReleaseAssets();
  } else if (command === "upload") {
    await uploadReleaseAssets();
  } else {
    throw new Error(
      "Usage: bun scripts/manage-release-assets.mjs prepare|verify|download|upload",
    );
  }
}

export function prepareReleaseAssets() {
  const vsixFiles = fs
    .readdirSync(".", { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".vsix"))
    .map((entry) => entry.name);

  if (vsixFiles.length !== 1) {
    throw new Error(
      `Expected exactly one VSIX package, found ${vsixFiles.length}.`,
    );
  }

  fs.mkdirSync(releaseDirectory, { recursive: true });

  const vsixName = vsixFiles[0];
  const releaseVsixPath = path.join(releaseDirectory, vsixName);
  fs.renameSync(vsixName, releaseVsixPath);

  const digest = sha256File(releaseVsixPath);
  fs.writeFileSync(`${releaseVsixPath}.sha256`, `${digest}  ${vsixName}\n`);
  console.log(`Prepared ${releaseVsixPath}.`);
}

export function verifyReleaseAssets() {
  const vsixPath = findSingleFile(releaseDirectory, ".vsix");
  const checksumPath = findSingleFile(releaseDirectory, ".sha256");
  const expectedDigest = readExpectedDigest(checksumPath);
  const actualDigest = sha256File(vsixPath);

  if (actualDigest !== expectedDigest) {
    throw new Error(
      `Digest mismatch for ${vsixPath}: expected ${expectedDigest}, got ${actualDigest}.`,
    );
  }

  console.log(`Verified ${vsixPath}.`);
  return {
    checksumPath,
    digest: actualDigest,
    vsixName: path.basename(vsixPath),
    vsixPath,
  };
}

export async function uploadReleaseAssets() {
  const releaseTag = requireEnvironmentVariable("RELEASE_TAG");
  requireEnvironmentVariable("GH_REPO");
  requireEnvironmentVariable("GH_TOKEN");

  const { checksumPath, vsixPath } = verifyReleaseAssets();
  await $`gh release upload ${releaseTag} ${vsixPath} ${checksumPath} --clobber`;
}

export async function downloadReleaseAssets() {
  const releaseTag = requireEnvironmentVariable("RELEASE_TAG");
  requireEnvironmentVariable("GH_REPO");
  requireEnvironmentVariable("GH_TOKEN");

  fs.rmSync(releaseDirectory, { force: true, recursive: true });
  fs.mkdirSync(releaseDirectory, { recursive: true });

  const vsixPattern = "*.vsix";
  const checksumPattern = "*.sha256";
  await $`gh release download ${releaseTag} --pattern ${vsixPattern} --pattern ${checksumPattern} --dir ${releaseDirectory} --clobber`;
}

function findSingleFile(directory, extension) {
  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(directory, entry.name));

  if (files.length !== 1) {
    throw new Error(`Expected exactly one ${extension} file in ${directory}.`);
  }

  return files[0];
}

function readExpectedDigest(checksumPath) {
  const checksum = fs.readFileSync(checksumPath, "utf8").trim();
  const match = /^([0-9a-fA-F]{64})\s+/.exec(checksum);
  if (!match) {
    throw new Error(`Invalid SHA-256 checksum file: ${checksumPath}.`);
  }

  return match[1].toLowerCase();
}

function sha256File(filePath) {
  return new Bun.CryptoHasher("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}
