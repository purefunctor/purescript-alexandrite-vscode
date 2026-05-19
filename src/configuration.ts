import * as fs from "fs";
import * as path from "path";

export const defaultServerCommands = [
  "alexandrite",
  "purescript-alexandrite",
  "purescript-analyzer",
];

export interface ExtensionSettings {
  serverPath?: string;
  sourceCommand?: string;
}

export interface ConfigurationInput {
  alexandrite?: ExtensionSettings;
  purescriptAnalyzer?: ExtensionSettings;
  pathValue?: string;
  platform?: NodeJS.Platform;
  pathExtensions?: string;
  fileSystem?: ExecutableFileSystem;
}

export interface ExecutableFileSystem {
  isExecutableFile(filePath: string): boolean;
}

export interface ResolvedConfiguration {
  serverPath: string;
  sourceCommand?: string;
}

export function resolveConfiguration(input: ConfigurationInput) {
  return {
    serverPath: resolveServerPath(input),
    sourceCommand: resolveSourceCommand(input),
  };
}

export function resolveServerPath(input: ConfigurationInput) {
  return (
    trimmed(input.alexandrite?.serverPath) ||
    trimmed(input.purescriptAnalyzer?.serverPath) ||
    findFirstExecutable(
      defaultServerCommands,
      input.pathValue ?? process.env.PATH ?? "",
      {
        fileSystem: input.fileSystem,
        pathExtensions: input.pathExtensions,
        platform: input.platform,
      },
    ) ||
    defaultServerCommands[0]
  );
}

export function resolveSourceCommand(input: ConfigurationInput) {
  return (
    trimmed(input.alexandrite?.sourceCommand) ||
    trimmed(input.purescriptAnalyzer?.sourceCommand)
  );
}

export interface FindExecutableOptions {
  platform?: NodeJS.Platform;
  pathExtensions?: string;
  fileSystem?: ExecutableFileSystem;
}

export function findFirstExecutable(
  commands: readonly string[],
  pathValue: string,
  options: FindExecutableOptions = {},
) {
  for (const command of commands) {
    const executablePath = findExecutable(command, pathValue, options);
    if (executablePath) {
      return executablePath;
    }
  }
  return undefined;
}

export function findExecutable(
  command: string,
  pathValue: string,
  options: FindExecutableOptions = {},
) {
  const platform = options.platform ?? process.platform;
  const fileSystem = options.fileSystem ?? nodeFileSystem;
  const delimiter = platform === "win32" ? ";" : ":";
  const executableNames = executableNamesForPlatform(
    command,
    platform,
    options.pathExtensions ?? process.env.PATHEXT,
  );

  for (const searchDirectory of pathValue.split(delimiter)) {
    if (!searchDirectory) {
      continue;
    }

    for (const executableName of executableNames) {
      const executablePath = path.join(searchDirectory, executableName);
      if (fileSystem.isExecutableFile(executablePath)) {
        return executablePath;
      }
    }
  }

  return undefined;
}

function executableNamesForPlatform(
  command: string,
  platform: NodeJS.Platform,
  pathExtensions: string | undefined,
) {
  if (platform !== "win32" || path.extname(command)) {
    return [command];
  }

  const extensions = (pathExtensions || ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((extension) => extension.trim())
    .filter(Boolean);

  return [command, ...extensions.map((extension) => `${command}${extension}`)];
}

function trimmed(value: string | undefined) {
  const result = value?.trim();
  return result || undefined;
}

const nodeFileSystem: ExecutableFileSystem = {
  isExecutableFile(filePath) {
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        return false;
      }

      if (process.platform === "win32") {
        return true;
      }

      return (stat.mode & 0o111) !== 0;
    } catch {
      return false;
    }
  },
};
