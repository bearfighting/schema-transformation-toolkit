import { describe, expect, it } from "vitest";
import { jsonParser } from "../../packages/parsers/json/src/index.js";
import {
  configureJsonSchemaGenerator,
  jsonSchemaGenerator,
} from "../../packages/generators/json-schema/src/index.js";
import {
  expectDiagnosticCode,
  expectSemanticNoteCode,
} from "../helpers/diagnostic-assertions.js";
import { expectOk } from "../helpers/result-assertions.js";

describe("integration: json -> ir -> json-schema", () => {
  it("preserves optional and nullable object field semantics across the full pipeline", () => {
    const parsed = jsonParser.parse(
      '[{"id":1,"name":"Ada"},{"id":2,"name":null},{}]',
      {
        name: "user-list",
      },
    );

    expectOk(parsed, "Expected the JSON parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
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
              type: ["string", "null"],
            },
          },
        },
      },
    });
  });

  it("preserves inferred tuples across the full pipeline when tuple inference is enabled", () => {
    const parsed = jsonParser.parse('{"pair":[1,"north"]}', {
      name: "coordinate-pair",
      inference: {
        tupleInferenceMode: "heterogeneous-only",
      },
    });

    expectOk(parsed, "Expected the JSON parser to succeed.");

    expect(jsonSchemaGenerator.generate(parsed.document)).toEqual({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "coordinate-pair",
        type: "object",
        properties: {
          pair: {
            type: "array",
            prefixItems: [{ type: "integer" }, { type: "string" }],
            minItems: 2,
            items: false,
          },
        },
        required: ["pair"],
      },
    });
  });

  it("preserves inferred records across the full pipeline when record inference is enabled", () => {
    const parsed = jsonParser.parse(
      '[{"en":"Hello","fr":"Bonjour"},{"de":"Hallo","es":"Hola"}]',
      {
        name: "translation-table",
        inference: {
          recordInferenceMode: "shared-value-type",
        },
      },
    );

    expectOk(parsed, "Expected the JSON parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "translation-table",
        type: "array",
        items: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
        },
      },
    });
  });

  it("preserves discriminated object unions across the full pipeline in union mode", () => {
    const parsed = jsonParser.parse(
      '[{"type":"a","value":"x"},{"type":"b","count":1}]',
      {
        name: "discriminated-value",
        inference: {
          mixedTypeMode: "union",
        },
      },
    );

    expectOk(parsed, "Expected the JSON parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "discriminated-value",
        type: "array",
        items: {
          oneOf: [
            {
              type: "object",
              properties: {
                type: {
                  const: "a",
                },
                value: {
                  type: "string",
                },
              },
              required: ["type", "value"],
            },
            {
              type: "object",
              properties: {
                type: {
                  const: "b",
                },
                count: {
                  type: "integer",
                },
              },
              required: ["type", "count"],
            },
          ],
        },
      },
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.diagnostics).toHaveLength(1);
    expect(result.semanticNotes).toHaveLength(1);
    expectDiagnosticCode(result.diagnostics, "overlapping-oneof-members");
    expectSemanticNoteCode(
      result.semanticNotes,
      "overlapping-oneof-members",
    );
  });

  it("preserves collapsed unknown semantics across the full pipeline in unknown mode", () => {
    const parsed = jsonParser.parse('[1,"two",true]', {
      name: "mixed-value",
      inference: {
        mixedTypeMode: "unknown",
      },
    });

    expectOk(parsed, "Expected the JSON parser to succeed.");

    const result = jsonSchemaGenerator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "mixed-value",
        type: "array",
        items: true,
      },
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.diagnostics).toHaveLength(1);
    expect(result.semanticNotes).toHaveLength(1);
    expectDiagnosticCode(result.diagnostics, "wide-unknown-schema");
    expectSemanticNoteCode(result.semanticNotes, "wide-unknown-schema");
  });

  it("supports configured generator options in the same pipeline", () => {
    const configuredGenerator = configureJsonSchemaGenerator({
      includeId: true,
      objectAdditionalPropertiesMode: "false",
      unionComposition: "anyOf",
    });
    const parsed = jsonParser.parse(
      '[{"type":"a","value":"x"},{"type":"b","count":1}]',
      {
        name: "configured-value",
        inference: {
          mixedTypeMode: "union",
        },
      },
    );

    expectOk(parsed, "Expected the JSON parser to succeed.");

    const result = configuredGenerator.generator.generate(parsed.document);

    expect(result).toMatchObject({
      ok: true,
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        $id: "configured-value",
        title: "configured-value",
        type: "array",
        items: {
          anyOf: [
            {
              type: "object",
              properties: {
                type: {
                  const: "a",
                },
                value: {
                  type: "string",
                },
              },
              additionalProperties: false,
              required: ["type", "value"],
            },
            {
              type: "object",
              properties: {
                type: {
                  const: "b",
                },
                count: {
                  type: "integer",
                },
              },
              additionalProperties: false,
              required: ["type", "count"],
            },
          ],
        },
      },
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.diagnostics).toHaveLength(3);
    expect(result.semanticNotes).toHaveLength(3);
    expectDiagnosticCode(result.diagnostics, "overlapping-anyof-members");
    expectSemanticNoteCode(
      result.semanticNotes,
      "overlapping-anyof-members",
    );
    expect(
      result.diagnostics?.filter(
        (diagnostic) => diagnostic.code === "closed-object-schema",
      ),
    ).toHaveLength(2);
    expect(
      result.semanticNotes?.filter(
        (semanticNote) => semanticNote.code === "closed-object-schema",
      ),
    ).toHaveLength(2);
  });

  it("propagates parser failures before generation", () => {
    const parsed = jsonParser.parse('[1,"two"]', {
      name: "mixed-value",
    });

    expect(parsed).toEqual({
      ok: false,
      code: "unsupported-mixed-types",
      message:
        "The input is valid JSON, but array elements do not share a common inferable type in schema IR v0.",
      diagnostics: [
        {
          severity: "error",
          code: "unsupported-mixed-types",
          message:
            "The input is valid JSON, but array elements do not share a common inferable type in schema IR v0.",
          path: [],
          source: "parser-json",
        },
      ],
    });
  });
});
