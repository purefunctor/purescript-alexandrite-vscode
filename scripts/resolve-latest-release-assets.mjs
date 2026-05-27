import * as childProcess from "node:child_process";

import {
  requireEnvironmentVariable,
  writeOutput,
} from "./write-workflow-state.mjs";

requireEnvironmentVariable("GH_TOKEN");
const releaseRepository = requireEnvironmentVariable("RELEASE_REPOSITORY");

const defaultPlatformAssets = {
  linux: "purescript-alexandrite-x86_64-unknown-linux-gnu.tar.gz",
  macos: "purescript-alexandrite-universal-apple-darwin.tar.gz",
  windows: "purescript-alexandrite-x86_64-pc-windows-msvc.zip",
};
const platformAssets = process.env.RELEASE_PLATFORM_ASSETS
  ? JSON.parse(process.env.RELEASE_PLATFORM_ASSETS)
  : defaultPlatformAssets;

const release = JSON.parse(
  childProcess.execFileSync(
    "gh",
    ["api", `repos/${releaseRepository}/releases/latest`],
    {
      encoding: "utf8",
      env: process.env,
    },
  ),
);

if (release.draft || release.prerelease) {
  throw new Error(
    `Latest Alexandrite release must be a published stable release: ${release.tag_name}.`,
  );
}

const assetName = process.env.RELEASE_ASSET?.trim();
if (assetName) {
  const asset = findAsset(release, assetName);
  writeOutput({
    digest: sha256Digest(asset),
    tag: release.tag_name,
  });
} else {
  const output = { tag: release.tag_name };
  for (const [platform, platformAssetName] of Object.entries(platformAssets)) {
    const asset = findAsset(release, platformAssetName);
    output[`${platform}_asset`] = asset.name;
    output[`${platform}_digest`] = sha256Digest(asset);
  }

  writeOutput(output);
}

function findAsset(release, assetName) {
  const asset = release.assets.find(
    (candidate) => candidate.name === assetName,
  );
  if (!asset) {
    throw new Error(
      `${releaseRepository} ${release.tag_name} does not include ${assetName}.`,
    );
  }

  return asset;
}

function sha256Digest(asset) {
  if (!asset.digest?.startsWith("sha256:")) {
    throw new Error(
      `Release asset ${asset.name} does not include a SHA-256 digest.`,
    );
  }

  return asset.digest.slice("sha256:".length);
}
