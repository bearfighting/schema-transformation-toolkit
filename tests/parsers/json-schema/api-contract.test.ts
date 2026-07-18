import { describe, expect, it } from "vitest";
import * as jsonSchemaParserModule from "../../../packages/parsers/json-schema/src/index.js";

describe("parser-json-schema api contract", () => {
  it("exposes the canonical runtime root exports", () => {
    expect(Object.keys(jsonSchemaParserModule).sort()).toEqual([
      "DEFAULT_JSON_SCHEMA_PARSE_OPTIONS",
      "JsonSchemaInferenceError",
      "assertSupportedJsonSchemaParseOptions",
      "configureJsonSchemaParser",
      "createJsonSchemaParser",
      "inferJsonSchemaDocument",
      "inferJsonSchemaDocumentWithOptions",
      "isJsonSchemaInferenceError",
      "jsonSchemaParser",
      "jsonSchemaParserCapabilities",
      "prepareJsonSchemaParseOptions",
      "preparedJsonSchemaParserOptions",
      "resolveJsonSchemaParseOptions",
      "tryInferJsonSchemaDocument",
      "tryInferJsonSchemaDocumentWithOptions",
      "validateJsonSchemaParseOptions",
    ]);
  });
});
