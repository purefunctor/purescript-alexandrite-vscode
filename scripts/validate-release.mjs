import * as childProcess from "node:child_process";
import * as fs from "node:fs";

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

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const packageVersion = packageJson.version;
if (releaseTag !== `v${packageVersion}`) {
  throw new Error(
    `Release tag ${releaseTag} does not match package.json version ${packageVersion}.`,
  );
}

const tagCommit = git(["rev-parse", `${releaseTag}^{commit}`]);
run("git", [
  "fetch",
  "--no-tags",
  "origin",
  `${defaultBranch}:refs/remotes/origin/${defaultBranch}`,
]);

const branchContainsTag = childProcess.spawnSync(
  "git",
  [
    "merge-base",
    "--is-ancestor",
    tagCommit,
    `refs/remotes/origin/${defaultBranch}`,
  ],
  { stdio: "inherit" },
);

if (branchContainsTag.error) {
  throw branchContainsTag.error;
}

if (branchContainsTag.status !== 0) {
  throw new Error(
    `Release tag ${releaseTag} does not point to a commit reachable from ${defaultBranch}.`,
  );
}

const checksRun = findSuccessfulChecksRun(tagCommit);
console.log(
  `Found successful ${checksWorkflow} run for ${tagCommit}: ${checksRun.url}`,
);

writeOutput({
  package_version: packageVersion,
  release_tag: releaseTag,
});

function findSuccessfulChecksRun(commit) {
  const runs = JSON.parse(
    childProcess.execFileSync(
      "gh",
      [
        "run",
        "list",
        "--workflow",
        checksWorkflow,
        "--commit",
        commit,
        "--branch",
        defaultBranch,
        "--status",
        "success",
        "--json",
        "databaseId,url",
        "--limit",
        "1",
      ],
      {
        encoding: "utf8",
        env: process.env,
      },
    ),
  );

  if (!Array.isArray(runs) || runs.length === 0) {
    throw new Error(
      `No successful ${checksWorkflow} workflow run found for ${commit} on ${defaultBranch}.`,
    );
  }

  return runs[0];
}

function git(args) {
  return childProcess.execFileSync("git", args, { encoding: "utf8" }).trim();
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
