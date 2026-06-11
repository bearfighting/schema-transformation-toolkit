import { describe, expect, it } from "vitest";
import {
  arrayType,
  fieldNode,
  identifierName,
  objectType,
  scalarType,
  schemaDocument,
  unknownType,
} from "../../packages/core/src/index.js";
import {
  DEFAULT_JSON_PARSE_OPTIONS,
  configureJsonParser,
  inferJsonDocument,
  inferJsonDocumentWithOptions,
  jsonSchemaParser,
  preparedJsonSchemaParserOptions,
  resolveJsonParseOptions,
  validateJsonParseOptions,
  tryInferJsonDocument,
} from "../../packages/parser-json/src/index.js";

describe("parser-json inference", () => {
  it("infers scalar roots", () => {
    expect(inferJsonDocument('"hello"', "ScalarString")).toEqual(
      schemaDocument("ScalarString", scalarType("string")),
    );
    expect(inferJsonDocument("42", "ScalarInteger")).toEqual(
      schemaDocument("ScalarInteger", scalarType("integer")),
    );
    expect(inferJsonDocument("3.14", "ScalarNumber")).toEqual(
      schemaDocument("ScalarNumber", scalarType("number")),
    );
    expect(inferJsonDocument("true", "ScalarBoolean")).toEqual(
      schemaDocument("ScalarBoolean", scalarType("boolean")),
    );
  });

  it("infers a simple object", () => {
    expect(
      inferJsonDocument(
        '{"name":"Ada","age":32,"active":true}',
        "SimpleObject",
      ),
    ).toEqual(
      schemaDocument(
        "SimpleObject",
        objectType([
          fieldNode("name", scalarType("string")),
          fieldNode("age", scalarType("integer")),
          fieldNode("active", scalarType("boolean")),
        ]),
      ),
    );
  });

  it("infers nested objects", () => {
    expect(
      inferJsonDocument('{"user":{"name":"Ada","age":32}}', "NestedObject"),
    ).toEqual(
      schemaDocument(
        "NestedObject",
        objectType([
          fieldNode(
            "user",
            objectType([
              fieldNode("name", scalarType("string")),
              fieldNode("age", scalarType("integer")),
            ]),
          ),
        ]),
      ),
    );
  });

  it("infers arrays of strings", () => {
    expect(inferJsonDocument('["a","b","c"]', "ArrayOfString")).toEqual(
      schemaDocument("ArrayOfString", arrayType(scalarType("string"))),
    );
  });

  it("infers arrays of objects", () => {
    expect(
      inferJsonDocument(
        '[{"id":1,"name":"Ada"},{"id":2,"name":"Linus"}]',
        "ArrayOfObject",
      ),
    ).toEqual(
      schemaDocument(
        "ArrayOfObject",
        arrayType(
          objectType([
            fieldNode("id", scalarType("integer")),
            fieldNode("name", scalarType("string")),
          ]),
        ),
      ),
    );
  });

  it("infers arrays of objects and marks optional fields", () => {
    expect(
      inferJsonDocument(
        '[{"id":1,"name":"Ada"},{"id":2}]',
        "ObjectFieldOptional",
      ),
    ).toEqual(
      schemaDocument(
        "ObjectFieldOptional",
        arrayType(
          objectType([
            fieldNode("id", scalarType("integer")),
            fieldNode("name", scalarType("string"), {
              required: false,
            }),
          ]),
        ),
      ),
    );
  });

  it("keeps nullable separate from optional", () => {
    expect(
      inferJsonDocument(
        '[{"id":1,"name":"Ada"},{"id":2,"name":null},{"id":3}]',
        "ObjectFieldOptionalAndNullable",
      ),
    ).toEqual(
      schemaDocument(
        "ObjectFieldOptionalAndNullable",
        arrayType(
          objectType([
            fieldNode("id", scalarType("integer")),
            fieldNode("name", scalarType("string"), {
              required: false,
              nullable: true,
            }),
          ]),
        ),
      ),
    );
  });

  it("marks required nullable fields when null is explicit", () => {
    expect(
      inferJsonDocument(
        '[{"id":1,"name":"Ada"},{"id":2,"name":null}]',
        "ObjectFieldNullable",
      ),
    ).toEqual(
      schemaDocument(
        "ObjectFieldNullable",
        arrayType(
          objectType([
            fieldNode("id", scalarType("integer")),
            fieldNode("name", scalarType("string"), {
              nullable: true,
            }),
          ]),
        ),
      ),
    );
  });

  it("merges nested optional fields across object samples", () => {
    expect(
      inferJsonDocument(
        '[{"user":{"id":1,"name":"Ada"}},{"user":{"id":2}}]',
        "NestedOptionalField",
      ),
    ).toEqual(
      schemaDocument(
        "NestedOptionalField",
        arrayType(
          objectType([
            fieldNode(
              "user",
              objectType([
                fieldNode("id", scalarType("integer")),
                fieldNode("name", scalarType("string"), {
                  required: false,
                }),
              ]),
            ),
          ]),
        ),
      ),
    );
  });

  it("promotes mixed numeric samples to number", () => {
    expect(inferJsonDocument("[1,2.5,3]", "MixedNumericArray")).toEqual(
      schemaDocument("MixedNumericArray", arrayType(scalarType("number"))),
    );
  });

  it('supports numericMode: "number-only" for scalar, object, and array inference', () => {
    expect(
      inferJsonDocumentWithOptions("42", {
        name: "ScalarNumberOnly",
        inference: {
          numericMode: "number-only",
        },
      }),
    ).toEqual(schemaDocument("ScalarNumberOnly", scalarType("number")));

    expect(
      inferJsonDocumentWithOptions('{"age":32}', {
        name: "ObjectNumberOnly",
        inference: {
          numericMode: "number-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "ObjectNumberOnly",
        objectType([fieldNode("age", scalarType("number"))]),
      ),
    );

    expect(
      inferJsonDocumentWithOptions("[1,2,3]", {
        name: "ArrayNumberOnly",
        inference: {
          numericMode: "number-only",
        },
      }),
    ).toEqual(
      schemaDocument("ArrayNumberOnly", arrayType(scalarType("number"))),
    );
  });

  it("returns structured failures for unsupported but valid json", () => {
    expect(inferJsonDocument("null", "StandaloneNull")).toEqual(
      schemaDocument(
        "StandaloneNull",
        unknownType({
          reason: "top-level-null",
          nullable: true,
        }),
      ),
    );
    expect(inferJsonDocument("[]", "EmptyArray")).toEqual(
      schemaDocument(
        "EmptyArray",
        arrayType(
          unknownType({
            reason: "empty-array-element",
          }),
        ),
      ),
    );
  });

  it("returns structured failures for mixed arrays without a common type", () => {
    expect(tryInferJsonDocument('[1,"a"]', "MixedScalarArray")).toEqual({
      ok: false,
      code: "unsupported-mixed-types",
      message:
        "The input is valid JSON, but array elements do not share a common inferable type in AST v0.",
    });
    expect(
      tryInferJsonDocument('[{"id":1},"a"]', "MixedObjectScalarArray"),
    ).toEqual({
      ok: false,
      code: "unsupported-mixed-types",
      message:
        "The input is valid JSON, but array elements do not share a common inferable type in AST v0.",
    });
  });

  it("stores identifier names as source plus normalized words", () => {
    expect(
      inferJsonDocument('{"user_id":1,"display-name":"Ada"}', "user-profile"),
    ).toEqual(
      schemaDocument(
        identifierName({
          source: "user-profile",
          words: ["user", "profile"],
        }),
        objectType([
          fieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            scalarType("integer"),
          ),
          fieldNode(
            identifierName({
              source: "display-name",
              words: ["display", "name"],
            }),
            scalarType("string"),
          ),
        ]),
      ),
    );
  });

  it("preserves unresolved null-only and empty-array-only field semantics in the ir", () => {
    expect(
      inferJsonDocument('{"name":null,"tags":[]}', "PartialShape"),
    ).toEqual(
      schemaDocument(
        "PartialShape",
        objectType([
          fieldNode("name", unknownType({ reason: "null-only-field" }), {
            nullable: true,
          }),
          fieldNode(
            "tags",
            arrayType(
              unknownType({
                reason: "empty-array-element",
              }),
            ),
          ),
        ]),
      ),
    );
  });

  it("implements the shared parser interface", () => {
    expect(
      jsonSchemaParser.parse('{"user_id":1}', {
        name: "user-profile",
      }),
    ).toEqual({
      ok: true,
      document: schemaDocument(
        identifierName({
          source: "user-profile",
          words: ["user", "profile"],
        }),
        objectType([
          fieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            scalarType("integer"),
          ),
        ]),
      ),
    });
  });

  it("resolves json parse options with explicit defaults", () => {
    expect(resolveJsonParseOptions()).toEqual(DEFAULT_JSON_PARSE_OPTIONS);
    expect(
      resolveJsonParseOptions({
        name: "UserProfile",
      }),
    ).toEqual({
      ...DEFAULT_JSON_PARSE_OPTIONS,
      name: "UserProfile",
    });
  });

  it("supports configured parser instances with layered options", () => {
    const configuredParser = configureJsonParser(
      (input, options) => {
        return {
          ok: true,
          document: inferJsonDocumentWithOptions(input, {
            name: options.name,
          }),
        };
      },
      {
        name: "DefaultProfile",
      },
    );

    expect(configuredParser.parser.parse('{"user_id":1}')).toEqual({
      ok: true,
      document: schemaDocument(
        identifierName({
          source: "DefaultProfile",
          words: ["default", "profile"],
        }),
        objectType([
          fieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            scalarType("integer"),
          ),
        ]),
      ),
    });

    expect(
      configuredParser.parser.parse('{"user_id":1}', {
        name: "RuntimeProfile",
      }),
    ).toEqual({
      ok: true,
      document: schemaDocument(
        identifierName({
          source: "RuntimeProfile",
          words: ["runtime", "profile"],
        }),
        objectType([
          fieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            scalarType("integer"),
          ),
        ]),
      ),
    });
  });

  it("exposes prepared default parser options", () => {
    expect(preparedJsonSchemaParserOptions.errors).toEqual([]);
    expect(preparedJsonSchemaParserOptions.warnings).toEqual([]);
    expect(preparedJsonSchemaParserOptions.resolved).toEqual(
      DEFAULT_JSON_PARSE_OPTIONS,
    );
  });

  it("accepts the currently supported empty-array and null-handling modes", () => {
    expect(
      inferJsonDocumentWithOptions("[]", {
        inference: {
          emptyArrayMode: "unknown-array",
        },
      }),
    ).toEqual(
      schemaDocument(
        "JsonDocument",
        arrayType(
          unknownType({
            reason: "empty-array-element",
          }),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions("null", {
        inference: {
          nullHandling: "nullable",
        },
      }),
    ).toEqual(
      schemaDocument(
        "JsonDocument",
        unknownType({
          reason: "top-level-null",
          nullable: true,
        }),
      ),
    );
  });

  it("keeps runtime validation for unsupported resolved options from untyped callers", () => {
    expect(
      validateJsonParseOptions({
        ...DEFAULT_JSON_PARSE_OPTIONS,
        strictness: "best-effort" as never,
      }),
    ).toContain('Unsupported json parse option: strictness must currently be "strict".');

    expect(
      validateJsonParseOptions({
        ...DEFAULT_JSON_PARSE_OPTIONS,
        inference: {
          ...DEFAULT_JSON_PARSE_OPTIONS.inference,
          mixedTypeMode: "union" as never,
        },
      }),
    ).toContain(
      'Unsupported json parse option: inference.mixedTypeMode must currently be "error".',
    );
  });

  it("returns structured failures for invalid json", () => {
    expect(tryInferJsonDocument("{bad json}", "InvalidJson")).toEqual({
      ok: false,
      code: "invalid-json",
      message: "The input is not valid JSON.",
    });
  });
});
