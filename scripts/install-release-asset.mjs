import { $, Glob } from "bun";
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

await downloadAsset();
await verifyDigest(downloadPath, expectedDigest);
await extractAsset(downloadPath, extractDirectory);

const executablePath = await findExecutable(extractDirectory, executableName);
if (!executablePath) {
  throw new Error(`Could not find ${executableName} in ${assetName}.`);
}

fs.chmodSync(executablePath, 0o755);
writeEnvironmentVariable(executableEnvironmentVariable, executablePath);

console.log(`Installed ${releaseRepository} ${releaseTag} from ${assetName}.`);

async function downloadAsset() {
  await $`gh release download ${releaseTag} --repo ${releaseRepository} --pattern ${assetName} --dir ${downloadDirectory} --clobber`;

  if (!fs.existsSync(downloadPath)) {
    throw new Error(`Expected gh to download ${assetName} to ${downloadPath}.`);
  }
}

async function verifyDigest(filePath, expectedSha256) {
  const actualDigest = await sha256File(filePath);

  if (actualDigest !== expectedSha256) {
    throw new Error(
      `Digest mismatch for ${filePath}: expected ${expectedSha256}, got ${actualDigest}.`,
    );
  }
}

async function extractAsset(filePath, outputDirectory) {
  if (filePath.endsWith(".zip")) {
    await extractZipAsset(filePath, outputDirectory);
    return;
  }

  if (filePath.endsWith(".tar.gz")) {
    await extractTarGzipAsset(filePath, outputDirectory);
    return;
  }

  throw new Error(`Unsupported Alexandrite asset: ${filePath}.`);
}

async function extractZipAsset(filePath, outputDirectory) {
  if (process.platform === "win32") {
    const expandArchiveCommand =
      "$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath $env:ALEXANDRITE_ARCHIVE_PATH -DestinationPath $env:ALEXANDRITE_EXTRACT_DIRECTORY";
    await $`powershell.exe -NoLogo -NoProfile -Command ${expandArchiveCommand}`.env(
      {
        ...process.env,
        ALEXANDRITE_ARCHIVE_PATH: filePath,
        ALEXANDRITE_EXTRACT_DIRECTORY: outputDirectory,
      },
    );
  } else {
    await $`unzip -q ${filePath} -d ${outputDirectory}`;
  }
}

async function extractTarGzipAsset(filePath, outputDirectory) {
  const archive = new Bun.Archive(await Bun.file(filePath).bytes());
  await archive.extract(outputDirectory);
}

async function findExecutable(directory, name) {
  const glob = new Glob("**/*");
  for await (const filePath of glob.scan({ cwd: directory, onlyFiles: true })) {
    if (path.basename(filePath) === name) {
      return path.join(directory, filePath);
    }
  }

  return undefined;
}

async function sha256File(filePath) {
  return new Bun.CryptoHasher("sha256")
    .update(await Bun.file(filePath).bytes())
    .digest("hex");
}
