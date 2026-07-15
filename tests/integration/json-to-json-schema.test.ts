import { describe, expect, it } from "vitest";
import { jsonParser } from "../../packages/parsers/json/src/index.js";
import { jsonSchemaGenerator } from "../../packages/generators/json-schema/src/index.js";

describe("integration: json -> ir -> json-schema", () => {
  it("converts supported json samples into JSON Schema", () => {
    const parsed = jsonParser.parse(
      '[{"id":1,"name":"Ada"},{"id":2,"name":null},{}]',
      {
        name: "user-list",
      },
    );

    if (!parsed.ok) {
      throw new Error("Expected the JSON parser to succeed.");
    }

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "user-list",
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "integer",
            },
            name: {
              oneOf: [{ type: "string" }, { type: "null" }],
            },
          },
        },
      },
    });
  });
});
