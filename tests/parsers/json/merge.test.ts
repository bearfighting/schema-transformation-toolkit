import { describe, expect, it } from "vitest";
import {
  schemaArrayNode,
  schemaFieldNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnknownNode,
} from "../../../packages/core/src/index.js";
import { mergeTypeNodes } from "../../../packages/parsers/json/src/merge.js";

describe("parser-json merge", () => {
  it("promotes integer and number scalars to number", () => {
    const left = schemaScalarNode("integer");
    const right = schemaScalarNode("number");

    const merged = mergeTypeNodes(left, right, "numeric merge");

    expect(merged).not.toBe(left);
    expect(merged).toEqual({
      kind: "scalar",
      scalar: "number",
    });
    expect(left).toEqual({
      kind: "scalar",
      scalar: "integer",
    });
    expect(right).toEqual({
      kind: "scalar",
      scalar: "number",
    });
  });

  it("merges object fields while propagating optionality and nullability", () => {
    const left = schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer")),
      schemaFieldNode("name", schemaScalarNode("string"), {
        nullable: true,
      }),
    ]);
    const right = schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("number")),
      schemaFieldNode("active", schemaScalarNode("boolean")),
      schemaFieldNode("name", schemaScalarNode("string")),
    ]);

    const merged = mergeTypeNodes(left, right, "object fields");

    expect(merged).not.toBe(left);
    expect(merged).toEqual({
      kind: "object",
      fields: [
        {
          kind: "field",
          name: { source: "active", words: ["active"] },
          required: false,
          nullable: false,
          type: { kind: "scalar", scalar: "boolean" },
        },
        {
          kind: "field",
          name: { source: "id", words: ["id"] },
          required: true,
          nullable: false,
          type: { kind: "scalar", scalar: "number" },
        },
        {
          kind: "field",
          name: { source: "name", words: ["name"] },
          required: true,
          nullable: true,
          type: { kind: "scalar", scalar: "string" },
        },
      ],
    });
    expect(left).toEqual({
      kind: "object",
      fields: [
        {
          kind: "field",
          name: { source: "id", words: ["id"] },
          required: true,
          nullable: false,
          type: { kind: "scalar", scalar: "integer" },
        },
        {
          kind: "field",
          name: { source: "name", words: ["name"] },
          required: true,
          nullable: true,
          type: { kind: "scalar", scalar: "string" },
        },
      ],
    });
  });

  it("merges tuple elements positionally and preserves longer tails as optional", () => {
    const left = schemaTupleNode([
      schemaTupleElement(schemaScalarNode("integer")),
      schemaTupleElement(schemaScalarNode("string")),
    ]);
    const right = schemaTupleNode([
      schemaTupleElement(schemaScalarNode("number")),
      schemaTupleElement(schemaScalarNode("string")),
      schemaTupleElement(schemaScalarNode("boolean")),
    ]);

    const merged = mergeTypeNodes(left, right, "tuple elements");

    expect(merged).not.toBe(left);
    expect(merged).toEqual({
      kind: "tuple",
      elements: [
        {
          required: true,
          type: { kind: "scalar", scalar: "number" },
        },
        {
          required: true,
          type: { kind: "scalar", scalar: "string" },
        },
        {
          required: false,
          type: { kind: "scalar", scalar: "boolean" },
        },
      ],
    });
    expect(left).toEqual({
      kind: "tuple",
      elements: [
        {
          required: true,
          type: { kind: "scalar", scalar: "integer" },
        },
        {
          required: true,
          type: { kind: "scalar", scalar: "string" },
        },
      ],
    });
  });

  it("merges record keys and values recursively", () => {
    const left = schemaRecordNode(
      schemaScalarNode("string"),
      schemaArrayNode(schemaScalarNode("integer")),
    );
    const right = schemaRecordNode(
      schemaScalarNode("string"),
      schemaArrayNode(schemaScalarNode("number")),
    );

    const merged = mergeTypeNodes(left, right, "record values");

    expect(merged).not.toBe(left);
    expect(merged).toEqual({
      kind: "record",
      key: { kind: "scalar", scalar: "string" },
      value: {
        kind: "array",
        elementType: { kind: "scalar", scalar: "number" },
      },
    });
    expect(left).toEqual({
      kind: "record",
      key: { kind: "scalar", scalar: "string" },
      value: {
        kind: "array",
        elementType: { kind: "scalar", scalar: "integer" },
      },
    });
  });

  it("preserves nested input shapes while merging recursively", () => {
    const left = schemaObjectNode([
      schemaFieldNode(
        "items",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
          ]),
        ),
      ),
    ]);
    const right = schemaObjectNode([
      schemaFieldNode(
        "items",
        schemaArrayNode(
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("number")),
            schemaFieldNode("name", schemaScalarNode("string")),
          ]),
        ),
      ),
    ]);

    const merged = mergeTypeNodes(left, right, "nested object fields");

    expect(merged).toEqual({
      kind: "object",
      fields: [
        {
          kind: "field",
          name: { source: "items", words: ["items"] },
          required: true,
          nullable: false,
          type: {
            kind: "array",
            elementType: {
              kind: "object",
              fields: [
                {
                  kind: "field",
                  name: { source: "id", words: ["id"] },
                  required: true,
                  nullable: false,
                  type: { kind: "scalar", scalar: "number" },
                },
                {
                  kind: "field",
                  name: { source: "name", words: ["name"] },
                  required: false,
                  nullable: false,
                  type: { kind: "scalar", scalar: "string" },
                },
              ],
            },
          },
        },
      ],
    });
    expect(left).toEqual({
      kind: "object",
      fields: [
        {
          kind: "field",
          name: { source: "items", words: ["items"] },
          required: true,
          nullable: false,
          type: {
            kind: "array",
            elementType: {
              kind: "object",
              fields: [
                {
                  kind: "field",
                  name: { source: "id", words: ["id"] },
                  required: true,
                  nullable: false,
                  type: { kind: "scalar", scalar: "integer" },
                },
              ],
            },
          },
        },
      ],
    });
    expect(right).toEqual({
      kind: "object",
      fields: [
        {
          kind: "field",
          name: { source: "items", words: ["items"] },
          required: true,
          nullable: false,
          type: {
            kind: "array",
            elementType: {
              kind: "object",
              fields: [
                {
                  kind: "field",
                  name: { source: "id", words: ["id"] },
                  required: true,
                  nullable: false,
                  type: { kind: "scalar", scalar: "number" },
                },
                {
                  kind: "field",
                  name: { source: "name", words: ["name"] },
                  required: true,
                  nullable: false,
                  type: { kind: "scalar", scalar: "string" },
                },
              ],
            },
          },
        },
      ],
    });
  });

  it("falls back to a union for incompatible kinds in union mode", () => {
    const merged = mergeTypeNodes(
      schemaScalarNode("string"),
      schemaScalarNode("boolean"),
      "mixed scalars",
      "union",
    );

    expect(merged).toEqual({
      kind: "union",
      members: [
        { kind: "scalar", scalar: "string" },
        { kind: "scalar", scalar: "boolean" },
      ],
    });
  });

  it("falls back to a union for incompatible nested tuple members in union mode", () => {
    const merged = mergeTypeNodes(
      schemaTupleNode([
        schemaTupleElement(schemaScalarNode("integer")),
        schemaTupleElement(schemaScalarNode("string")),
      ]),
      schemaTupleNode([
        schemaTupleElement(schemaScalarNode("integer")),
        schemaTupleElement(schemaObjectNode([])),
      ]),
      "tuple elements",
      "union",
    );

    expect(merged).toEqual({
      kind: "tuple",
      elements: [
        {
          required: true,
          type: { kind: "scalar", scalar: "integer" },
        },
        {
          required: true,
          type: {
            kind: "union",
            members: [
              { kind: "scalar", scalar: "string" },
              { kind: "object", fields: [] },
            ],
          },
        },
      ],
    });
  });

  it("throws for incompatible kinds outside union mode", () => {
    expect(() =>
      mergeTypeNodes(
        schemaArrayNode(schemaScalarNode("string")),
        schemaObjectNode([]),
        "root values",
      ),
    ).toThrow(
      "The input is valid JSON, but root values do not share a common inferable type in schema IR v0.",
    );
  });

  it("keeps the left unknown reason while merging nullable state", () => {
    const left = schemaUnknownNode({
      reason: "empty-array-element",
    });
    const right = schemaUnknownNode({
      reason: "mixed-types-collapsed",
      nullable: true,
    });

    expect(mergeTypeNodes(left, right, "unknown merge", "unknown")).toEqual({
      kind: "unknown",
      reason: "empty-array-element",
      nullable: true,
    });
    expect(left).toEqual({
      kind: "unknown",
      reason: "empty-array-element",
      nullable: false,
    });
  });
});
