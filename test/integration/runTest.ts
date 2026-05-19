import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from "@vscode/test-electron";
import * as dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", ".env"),
  quiet: true,
});

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, "..", "..", "..");
  const extensionTestsPath = path.resolve(__dirname, "suite");
  const workspacePath = path.resolve(
    extensionDevelopmentPath,
    ".vscode-test",
    "workspaces",
    "alexandrite",
  );
  const alexandritePath = requireExecutablePath("ALEXANDRITE_PATH");

  prepareWorkspace(workspacePath, alexandritePath);

  const vscodeExecutablePath = await downloadAndUnzipVSCode(
    process.env.VSCODE_VERSION,
  );
  installExtension(vscodeExecutablePath, "nwolverson.language-purescript");

  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [workspacePath],
    extensionTestsEnv: {
      ALEXANDRITE_PATH: alexandritePath,
    },
  });
}

function installExtension(vscodeExecutablePath: string, extensionId: string) {
  const [command, ...args] =
    resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  const result = spawnSync(command, [...args, "--install-extension", extensionId], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Failed to install VS Code extension dependency: ${extensionId}`);
  }
}

function requireExecutablePath(environmentVariable: string) {
  const executablePath = process.env[environmentVariable]?.trim();
  if (!executablePath) {
    throw new Error(
      `${environmentVariable} must be set. See .env.example for the expected format.`,
    );
  }

  if (!path.isAbsolute(executablePath)) {
    throw new Error(`${environmentVariable} must be an absolute path.`);
  }

  try {
    fs.accessSync(executablePath, fs.constants.X_OK);
  } catch {
    throw new Error(
      `${environmentVariable} must point to an executable file: ${executablePath}`,
    );
  }

  return executablePath;
}

function prepareWorkspace(workspacePath: string, alexandritePath: string) {
  const vscodeDirectory = path.join(workspacePath, ".vscode");
  const srcDirectory = path.join(workspacePath, "src");
  fs.mkdirSync(vscodeDirectory, { recursive: true });
  fs.mkdirSync(srcDirectory, { recursive: true });

  const sourceFilesScript = path.join(workspacePath, "source-files.js");
  fs.writeFileSync(
    path.join(srcDirectory, "Main.purs"),
    [
      "module Main where",
      "",
      "import Prelude",
      "",
      "main :: Unit",
      "main = unit",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    sourceFilesScript,
    [
      "const path = require('path');",
      "console.log(path.join(__dirname, 'src', 'Main.purs'));",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(vscodeDirectory, "settings.json"),
    JSON.stringify(
      {
        "alexandrite.serverPath": alexandritePath,
        "alexandrite.sourceCommand": `${process.execPath} ${sourceFilesScript}`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
