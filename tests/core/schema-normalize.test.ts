import { describe, expect, it } from "vitest";
import {
  normalizeSchemaDefinitions,
  normalizeSchemaDocument,
  normalizeSchemaDocumentFromRoot,
  normalizeSchemaNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  schemaUnknownNode,
  type SchemaDocument,
  type SchemaNode,
  type SchemaUnionNode,
} from "../../packages/core/src/index.js";

describe("schema normalize", () => {
  it("reuses the original node when already normalized", () => {
    const node = schemaUnionNode([
      schemaScalarNode("string"),
      schemaScalarNode("number"),
    ]);

    const normalized = normalizeSchemaNode(node, {
      path: ["root"],
      definitionLookup: new Map(),
    });

    expect(normalized).toBe(node);
  });

  it("flattens and deduplicates nested unions", () => {
    const nestedUnion: SchemaUnionNode = {
      kind: "union",
      members: [
        schemaScalarNode("string"),
        {
          kind: "union",
          members: [
            schemaScalarNode("number"),
            schemaScalarNode("string"),
          ],
        },
      ],
    };

    const normalized = normalizeSchemaNode(nestedUnion, {
      path: ["root"],
      definitionLookup: new Map(),
    });

    expect(normalized).toEqual(
      schemaUnionNode([
        schemaScalarNode("string"),
        schemaScalarNode("number"),
      ]),
    );
  });

  it("collapses single-member unions into the member node", () => {
    const node: SchemaUnionNode = {
      kind: "union",
      members: [schemaScalarNode("string")],
    };

    const normalized = normalizeSchemaNode(node, {
      path: ["root"],
      definitionLookup: new Map(),
    });

    expect(normalized).toEqual(schemaScalarNode("string"));
  });

  it("canonicalizes unknown evidence", () => {
    const node = {
      kind: "unknown" as const,
      reason: "mixed-types-collapsed" as const,
      nullable: false,
      evidence: {
        source: "parser-json" as const,
        detail: "  mixed kinds  ",
        observedKinds: ["number", " string ", "number"],
      },
    };

    const normalized = normalizeSchemaNode(node, {
      path: ["root"],
      definitionLookup: new Map(),
    });

    expect(normalized).toEqual(
      schemaUnknownNode({
        reason: "mixed-types-collapsed",
        evidence: {
          source: "parser-json",
          detail: "mixed kinds",
          observedKinds: ["number", "string"],
        },
      }),
    );
  });

  it("canonicalizes identifier words for documents, definitions, and fields", () => {
    const document: SchemaDocument = {
      version: "0.1",
      kind: "document",
      name: {
        source: "ExampleDocument",
        words: [" Example ", "DOCUMENT"],
      },
      definitions: [
        {
          name: {
            source: "UserProfile",
            words: [" USER ", "profile "],
          },
          type: {
            kind: "object",
            fields: [
              {
                kind: "field",
                name: {
                  source: "displayName",
                  words: [" DISPLAY ", "name "],
                },
                required: true,
                nullable: false,
                type: schemaScalarNode("string"),
              },
            ],
          },
        },
      ],
      root: {
        kind: "object",
        fields: [
          {
            kind: "field",
            name: {
              source: "userName",
              words: [" USER ", "name "],
            },
            required: true,
            nullable: false,
            type: schemaScalarNode("string"),
          },
        ],
      },
    };

    expect(normalizeSchemaDocument(document)).toEqual({
      ...document,
      name: {
        source: "ExampleDocument",
        words: ["example", "document"],
      },
      definitions: [
        {
          name: {
            source: "UserProfile",
            words: ["user", "profile"],
          },
          type: {
            kind: "object",
            fields: [
              {
                kind: "field",
                name: {
                  source: "displayName",
                  words: ["display", "name"],
                },
                required: true,
                nullable: false,
                type: schemaScalarNode("string"),
              },
            ],
          },
        },
      ],
      root: {
        kind: "object",
        fields: [
          {
            kind: "field",
            name: {
              source: "userName",
              words: ["user", "name"],
            },
            required: true,
            nullable: false,
            type: schemaScalarNode("string"),
          },
        ],
      },
    });
  });

  it("normalizes definitions and root through the document entry point", () => {
    const document = createUnnormalizedUnionDocument();

    expect(normalizeSchemaDocument(document)).toEqual(
      schemaDocument(
        "Example",
        schemaObjectNode([
          schemaFieldNode(
            "value",
            schemaUnionNode([
              schemaScalarNode("string"),
              schemaScalarNode("number"),
            ]),
          ),
        ]),
        {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode(
                  "id",
                  schemaUnionNode([
                    schemaScalarNode("string"),
                    schemaScalarNode("number"),
                  ]),
                ),
              ]),
            ),
          ],
        },
      ),
    );
  });

  it("can normalize only root-reachable definitions when following references", () => {
    const document = createReachableDefinitionNormalizationDocument();

    expect(
      normalizeSchemaDocumentFromRoot(document, { references: "follow" }),
    ).toEqual(
      schemaDocument(
        "Example",
        schemaObjectNode([
          schemaFieldNode("user", schemaReferenceNode("User")),
        ]),
        {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode(
                  "id",
                  schemaUnionNode([
                    schemaScalarNode("string"),
                    schemaScalarNode("number"),
                  ]),
                ),
                schemaFieldNode("address", schemaReferenceNode("Address")),
              ]),
            ),
            schemaDefinition(
              "Address",
              schemaObjectNode([
                schemaFieldNode(
                  "zip",
                  schemaUnionNode([
                    schemaScalarNode("string"),
                    schemaScalarNode("number"),
                  ]),
                ),
              ]),
            ),
            schemaDefinition(
              "Unused",
              schemaObjectNode([
                schemaFieldNode(
                  "count",
                  createUnnormalizedUnionNode(),
                ),
              ]),
            ),
          ],
        },
      ),
    );
  });

  it("can normalize only definitions", () => {
    const document = createUnnormalizedUnionDocument();
    const normalized = normalizeSchemaDefinitions(document);

    expect(normalized.root).toBe(document.root);
    expect(normalized.definitions[0]?.type).toEqual(
      schemaObjectNode([
        schemaFieldNode(
          "id",
          schemaUnionNode([
            schemaScalarNode("string"),
            schemaScalarNode("number"),
          ]),
        ),
      ]),
    );
  });
});

