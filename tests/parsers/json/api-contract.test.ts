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
      "inferJsonDocumentFromValueDocument",
      "inferJsonDocumentFromValueDocumentWithOptions",
      "inferJsonDocumentWithOptions",
      "inferJsonType",
      "inferSchemaNodeFromJsonValue",
      "isJsonInferenceError",
      "jsonParser",
      "jsonParserCapabilities",
      "parseJsonValue",
      "parseJsonValueDocument",
      "parseJsonValueDocumentWithOptions",
      "prepareJsonParseOptions",
      "preparedJsonParserOptions",
      "resolveJsonDecodeOptions",
      "resolveJsonParseOptions",
      "tryInferJsonDocument",
      "tryInferJsonDocumentFromValueDocument",
      "tryInferJsonDocumentFromValueDocumentWithOptions",
      "tryInferJsonDocumentWithOptions",
      "tryParseJsonValueDocument",
      "tryParseJsonValueDocumentWithOptions",
      "validateJsonDecodeOptions",
      "validateJsonParseOptions",
    ]);
  });
});
