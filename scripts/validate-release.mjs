import { $ } from "bun";

import {
  requireEnvironmentVariable,
  writeOutput,
} from "./write-workflow-state.mjs";

const checksWorkflow = process.env.CHECKS_WORKFLOW?.trim() || "checks.yml";
const defaultBranch = requireEnvironmentVariable("DEFAULT_BRANCH");
requireEnvironmentVariable("GH_TOKEN");
const releasePrerelease = requireEnvironmentVariable("RELEASE_PRERELEASE");
const releaseTag = requireEnvironmentVariable("RELEASE_TAG");

if (releasePrerelease === "true") {
  throw new Error("Prerelease publishing is not configured for this workflow.");
}

if (!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(releaseTag)) {
  throw new Error(`Release tag must match vX.Y.Z: ${releaseTag}.`);
}

const packageJson = await Bun.file("package.json").json();
const packageVersion = packageJson.version;
if (releaseTag !== `v${packageVersion}`) {
  throw new Error(
    `Release tag ${releaseTag} does not match package.json version ${packageVersion}.`,
  );
}

const tagCommitOutput =
  await $`git rev-parse ${`${releaseTag}^{commit}`}`.text();
const tagCommit = tagCommitOutput.trim();
await $`git fetch --no-tags origin ${`${defaultBranch}:refs/remotes/origin/${defaultBranch}`}`;

const branchContainsTag =
  await $`git merge-base --is-ancestor ${tagCommit} ${`refs/remotes/origin/${defaultBranch}`}`.nothrow();

if (branchContainsTag.exitCode !== 0) {
  throw new Error(
    `Release tag ${releaseTag} does not point to a commit reachable from ${defaultBranch}.`,
  );
}

const checksRun = await findSuccessfulChecksRun(tagCommit);
console.log(
  `Found successful ${checksWorkflow} run for ${tagCommit}: ${checksRun.url}`,
);

writeOutput({
  package_version: packageVersion,
  release_tag: releaseTag,
});

async function findSuccessfulChecksRun(commit) {
  const runs =
    await $`gh run list --workflow ${checksWorkflow} --commit ${commit} --branch ${defaultBranch} --status success --json databaseId,url --limit 1`.json();

  if (!Array.isArray(runs) || runs.length === 0) {
    throw new Error(
      `No successful ${checksWorkflow} workflow run found for ${commit} on ${defaultBranch}.`,
    );
  }

  return runs[0];
}
