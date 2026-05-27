import * as fs from "node:fs";

export function requireEnvironmentVariable(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be set.`);
  }

  return value;
}

export function writeEnvironmentVariable(name, value) {
  const environmentFile = requireEnvironmentVariable("GITHUB_ENV");
  fs.appendFileSync(environmentFile, `${name}=${value}\n`);
}

export function writeOutput(values) {
  const outputFile = requireEnvironmentVariable("GITHUB_OUTPUT");
  const lines = Object.entries(values).map(
    ([name, value]) => `${name}=${value}`,
  );
  fs.appendFileSync(outputFile, `${lines.join("\n")}\n`);
}
