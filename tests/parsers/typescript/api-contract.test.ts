import { describe, expect, it } from "vitest";
import * as typeScriptParserModule from "../../../packages/parsers/typescript/src/index.js";

describe("parser-typescript api contract", () => {
  it("exposes the canonical runtime root exports", () => {
    expect(Object.keys(typeScriptParserModule).sort()).toEqual([
      "DEFAULT_TYPESCRIPT_PARSE_OPTIONS",
      "TypeScriptInferenceError",
      "assertSupportedTypeScriptParseOptions",
      "configureTypeScriptParser",
      "createTypeScriptParser",
      "createTypeScriptSourceFile",
      "inferTypeScriptDocument",
      "inferTypeScriptDocumentWithOptions",
      "isTypeScriptInferenceError",
      "prepareTypeScriptParseOptions",
      "preparedTypeScriptParserOptions",
      "preprocessTypeScriptSource",
      "resolveTypeScriptParseOptions",
      "tryInferTypeScriptDocument",
      "tryInferTypeScriptDocumentWithOptions",
      "typeScriptParser",
      "validateTypeScriptParseOptions",
    ]);
  });
});
