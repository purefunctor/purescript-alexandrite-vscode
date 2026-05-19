import * as assert from "assert";

import * as vscode from "vscode";

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension(
    "purefunctor.purescript-analyzer",
  );

  assert.ok(extension, "Expected the Alexandrite extension to be installed.");
  await extension.activate();

  assert.strictEqual(extension.isActive, true);
}