function createUnnormalizedUnionNode(): SchemaNode {
  return {
    kind: "union",
    members: [
      schemaScalarNode("string"),
      {
        kind: "union",
        members: [schemaScalarNode("number"), schemaScalarNode("string")],
      },
    ],
  };
}

function createUnnormalizedUnionDocument(): SchemaDocument {
  const base = schemaDocument(
    "Example",
    schemaObjectNode([schemaFieldNode("value", schemaScalarNode("string"))]),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
        ),
      ],
    },
  );

  return {
    ...base,
    definitions: [
      {
        ...base.definitions[0]!,
        type: schemaObjectNode([
          schemaFieldNode("id", createUnnormalizedUnionNode()),
        ]),
      },
    ],
    root: schemaObjectNode([
      schemaFieldNode("value", createUnnormalizedUnionNode()),
    ]),
  };
}

function createReachableDefinitionNormalizationDocument(): SchemaDocument {
  const base = schemaDocument(
    "Example",
    schemaObjectNode([schemaFieldNode("user", schemaReferenceNode("User"))]),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("string")),
            schemaFieldNode("address", schemaReferenceNode("Address")),
          ]),
        ),
        schemaDefinition(
          "Address",
          schemaObjectNode([schemaFieldNode("zip", schemaScalarNode("string"))]),
        ),
        schemaDefinition(
          "Unused",
          schemaObjectNode([
            schemaFieldNode("count", schemaScalarNode("string")),
          ]),
        ),
      ],
    },
  );

  return {
    ...base,
    definitions: [
      {
        ...base.definitions[0]!,
        type: schemaObjectNode([
          schemaFieldNode("id", createUnnormalizedUnionNode()),
          schemaFieldNode("address", schemaReferenceNode("Address")),
        ]),
      },
      {
        ...base.definitions[1]!,
        type: schemaObjectNode([
          schemaFieldNode("zip", createUnnormalizedUnionNode()),
        ]),
      },
      {
        ...base.definitions[2]!,
        type: schemaObjectNode([
          schemaFieldNode("count", createUnnormalizedUnionNode()),
        ]),
      },
    ],
  };
}
