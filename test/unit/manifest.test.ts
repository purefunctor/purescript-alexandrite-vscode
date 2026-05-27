import * as assert from "assert";
import { describe, test } from "vitest";

import packageJson = require("../../package.json");

describe("manifest", () => {
  test("contributes preferred and legacy settings", () => {
    const properties = packageJson.contributes.configuration.properties;

    assert.ok(properties["alexandrite.serverPath"]);
    assert.ok(properties["alexandrite.sourceCommand"]);
    assert.ok(properties["purescriptAnalyzer.serverPath"]);
    assert.ok(properties["purescriptAnalyzer.sourceCommand"]);
  });

  test("keeps server path defaults empty for runtime fallback", () => {
    const properties = packageJson.contributes.configuration.properties;

    assert.strictEqual(properties["alexandrite.serverPath"].default, "");
    assert.strictEqual(properties["purescriptAnalyzer.serverPath"].default, "");
  });

  test("marks legacy settings as deprecated", () => {
    const properties = packageJson.contributes.configuration.properties;

    assert.match(
      properties["purescriptAnalyzer.serverPath"].deprecationMessage,
      /alexandrite\.serverPath/,
    );
    assert.match(
      properties["purescriptAnalyzer.sourceCommand"].deprecationMessage,
      /alexandrite\.sourceCommand/,
    );
  });
});
