import { describe, expect, it } from "vitest";
import {
  identifierName,
  schemaDocument,
  schemaArrayNode,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "../../../packages/core/src/index.js";
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
} from "../../../packages/parsers/json/src/index.js";

describe("parser-json inference", () => {
  it("infers scalar roots", () => {
    expect(inferJsonDocument('"hello"', "ScalarString")).toEqual(
      schemaDocument("ScalarString", schemaScalarNode("string")),
    );
    expect(inferJsonDocument("42", "ScalarInteger")).toEqual(
      schemaDocument("ScalarInteger", schemaScalarNode("integer")),
    );
    expect(inferJsonDocument("3.14", "ScalarNumber")).toEqual(
      schemaDocument("ScalarNumber", schemaScalarNode("number")),
    );
    expect(inferJsonDocument("true", "ScalarBoolean")).toEqual(
      schemaDocument("ScalarBoolean", schemaScalarNode("boolean")),
    );
  });

  it("continues to widen scalar samples instead of inferring literal nodes by default", () => {
    expect(inferJsonDocument('"open"', "LiteralLikeString")).toEqual(
      schemaDocument("LiteralLikeString", schemaScalarNode("string")),
    );

    expect(inferJsonDocument("42", "LiteralLikeNumber")).toEqual(
      schemaDocument("LiteralLikeNumber", schemaScalarNode("integer")),
    );

    expect(inferJsonDocument("true", "LiteralLikeBoolean")).toEqual(
      schemaDocument("LiteralLikeBoolean", schemaScalarNode("boolean")),
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
        schemaObjectNode([
          schemaFieldNode("name", schemaScalarNode("string")),
          schemaFieldNode("age", schemaScalarNode("integer")),
          schemaFieldNode("active", schemaScalarNode("boolean")),
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
        schemaObjectNode([
          schemaFieldNode(
            "user",
            schemaObjectNode([
              schemaFieldNode("name", schemaScalarNode("string")),
              schemaFieldNode("age", schemaScalarNode("integer")),
            ]),
          ),
        ]),
      ),
    );
  });

  it("infers arrays of strings", () => {
    expect(inferJsonDocument('["a","b","c"]', "ArrayOfString")).toEqual(
      schemaDocument("ArrayOfString", schemaArrayNode(schemaScalarNode("string"))),
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
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("name", schemaScalarNode("string")),
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
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("name", schemaScalarNode("string"), {
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
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("name", schemaScalarNode("string"), {
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
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("name", schemaScalarNode("string"), {
              nullable: true,
            }),
          ]),
        ),
      ),
    );
  });

  it("distinguishes null-only fields from nullable fields with non-null evidence", () => {
    expect(
      inferJsonDocument(
        '[{"name":null},{"name":"Ada"}]',
        "NullableFieldWithEvidence",
      ),
    ).toEqual(
      schemaDocument(
        "NullableFieldWithEvidence",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("name", schemaScalarNode("string"), {
              nullable: true,
            }),
          ]),
        ),
      ),
    );

    expect(
      inferJsonDocument('[{"name":null},{}]', "NullOnlyOrMissingField"),
    ).toEqual(
      schemaDocument(
        "NullOnlyOrMissingField",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("name", schemaNullNode(), {
              required: false,
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
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode(
              "user",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("integer")),
                schemaFieldNode("name", schemaScalarNode("string"), {
                  required: false,
                }),
              ]),
            ),
          ]),
        ),
      ),
    );
  });

  it('supports recordInferenceMode: "shared-value-type" for dynamic-key object samples', () => {
    expect(
      inferJsonDocumentWithOptions(
        '[{"en":"Hello","fr":"Bonjour"},{"de":"Hallo","es":"Hola"}]',
        {
          name: "TranslationTable",
          inference: {
            recordInferenceMode: "shared-value-type",
          },
        },
      ),
    ).toEqual(
      schemaDocument(
        "TranslationTable",
        schemaArrayNode(
          schemaRecordNode(
            schemaScalarNode("string"),
            schemaScalarNode("string"),
          ),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions(
        '[{"users":{"a":{"id":1},"b":{"id":2}}},{"users":{"c":{"id":3}}}]',
        {
          name: "RecordFieldShape",
          inference: {
            recordInferenceMode: "shared-value-type",
          },
        },
      ),
    ).toEqual(
      schemaDocument(
        "RecordFieldShape",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode(
              "users",
              schemaRecordNode(
                schemaScalarNode("string"),
                schemaObjectNode([
                  schemaFieldNode("id", schemaScalarNode("integer")),
                ]),
              ),
            ),
          ]),
        ),
      ),
    );
  });

  it("does not infer records by default or when object samples have stable common keys", () => {
    expect(
      inferJsonDocument('{"en":"Hello","fr":"Bonjour"}', "SingleObjectShape"),
    ).toEqual(
      schemaDocument(
        "SingleObjectShape",
        schemaObjectNode([
          schemaFieldNode("en", schemaScalarNode("string")),
          schemaFieldNode("fr", schemaScalarNode("string")),
        ]),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[{"id":1,"name":"Ada"},{"id":2,"name":"Linus"}]', {
        name: "StableObjectShape",
        inference: {
          recordInferenceMode: "shared-value-type",
        },
      }),
    ).toEqual(
      schemaDocument(
        "StableObjectShape",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("name", schemaScalarNode("string")),
          ]),
        ),
      ),
    );
  });

  it("promotes mixed numeric samples to number", () => {
    expect(inferJsonDocument("[1,2.5,3]", "MixedNumericArray")).toEqual(
      schemaDocument("MixedNumericArray", schemaArrayNode(schemaScalarNode("number"))),
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
    ).toEqual(schemaDocument("ScalarNumberOnly", schemaScalarNode("number")));

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
        schemaObjectNode([schemaFieldNode("age", schemaScalarNode("number"))]),
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
      schemaDocument("ArrayNumberOnly", schemaArrayNode(schemaScalarNode("number"))),
    );
  });

  it("returns structured failures for unsupported but valid json", () => {
    expect(inferJsonDocument("null", "StandaloneNull")).toEqual(
      schemaDocument(
        "StandaloneNull",
        schemaNullNode(),
      ),
    );
    expect(inferJsonDocument("[]", "EmptyArray")).toEqual(
      schemaDocument(
        "EmptyArray",
        schemaArrayNode(
          schemaUnknownNode({
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

  it('supports mixedTypeMode: "union" for mixed arrays and fields', () => {
    expect(
      inferJsonDocumentWithOptions('[1,"a",null]', {
        name: "MixedScalarArray",
        inference: {
          mixedTypeMode: "union",
        },
      }),
    ).toEqual(
      schemaDocument(
        "MixedScalarArray",
        schemaArrayNode(
          schemaUnionNode([
            schemaScalarNode("integer"),
            schemaScalarNode("string"),
            schemaNullNode(),
          ]),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[{"value":1},{"value":"a"},{"value":null}]', {
        name: "MixedFieldValues",
        inference: {
          mixedTypeMode: "union",
        },
      }),
    ).toEqual(
      schemaDocument(
        "MixedFieldValues",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode(
              "value",
              schemaUnionNode([
                schemaScalarNode("integer"),
                schemaScalarNode("string"),
              ]),
              {
                nullable: true,
              },
            ),
          ]),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[{"id":1},"a"]', {
        name: "MixedObjectScalarArray",
        inference: {
          mixedTypeMode: "union",
        },
      }),
    ).toEqual(
      schemaDocument(
        "MixedObjectScalarArray",
        schemaArrayNode(
          schemaUnionNode([
            schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
            schemaScalarNode("string"),
          ]),
        ),
      ),
    );
  });

  it('deduplicates union members and still promotes numeric samples in union mode', () => {
    expect(
      inferJsonDocumentWithOptions('[1,2.5,3,"a","b"]', {
        name: "NumericAndStringArray",
        inference: {
          mixedTypeMode: "union",
        },
      }),
    ).toEqual(
      schemaDocument(
        "NumericAndStringArray",
        schemaArrayNode(
          schemaUnionNode([
            schemaScalarNode("number"),
            schemaScalarNode("string"),
          ]),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[{"value":1},{"value":2.5},{"value":"x"},{"value":"y"}]', {
        name: "DedupedFieldUnion",
        inference: {
          mixedTypeMode: "union",
        },
      }),
    ).toEqual(
      schemaDocument(
        "DedupedFieldUnion",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode(
              "value",
              schemaUnionNode([
                schemaScalarNode("number"),
                schemaScalarNode("string"),
              ]),
            ),
          ]),
        ),
      ),
    );
  });

  it('supports tupleInferenceMode: "heterogeneous-only" for heterogeneous arrays', () => {
    expect(
      inferJsonDocumentWithOptions('[1,"north",true]', {
        name: "TupleRoot",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "TupleRoot",
        schemaTupleNode([
          schemaScalarNode("integer"),
          schemaScalarNode("string"),
          schemaScalarNode("boolean"),
        ]),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('{"pair":[1,"east"]}', {
        name: "TupleField",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "TupleField",
        schemaObjectNode([
          schemaFieldNode(
            "pair",
            schemaTupleNode([
              schemaScalarNode("integer"),
              schemaScalarNode("string"),
            ]),
          ),
        ]),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[[1,"east"],[2,"west"]]', {
        name: "TupleArray",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "TupleArray",
        schemaArrayNode(
          schemaTupleNode([
            schemaScalarNode("integer"),
            schemaScalarNode("string"),
          ]),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[[1,"east"],[2]]', {
        name: "OptionalTupleArray",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "OptionalTupleArray",
        schemaArrayNode(
          schemaTupleNode([
            schemaScalarNode("integer"),
            schemaTupleElement(schemaScalarNode("string"), {
              required: false,
            }),
          ]),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[{"pair":[1,"east"]},{"pair":[2]}]', {
        name: "OptionalTupleField",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "OptionalTupleField",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode(
              "pair",
              schemaTupleNode([
                schemaScalarNode("integer"),
                schemaTupleElement(schemaScalarNode("string"), {
                  required: false,
                }),
              ]),
            ),
          ]),
        ),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[[1,"east"],[2,true],[3,null]]', {
        name: "TupleUnionMembers",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "TupleUnionMembers",
        schemaArrayNode(
          schemaTupleNode([
            schemaScalarNode("integer"),
            schemaUnionNode([
              schemaScalarNode("string"),
              schemaScalarNode("boolean"),
              schemaNullNode(),
            ]),
          ]),
        ),
      ),
    );
  });

  it("does not infer tuples for homogeneous arrays even when tuple inference is enabled", () => {
    expect(
      inferJsonDocumentWithOptions("[1,2,3]", {
        name: "HomogeneousArray",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "HomogeneousArray",
        schemaArrayNode(schemaScalarNode("integer")),
      ),
    );

    expect(
      inferJsonDocumentWithOptions('[{"pair":[1,2]},{"pair":[3,4]}]', {
        name: "HomogeneousTupleLikeField",
        inference: {
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual(
      schemaDocument(
        "HomogeneousTupleLikeField",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("pair", schemaArrayNode(schemaScalarNode("integer"))),
          ]),
        ),
      ),
    );
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
        schemaObjectNode([
          schemaFieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            schemaScalarNode("integer"),
          ),
          schemaFieldNode(
            identifierName({
              source: "display-name",
              words: ["display", "name"],
            }),
            schemaScalarNode("string"),
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
        schemaObjectNode([
          schemaFieldNode("name", schemaNullNode()),
          schemaFieldNode(
            "tags",
            schemaArrayNode(
              schemaUnknownNode({
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
        schemaObjectNode([
          schemaFieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            schemaScalarNode("integer"),
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
        schemaObjectNode([
          schemaFieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            schemaScalarNode("integer"),
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
        schemaObjectNode([
          schemaFieldNode(
            identifierName({
              source: "user_id",
              words: ["user", "id"],
            }),
            schemaScalarNode("integer"),
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
        schemaArrayNode(
          schemaUnknownNode({
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
        schemaNullNode(),
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
    ).toEqual([]);

    expect(
      validateJsonParseOptions({
        ...DEFAULT_JSON_PARSE_OPTIONS,
        inference: {
          ...DEFAULT_JSON_PARSE_OPTIONS.inference,
          tupleInferenceMode: "heterogeneous-only",
        },
      }),
    ).toEqual([]);

    expect(
      validateJsonParseOptions({
        ...DEFAULT_JSON_PARSE_OPTIONS,
        inference: {
          ...DEFAULT_JSON_PARSE_OPTIONS.inference,
          recordInferenceMode: "shared-value-type",
        },
      }),
    ).toEqual([]);
  });

  it("returns structured failures for invalid json", () => {
    expect(tryInferJsonDocument("{bad json}", "InvalidJson")).toEqual({
      ok: false,
      code: "invalid-json",
      message: "The input is not valid JSON.",
    });
  });
});
