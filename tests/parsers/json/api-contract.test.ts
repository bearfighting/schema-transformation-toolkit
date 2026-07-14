import { describe, expect, it } from "vitest";
import * as jsonParserModule from "../../../packages/parsers/json/src/index.js";

describe("parser-json api contract", () => {
  it("exposes the canonical runtime root exports", () => {
    expect(Object.keys(jsonParserModule).sort()).toEqual([
      "DEFAULT_JSON_DECODE_OPTIONS",
      "DEFAULT_JSON_PARSE_OPTIONS",
      "JsonInferenceError",
      "assertSupportedJsonParseOptions",
      "configureJsonParser",
      "createJsonParser",
      "decodeJsonText",
      "inferJsonDocument",
      "inferJsonDocumentWithOptions",
      "inferJsonType",
      "inferSchemaNodeFromJsonValue",
      "isJsonInferenceError",
      "jsonParser",
      "parseJsonValue",
      "prepareJsonParseOptions",
      "preparedJsonParserOptions",
      "resolveJsonDecodeOptions",
      "resolveJsonParseOptions",
      "tryInferJsonDocument",
      "tryInferJsonDocumentWithOptions",
      "validateJsonDecodeOptions",
      "validateJsonParseOptions",
    ]);
  });
});
