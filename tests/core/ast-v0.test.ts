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

describe("core ast v0", () => {
  it("builds a scalar root document", () => {
    expect(schemaDocument("ScalarString", scalarType("string"))).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("ScalarString"),
      root: {
        kind: "scalar",
        scalar: "string",
      },
    });
  });

  it("keeps required and nullable as independent field flags", () => {
    expect(
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
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("ObjectFieldOptionalAndNullable"),
      root: {
        kind: "array",
        elementType: {
          kind: "object",
          fields: [
            {
              kind: "field",
              name: identifierName("id"),
              required: true,
              nullable: false,
              type: {
                kind: "scalar",
                scalar: "integer",
              },
            },
            {
              kind: "field",
              name: identifierName("name"),
              required: false,
              nullable: true,
              type: {
                kind: "scalar",
                scalar: "string",
              },
            },
          ],
        },
      },
    });
  });

  it("supports unknown type nodes for unresolved semantics", () => {
    expect(
      schemaDocument(
        "EmptyArray",
        arrayType(
          unknownType({
            reason: "empty-array-element",
          }),
        ),
      ),
    ).toEqual({
      version: "0.1",
      kind: "document",
      name: identifierName("EmptyArray"),
      root: {
        kind: "array",
        elementType: {
          kind: "unknown",
          reason: "empty-array-element",
          nullable: false,
        },
      },
    });
  });
});
