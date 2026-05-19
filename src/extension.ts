import { ExtensionContext, workspace } from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const config = workspace.getConfiguration("alexandrite");
  const legacyConfig = workspace.getConfiguration("purescriptAnalyzer");
  const serverPath =
    config.get<string>("serverPath")?.trim() ||
    legacyConfig.get<string>("serverPath")?.trim() ||
    "alexandrite";
  const sourceCommand =
    config.get<string>("sourceCommand")?.trim() ||
    legacyConfig.get<string>("sourceCommand")?.trim();

  const args: string[] = [];
  if (sourceCommand) {
    args.push("--source-command", sourceCommand);
  }

  const serverOptions: ServerOptions = {
    command: serverPath,
    args,
    transport: TransportKind.stdio,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "purescript" }],
  };

  client = new LanguageClient(
    "alexandrite",
    "Alexandrite",
    serverOptions,
    clientOptions,
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
