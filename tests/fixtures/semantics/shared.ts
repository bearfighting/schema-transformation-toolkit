import {
  constraint,
  constraintDocument,
  constraintEntry,
  constraintTarget,
  schemaDocument,
  schemaDefinition,
  schemaLiteralNode,
  schemaFieldNode,
  schemaArrayNode,
  schemaNullNode,
  schemaReferenceNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaUnionNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnknownNode,
} from "@aio/core";
import type { SemanticFixture } from "./types.js";

export const primitiveStringFixture: SemanticFixture = {
  id: "primitive.string",
  description: "A plain string root shared across all current parser families.",
  canonicalShape: schemaDocument("PrimitiveString", schemaScalarNode("string")),
  sources: {
    json: {
      input: '"hello"',
      options: {
        name: "PrimitiveString",
      },
    },
    "json-schema": {
      input: {
        title: "PrimitiveString",
        type: "string",
      },
      options: {
        name: "PrimitiveString",
      },
    },
    typescript: {
      input: "type PrimitiveString = string;",
      options: {
        name: "PrimitiveString",
        entry: "PrimitiveString",
      },
    },
  },
  support: {
    json: "inferred",
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    json: ["value-ir", "shape-ir"],
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const requiredPropertyFixture: SemanticFixture = {
  id: "object.required-property",
  description: "An object with two required scalar properties.",
  canonicalShape: schemaDocument(
    "RequiredUser",
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("number")),
      schemaFieldNode("name", schemaScalarNode("string")),
    ]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "RequiredUser",
        type: "object",
        properties: {
          id: {
            type: "number",
          },
          name: {
            type: "string",
          },
        },
        required: ["id", "name"],
      },
      options: {
        name: "RequiredUser",
      },
    },
    typescript: {
      input: [
        "interface RequiredUser {",
        "  id: number;",
        "  name: string;",
        "}",
      ].join("\n"),
      options: {
        name: "RequiredUser",
        entry: "RequiredUser",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const integerPropertyFixture: SemanticFixture = {
  id: "object.integer-property",
  description:
    "An object with a required integer field that widens when rendered to TypeScript.",
  canonicalShape: schemaDocument(
    "IntegerUser",
    schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
  ),
  sources: {
    json: {
      input: '{"id":1}',
      options: {
        name: "IntegerUser",
      },
    },
    "json-schema": {
      input: {
        title: "IntegerUser",
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
        },
        required: ["id"],
      },
      options: {
        name: "IntegerUser",
      },
    },
  },
  support: {
    json: "inferred",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    json: ["value-ir", "shape-ir"],
    "json-schema": ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
  generatorExpectations: {
    "generator:typescript": {
      diagnosticCodes: ["integer-widened-to-number"],
      semanticNoteCodes: ["integer-widened-to-number"],
    },
  },
  conversionExpectations: {
    "json->typescript": {
      semanticCaveatCodes: ["integer-widened-to-number"],
    },
    "json-schema->typescript": {
      semanticCaveatCodes: ["integer-widened-to-number"],
    },
  },
};

export const stringArrayFixture: SemanticFixture = {
  id: "collection.array",
  description:
    "A homogeneous array of strings shared across all current parser families.",
  canonicalShape: schemaDocument(
    "Tags",
    schemaArrayNode(schemaScalarNode("string")),
  ),
  sources: {
    json: {
      input: '["alpha","beta"]',
      options: {
        name: "Tags",
      },
    },
    "json-schema": {
      input: {
        title: "Tags",
        type: "array",
        items: {
          type: "string",
        },
      },
      options: {
        name: "Tags",
      },
    },
    typescript: {
      input: "type Tags = string[];",
      options: {
        name: "Tags",
        entry: "Tags",
      },
    },
  },
  support: {
    json: "inferred",
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    json: ["value-ir", "shape-ir"],
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const optionalPropertyFixture: SemanticFixture = {
  id: "object.optional-property",
  description:
    "An object with one required property and one optional property.",
  canonicalShape: schemaDocument(
    "User",
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("number")),
      schemaFieldNode("name", schemaScalarNode("string"), {
        required: false,
      }),
    ]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "User",
        type: "object",
        properties: {
          id: {
            type: "number",
          },
          name: {
            type: "string",
          },
        },
        required: ["id"],
      },
      options: {
        name: "User",
      },
    },
    typescript: {
      input: [
        "interface User {",
        "  id: number;",
        "  name?: string;",
        "}",
      ].join("\n"),
      options: {
        name: "User",
        entry: "User",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const stringRecordFixture: SemanticFixture = {
  id: "collection.record",
  description: "A string-keyed record of booleans.",
  canonicalShape: schemaDocument(
    "Dictionary",
    schemaRecordNode(schemaScalarNode("string"), schemaScalarNode("boolean")),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "Dictionary",
        type: "object",
        additionalProperties: {
          type: "boolean",
        },
      },
      options: {
        name: "Dictionary",
      },
    },
    typescript: {
      input: "type Dictionary = Record<string, boolean>;",
      options: {
        name: "Dictionary",
        entry: "Dictionary",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const nullablePropertyFixture: SemanticFixture = {
  id: "object.nullable-property",
  description:
    "An object with one required scalar property and one required nullable property.",
  canonicalShape: schemaDocument(
    "NullableUser",
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("number")),
      schemaFieldNode("name", schemaScalarNode("string"), {
        nullable: true,
      }),
    ]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "NullableUser",
        type: "object",
        properties: {
          id: {
            type: "number",
          },
          name: {
            type: ["string", "null"],
          },
        },
        required: ["id", "name"],
      },
      options: {
        name: "NullableUser",
      },
    },
    typescript: {
      input: [
        "type NullableUser = {",
        "  id: number;",
        "  name: string | null;",
        "};",
      ].join("\n"),
      options: {
        name: "NullableUser",
        entry: "NullableUser",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const nestedObjectFixture: SemanticFixture = {
  id: "object.nested-object",
  description:
    "An object with a required nested object field that preserves inner required fields.",
  canonicalShape: schemaDocument(
    "NestedUser",
    schemaObjectNode([
      schemaFieldNode(
        "profile",
        schemaObjectNode([
          schemaFieldNode("displayName", schemaScalarNode("string")),
          schemaFieldNode("active", schemaScalarNode("boolean")),
        ]),
      ),
    ]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "NestedUser",
        type: "object",
        properties: {
          profile: {
            type: "object",
            properties: {
              displayName: {
                type: "string",
              },
              active: {
                type: "boolean",
              },
            },
            required: ["displayName", "active"],
          },
        },
        required: ["profile"],
      },
      options: {
        name: "NestedUser",
      },
    },
    typescript: {
      input: [
        "interface NestedUser {",
        "  profile: {",
        "    displayName: string;",
        "    active: boolean;",
        "  };",
        "}",
      ].join("\n"),
      options: {
        name: "NestedUser",
        entry: "NestedUser",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const optionalVsNullableFixture: SemanticFixture = {
  id: "union.optional-vs-nullable",
  description:
    "An object that keeps optional presence and required-nullable semantics distinct in the same shape.",
  canonicalShape: schemaDocument(
    "PresenceSemantics",
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("number")),
      schemaFieldNode("nickname", schemaScalarNode("string"), {
        required: false,
      }),
      schemaFieldNode("alias", schemaScalarNode("string"), {
        nullable: true,
      }),
    ]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "PresenceSemantics",
        type: "object",
        properties: {
          id: {
            type: "number",
          },
          nickname: {
            type: "string",
          },
          alias: {
            type: ["string", "null"],
          },
        },
        required: ["id", "alias"],
      },
      options: {
        name: "PresenceSemantics",
      },
    },
    typescript: {
      input: [
        "type PresenceSemantics = {",
        "  id: number;",
        "  nickname?: string;",
        "  alias: string | null;",
        "};",
      ].join("\n"),
      options: {
        name: "PresenceSemantics",
        entry: "PresenceSemantics",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const optionalTupleFixture: SemanticFixture = {
  id: "collection.optional-tuple-member",
  description:
    "A tuple with one required number element and one optional string element.",
  canonicalShape: schemaDocument(
    "Pair",
    schemaTupleNode([
      schemaTupleElement(schemaScalarNode("number")),
      schemaTupleElement(schemaScalarNode("string"), {
        required: false,
      }),
    ]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "Pair",
        type: "array",
        prefixItems: [{ type: "number" }, { type: "string" }],
        minItems: 1,
        items: false,
      },
      options: {
        name: "Pair",
      },
    },
    typescript: {
      input: "type Pair = [number, string?];",
      options: {
        name: "Pair",
        entry: "Pair",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const unknownRootFixture: SemanticFixture = {
  id: "primitive.unknown",
  description:
    "A root schema whose source semantics are wider than the shared IR can express precisely, so it normalizes to unknown.",
  canonicalShape: schemaDocument(
    "UnknownValue",
    schemaUnknownNode({
      reason: "no-evidence",
      nullable: false,
    }),
  ),
  sources: {
    "json-schema": {
      input: true,
      options: {
        name: "UnknownValue",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "normalized",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
  generatorExpectations: {
    "generator:json-schema": {
      diagnosticCodes: ["wide-unknown-schema"],
      semanticNoteCodes: ["wide-unknown-schema"],
    },
    "generator:typescript": {
      diagnosticCodes: ["wide-unknown-type"],
      semanticNoteCodes: ["wide-unknown-type"],
    },
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticCaveatCodes: ["wide-unknown-type"],
    },
  },
};

export const literalUnknownUnionFixture: SemanticFixture = {
  id: "union.literal-with-unknown",
  description:
    "A root union whose JSON Schema source combines a narrow literal branch with a wide unknown branch.",
  canonicalShape: schemaDocument(
    "WideValues",
    schemaUnionNode([
      schemaLiteralNode("open"),
      schemaUnknownNode({
        reason: "no-evidence",
        nullable: false,
      }),
    ]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "WideValues",
        anyOf: [{ const: "open" }, true],
      },
      options: {
        name: "WideValues",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "normalized",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
  generatorExpectations: {
    "generator:typescript": {
      diagnosticCodes: [
        "unknown-union-member-absorbs-union",
        "wide-unknown-type",
      ],
      semanticNoteCodes: [
        "unknown-union-member-absorbs-union",
        "wide-unknown-type",
      ],
    },
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticCaveatCodes: [
        "unknown-union-member-absorbs-union",
        "wide-unknown-type",
      ],
    },
  },
};

export const localReferenceFixture: SemanticFixture = {
  id: "reference.local-reference",
  description:
    "A reachable local definition graph where the root object reuses another named local definition by reference.",
  canonicalShape: schemaDocument(
    "ResponseDocument",
    schemaReferenceNode("Response"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("number"))]),
        ),
        schemaDefinition(
          "Response",
          schemaObjectNode([
            schemaFieldNode("user", schemaReferenceNode("User")),
          ]),
        ),
      ],
    },
  ),
  sources: {
    "json-schema": {
      input: {
        title: "ResponseDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
            },
            required: ["id"],
          },
          Response: {
            type: "object",
            properties: {
              user: {
                $ref: "#/$defs/User",
              },
            },
            required: ["user"],
          },
        },
        $ref: "#/$defs/Response",
      },
      options: {
        name: "ResponseDocument",
      },
    },
    typescript: {
      input: [
        "type User = { id: number };",
        "type Response = { user: User };",
      ].join("\n"),
      options: {
        name: "ResponseDocument",
        entry: "Response",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const primitiveUnionFixture: SemanticFixture = {
  id: "union.primitive-union",
  description: "A root union of primitive string and number semantics.",
  canonicalShape: schemaDocument(
    "Value",
    schemaUnionNode([schemaScalarNode("string"), schemaScalarNode("number")]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "Value",
        oneOf: [{ type: "string" }, { type: "number" }],
      },
      options: {
        name: "Value",
      },
    },
    typescript: {
      input: "type Value = string | number;",
      options: {
        name: "Value",
        entry: "Value",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const literalUnionFixture: SemanticFixture = {
  id: "union.literal-union",
  description: "A root literal union shared across TypeScript and JSON Schema.",
  canonicalShape: schemaDocument(
    "Status",
    schemaUnionNode([schemaLiteralNode("open"), schemaLiteralNode("closed")]),
  ),
  sources: {
    "json-schema": {
      input: {
        title: "Status",
        oneOf: [{ const: "open" }, { const: "closed" }],
      },
      options: {
        name: "Status",
      },
    },
    typescript: {
      input: 'type Status = "open" | "closed";',
      options: {
        name: "Status",
        entry: "Status",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const sharedReferenceFixture: SemanticFixture = {
  id: "reference.shared-reference",
  description:
    "A root object that reuses the same named local definition through multiple fields.",
  canonicalShape: schemaDocument(
    "AuditEnvelopeDocument",
    schemaReferenceNode("AuditEnvelope"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("number"))]),
        ),
        schemaDefinition(
          "AuditEnvelope",
          schemaObjectNode([
            schemaFieldNode("actor", schemaReferenceNode("User")),
            schemaFieldNode("subject", schemaReferenceNode("User")),
          ]),
        ),
      ],
    },
  ),
  sources: {
    "json-schema": {
      input: {
        title: "AuditEnvelopeDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
            },
            required: ["id"],
          },
          AuditEnvelope: {
            type: "object",
            properties: {
              actor: {
                $ref: "#/$defs/User",
              },
              subject: {
                $ref: "#/$defs/User",
              },
            },
            required: ["actor", "subject"],
          },
        },
        $ref: "#/$defs/AuditEnvelope",
      },
      options: {
        name: "AuditEnvelopeDocument",
      },
    },
    typescript: {
      input: [
        "type User = { id: number };",
        "type AuditEnvelope = { actor: User; subject: User };",
      ].join("\n"),
      options: {
        name: "AuditEnvelopeDocument",
        entry: "AuditEnvelope",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const recursiveReferenceFixture: SemanticFixture = {
  id: "reference.recursive-reference",
  description:
    "A named root definition that recursively references itself through an array field.",
  canonicalShape: schemaDocument("TreeDocument", schemaReferenceNode("Tree"), {
    definitions: [
      schemaDefinition(
        "Tree",
        schemaObjectNode([
          schemaFieldNode("value", schemaScalarNode("number")),
          schemaFieldNode(
            "children",
            schemaArrayNode(schemaReferenceNode("Tree")),
          ),
        ]),
      ),
    ],
  }),
  sources: {
    "json-schema": {
      input: {
        title: "TreeDocument",
        $defs: {
          Tree: {
            type: "object",
            properties: {
              value: {
                type: "number",
              },
              children: {
                type: "array",
                items: {
                  $ref: "#/$defs/Tree",
                },
              },
            },
            required: ["value", "children"],
          },
        },
        $ref: "#/$defs/Tree",
      },
      options: {
        name: "TreeDocument",
      },
    },
    typescript: {
      input: "type Tree = { value: number; children: Tree[] };",
      options: {
        name: "TreeDocument",
        entry: "Tree",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const recordArrayReferenceUnionFixture: SemanticFixture = {
  id: "collection.record-array-reference-union",
  description:
    "A reusable response definition whose record field maps to arrays of referenced-or-null users.",
  canonicalShape: schemaDocument(
    "GroupedUsersDocument",
    schemaReferenceNode("GroupedUsers"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("number")),
            schemaFieldNode("name", schemaScalarNode("string")),
          ]),
        ),
        schemaDefinition(
          "GroupedUsers",
          schemaObjectNode([
            schemaFieldNode(
              "grouped",
              schemaRecordNode(
                schemaScalarNode("string"),
                schemaArrayNode(
                  schemaUnionNode([
                    schemaReferenceNode("User"),
                    schemaNullNode(),
                  ]),
                ),
              ),
            ),
          ]),
        ),
      ],
    },
  ),
  sources: {
    "json-schema": {
      input: {
        title: "GroupedUsersDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
              name: {
                type: "string",
              },
            },
            required: ["id", "name"],
          },
          GroupedUsers: {
            type: "object",
            properties: {
              grouped: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  items: {
                    oneOf: [{ $ref: "#/$defs/User" }, { type: "null" }],
                  },
                },
              },
            },
            required: ["grouped"],
          },
        },
        $ref: "#/$defs/GroupedUsers",
      },
      options: {
        name: "GroupedUsersDocument",
      },
    },
    typescript: {
      input: [
        "type User = { id: number; name: string };",
        "type GroupedUsers = { grouped: Record<string, Array<User | null>> };",
      ].join("\n"),
      options: {
        name: "GroupedUsersDocument",
        entry: "GroupedUsers",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const tupleNullableReferenceFixture: SemanticFixture = {
  id: "collection.tuple-nullable-reference",
  description:
    "An object field whose tuple combines a reusable reference and a nullable scalar member.",
  canonicalShape: schemaDocument(
    "TupleEnvelopeDocument",
    schemaReferenceNode("TupleEnvelope"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("number"))]),
        ),
        schemaDefinition(
          "TupleEnvelope",
          schemaObjectNode([
            schemaFieldNode(
              "pair",
              schemaTupleNode([
                schemaTupleElement(schemaReferenceNode("User")),
                schemaTupleElement(
                  schemaUnionNode([
                    schemaScalarNode("string"),
                    schemaNullNode(),
                  ]),
                ),
              ]),
            ),
          ]),
        ),
      ],
    },
  ),
  sources: {
    "json-schema": {
      input: {
        title: "TupleEnvelopeDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
            },
            required: ["id"],
          },
          TupleEnvelope: {
            type: "object",
            properties: {
              pair: {
                type: "array",
                prefixItems: [
                  { $ref: "#/$defs/User" },
                  { type: ["string", "null"] },
                ],
                minItems: 2,
                items: false,
              },
            },
            required: ["pair"],
          },
        },
        $ref: "#/$defs/TupleEnvelope",
      },
      options: {
        name: "TupleEnvelopeDocument",
      },
    },
    typescript: {
      input: [
        "type User = { id: number };",
        "type TupleEnvelope = { pair: [User, string | null] };",
      ].join("\n"),
      options: {
        name: "TupleEnvelopeDocument",
        entry: "TupleEnvelope",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const multiLevelDefinitionGraphFixture: SemanticFixture = {
  id: "reference.multi-level-definition-graph",
  description:
    "A multi-level reusable definition graph with transitive references, arrays, and nested object definitions rooted through a top-level ref.",
  canonicalShape: schemaDocument(
    "UserConnectionDocument",
    schemaReferenceNode("UserConnection"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("number")),
            schemaFieldNode("email", schemaScalarNode("string")),
          ]),
        ),
        schemaDefinition(
          "Audit",
          schemaObjectNode([
            schemaFieldNode("at", schemaScalarNode("string")),
            schemaFieldNode("actor", schemaReferenceNode("User")),
          ]),
        ),
        schemaDefinition(
          "UserEdge",
          schemaObjectNode([
            schemaFieldNode("node", schemaReferenceNode("User")),
            schemaFieldNode("audit", schemaReferenceNode("Audit")),
          ]),
        ),
        schemaDefinition(
          "PageInfo",
          schemaObjectNode([
            schemaFieldNode("hasMore", schemaScalarNode("boolean")),
            schemaFieldNode("cursor", schemaScalarNode("string"), {
              required: false,
              nullable: true,
            }),
          ]),
        ),
        schemaDefinition(
          "UserConnection",
          schemaObjectNode([
            schemaFieldNode(
              "edges",
              schemaArrayNode(schemaReferenceNode("UserEdge")),
            ),
            schemaFieldNode("pageInfo", schemaReferenceNode("PageInfo")),
          ]),
        ),
      ],
    },
  ),
  sources: {
    "json-schema": {
      input: {
        title: "UserConnectionDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
              email: {
                type: "string",
              },
            },
            required: ["id", "email"],
          },
          Audit: {
            type: "object",
            properties: {
              at: {
                type: "string",
              },
              actor: {
                $ref: "#/$defs/User",
              },
            },
            required: ["at", "actor"],
          },
          UserEdge: {
            type: "object",
            properties: {
              node: {
                $ref: "#/$defs/User",
              },
              audit: {
                $ref: "#/$defs/Audit",
              },
            },
            required: ["node", "audit"],
          },
          PageInfo: {
            type: "object",
            properties: {
              hasMore: {
                type: "boolean",
              },
              cursor: {
                type: ["string", "null"],
              },
            },
            required: ["hasMore"],
          },
          UserConnection: {
            type: "object",
            properties: {
              edges: {
                type: "array",
                items: {
                  $ref: "#/$defs/UserEdge",
                },
              },
              pageInfo: {
                $ref: "#/$defs/PageInfo",
              },
            },
            required: ["edges", "pageInfo"],
          },
        },
        $ref: "#/$defs/UserConnection",
      },
      options: {
        name: "UserConnectionDocument",
      },
    },
    typescript: {
      input: [
        "type User = { id: number; email: string };",
        "type Audit = { at: string; actor: User };",
        "type UserEdge = { node: User; audit: Audit };",
        "type PageInfo = { hasMore: boolean; cursor?: string | null };",
        "type UserConnection = { edges: UserEdge[]; pageInfo: PageInfo };",
      ].join("\n"),
      options: {
        name: "UserConnectionDocument",
        entry: "UserConnection",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const recordTupleReferenceFixture: SemanticFixture = {
  id: "collection.record-tuple-reference",
  description:
    "An object whose record field maps to fixed two-element tuples containing a reusable reference and a boolean flag.",
  canonicalShape: schemaDocument(
    "GroupedPairsDocument",
    schemaReferenceNode("GroupedPairs"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("number"))]),
        ),
        schemaDefinition(
          "GroupedPairs",
          schemaObjectNode([
            schemaFieldNode(
              "grouped",
              schemaRecordNode(
                schemaScalarNode("string"),
                schemaTupleNode([
                  schemaTupleElement(schemaReferenceNode("User")),
                  schemaTupleElement(schemaScalarNode("boolean")),
                ]),
              ),
            ),
          ]),
        ),
      ],
    },
  ),
  sources: {
    "json-schema": {
      input: {
        title: "GroupedPairsDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
            },
            required: ["id"],
          },
          GroupedPairs: {
            type: "object",
            properties: {
              grouped: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  prefixItems: [{ $ref: "#/$defs/User" }, { type: "boolean" }],
                  minItems: 2,
                  items: false,
                },
              },
            },
            required: ["grouped"],
          },
        },
        $ref: "#/$defs/GroupedPairs",
      },
      options: {
        name: "GroupedPairsDocument",
      },
    },
    typescript: {
      input: [
        "type User = { id: number };",
        "type GroupedPairs = { grouped: Record<string, [User, boolean]> };",
      ].join("\n"),
      options: {
        name: "GroupedPairsDocument",
        entry: "GroupedPairs",
      },
    },
  },
  support: {
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const paginatedResponseFixture: SemanticFixture = {
  id: "reference.paginated-response",
  description:
    "A paginated API response shape with reusable user, status, and pagination definitions rooted through a top-level reference.",
  canonicalShape: schemaDocument(
    "UserPageDocument",
    schemaReferenceNode("UserPage"),
    {
      definitions: [
        schemaDefinition(
          "Status",
          schemaUnionNode([
            schemaLiteralNode("active"),
            schemaLiteralNode("disabled"),
          ]),
        ),
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("number")),
            schemaFieldNode("email", schemaScalarNode("string")),
            schemaFieldNode("status", schemaReferenceNode("Status")),
          ]),
        ),
        schemaDefinition(
          "Pagination",
          schemaObjectNode([
            schemaFieldNode("cursor", schemaScalarNode("string"), {
              required: false,
              nullable: true,
            }),
            schemaFieldNode("hasMore", schemaScalarNode("boolean")),
          ]),
        ),
        schemaDefinition(
          "UserPage",
          schemaObjectNode([
            schemaFieldNode(
              "items",
              schemaArrayNode(schemaReferenceNode("User")),
            ),
            schemaFieldNode("pagination", schemaReferenceNode("Pagination")),
          ]),
        ),
      ],
    },
  ),
  sources: {
    "json-schema": {
      input: {
        title: "UserPageDocument",
        $defs: {
          Status: {
            oneOf: [{ const: "active" }, { const: "disabled" }],
          },
          User: {
            type: "object",
            properties: {
              id: { type: "number" },
              email: { type: "string" },
              status: { $ref: "#/$defs/Status" },
            },
            required: ["id", "email", "status"],
          },
          Pagination: {
            type: "object",
            properties: {
              cursor: { type: ["string", "null"] },
              hasMore: { type: "boolean" },
            },
            required: ["hasMore"],
          },
          UserPage: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/$defs/User" },
              },
              pagination: { $ref: "#/$defs/Pagination" },
            },
            required: ["items", "pagination"],
          },
        },
        $ref: "#/$defs/UserPage",
      },
      options: {
        name: "UserPageDocument",
      },
    },
    typescript: {
      input: [
        'type Status = "active" | "disabled";',
        "type User = { id: number; email: string; status: Status };",
        "type Pagination = { cursor?: string | null; hasMore: boolean };",
        "type UserPage = { items: User[]; pagination: Pagination };",
      ].join("\n"),
      options: {
        name: "UserPageDocument",
        entry: "UserPage",
      },
    },
  },
  support: {
    "json-schema": "normalized",
    typescript: "exact",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const configLikeFixture: SemanticFixture = {
  id: "object.config-like",
  description:
    "A config-style document with nested compiler options and include or exclude string arrays.",
  canonicalShape: schemaDocument(
    "TsconfigLike",
    schemaObjectNode([
      schemaFieldNode(
        "compilerOptions",
        schemaObjectNode([
          schemaFieldNode("strict", schemaScalarNode("boolean")),
          schemaFieldNode("target", schemaScalarNode("string")),
          schemaFieldNode("module", schemaScalarNode("string")),
        ]),
      ),
      schemaFieldNode("include", schemaArrayNode(schemaScalarNode("string"))),
      schemaFieldNode("exclude", schemaArrayNode(schemaScalarNode("string"))),
    ]),
  ),
  sources: {
    json: {
      input: JSON.stringify({
        compilerOptions: {
          strict: true,
          target: "ES2022",
          module: "NodeNext",
        },
        include: ["src/**/*.ts", "tests/**/*.ts"],
        exclude: ["dist", "coverage"],
      }),
      options: {
        name: "TsconfigLike",
      },
    },
    "json-schema": {
      input: {
        title: "TsconfigLike",
        type: "object",
        properties: {
          compilerOptions: {
            type: "object",
            properties: {
              strict: { type: "boolean" },
              target: { type: "string" },
              module: { type: "string" },
            },
            required: ["strict", "target", "module"],
          },
          include: {
            type: "array",
            items: { type: "string" },
          },
          exclude: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["compilerOptions", "include", "exclude"],
      },
      options: {
        name: "TsconfigLike",
      },
    },
    typescript: {
      input: [
        "type TsconfigLike = {",
        "  compilerOptions: {",
        "    strict: boolean;",
        "    target: string;",
        "    module: string;",
        "  };",
        "  include: string[];",
        "  exclude: string[];",
        "};",
      ].join("\n"),
      options: {
        name: "TsconfigLike",
        entry: "TsconfigLike",
      },
    },
  },
  support: {
    json: "inferred",
    "json-schema": "exact",
    typescript: "exact",
  },
  capabilityCoverage: {
    json: ["value-ir", "shape-ir"],
    "json-schema": ["shape-ir"],
    typescript: ["shape-ir"],
    "generator:json-schema": ["shape-ir"],
    "generator:typescript": ["shape-ir"],
  },
};

export const referencedMinLengthConstraintFixture: SemanticFixture = {
  id: "reference.constraint-min-length",
  description:
    "A reusable referenced definition whose string field preserves a minLength constraint through a local reference graph.",
  canonicalShape: schemaDocument(
    "ConstrainedResponseDocument",
    schemaReferenceNode("Response"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("code", schemaScalarNode("string")),
          ]),
        ),
        schemaDefinition(
          "Response",
          schemaObjectNode([
            schemaFieldNode("user", schemaReferenceNode("User")),
          ]),
        ),
      ],
    },
  ),
  canonicalConstraints: constraintDocument("ConstrainedResponseDocument", [
    constraintEntry(constraintTarget("node", ["definitions", "User", "code"]), [
      constraint("min-length", {
        value: 2,
        message:
          'This JSON Schema "minLength" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "minLength",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "ConstrainedResponseDocument",
        $defs: {
          User: {
            type: "object",
            properties: {
              code: {
                type: "string",
                minLength: 2,
              },
            },
            required: ["code"],
          },
          Response: {
            type: "object",
            properties: {
              user: {
                $ref: "#/$defs/User",
              },
            },
            required: ["user"],
          },
        },
        $ref: "#/$defs/Response",
      },
      options: {
        name: "ConstrainedResponseDocument",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir", "constraint-ir", "string-constraints"],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "string-constraints",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "string-constraints",
          sourcePath: ["definitions", "User", "code"],
        },
      ],
    },
  },
};

export const referencedDescriptionAnnotationFixture: SemanticFixture = {
  id: "reference.annotation-description",
  description:
    "A reusable referenced definition whose object and field descriptions are preserved through a local reference graph.",
  canonicalShape: schemaDocument(
    "DescribedResponseDocument",
    schemaReferenceNode("Response"),
    {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([
            schemaFieldNode("code", schemaScalarNode("string")),
          ]),
        ),
        schemaDefinition(
          "Response",
          schemaObjectNode([
            schemaFieldNode("user", schemaReferenceNode("User")),
          ]),
        ),
      ],
    },
  ),
  canonicalConstraints: constraintDocument("DescribedResponseDocument", [
    constraintEntry(constraintTarget("node", ["definitions", "User"]), [
      constraint("description", {
        value: "Reusable user definition",
        message:
          'This JSON Schema "description" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "description",
        },
      }),
    ]),
    constraintEntry(constraintTarget("node", ["definitions", "User", "code"]), [
      constraint("description", {
        value: "User code",
        message:
          'This JSON Schema "description" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "description",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "DescribedResponseDocument",
        $defs: {
          User: {
            type: "object",
            description: "Reusable user definition",
            properties: {
              code: {
                type: "string",
                description: "User code",
              },
            },
            required: ["code"],
          },
          Response: {
            type: "object",
            properties: {
              user: {
                $ref: "#/$defs/User",
              },
            },
            required: ["user"],
          },
        },
        $ref: "#/$defs/Response",
      },
      options: {
        name: "DescribedResponseDocument",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir", "constraint-ir", "portable-annotations"],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "portable-annotations",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "portable-annotations",
          sourcePath: ["definitions", "User"],
        },
        {
          lostCapability: "portable-annotations",
          sourcePath: ["definitions", "User", "code"],
        },
      ],
    },
  },
};

export const stringAnnotationBundleFixture: SemanticFixture = {
  id: "constraint.annotation-string-bundle",
  description:
    "A JSON Schema object whose string field carries multiple string constraints and portable annotations together.",
  canonicalShape: schemaDocument(
    "AnnotatedCode",
    schemaObjectNode([
      schemaFieldNode("code", schemaScalarNode("string"), {
        required: false,
      }),
    ]),
  ),
  canonicalConstraints: constraintDocument("AnnotatedCode", [
    constraintEntry(constraintTarget("node", ["root", "code"]), [
      constraint("pattern", {
        value: "^[A-Z]+$",
        message:
          'This JSON Schema "pattern" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "pattern",
        },
      }),
      constraint("max-length", {
        value: 8,
        message:
          'This JSON Schema "maxLength" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "maxLength",
        },
      }),
      constraint("default", {
        value: "ABCD",
        message:
          'This JSON Schema "default" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "default",
        },
      }),
      constraint("examples", {
        value: ["EFGH"],
        message:
          'This JSON Schema "examples" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "examples",
        },
      }),
      constraint("read-only", {
        value: true,
        message:
          'This JSON Schema "readOnly" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "readOnly",
        },
      }),
      constraint("description", {
        value: "Uppercase code",
        message:
          'This JSON Schema "description" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "description",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "AnnotatedCode",
        type: "object",
        properties: {
          code: {
            type: "string",
            pattern: "^[A-Z]+$",
            maxLength: 8,
            default: "ABCD",
            examples: ["EFGH"],
            readOnly: true,
            description: "Uppercase code",
          },
        },
      },
      options: {
        name: "AnnotatedCode",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": [
      "shape-ir",
      "constraint-ir",
      "string-constraints",
      "portable-annotations",
    ],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "string-constraints",
      "portable-annotations",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "string-constraints",
          sourcePath: ["root", "code"],
        },
        {
          lostCapability: "portable-annotations",
          sourcePath: ["root", "code"],
        },
      ],
    },
  },
};

export const collectionConstraintBundleFixture: SemanticFixture = {
  id: "constraint.collection-bundle",
  description:
    "A JSON Schema object whose array field carries multiple collection constraints and a description together.",
  canonicalShape: schemaDocument(
    "TaggedUsers",
    schemaObjectNode([
      schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string")), {
        required: false,
      }),
    ]),
  ),
  canonicalConstraints: constraintDocument("TaggedUsers", [
    constraintEntry(constraintTarget("node", ["root", "tags"]), [
      constraint("min-items", {
        value: 1,
        message:
          'This JSON Schema "minItems" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "minItems",
        },
      }),
      constraint("max-items", {
        value: 3,
        message:
          'This JSON Schema "maxItems" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "maxItems",
        },
      }),
      constraint("unique-items", {
        value: true,
        message:
          'This JSON Schema "uniqueItems" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "uniqueItems",
        },
      }),
      constraint("description", {
        value: "User tags",
        message:
          'This JSON Schema "description" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "description",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "TaggedUsers",
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            minItems: 1,
            maxItems: 3,
            uniqueItems: true,
            description: "User tags",
          },
        },
      },
      options: {
        name: "TaggedUsers",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": [
      "shape-ir",
      "constraint-ir",
      "collection-constraints",
      "portable-annotations",
    ],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "collection-constraints",
      "portable-annotations",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "collection-constraints",
          sourcePath: ["root", "tags"],
        },
        {
          lostCapability: "portable-annotations",
          sourcePath: ["root", "tags"],
        },
      ],
    },
  },
};

export const stringMinLengthConstraintFixture: SemanticFixture = {
  id: "constraint.string-min-length",
  description:
    "A JSON Schema object whose string field carries a preserved minLength constraint.",
  canonicalShape: schemaDocument(
    "ConstrainedCode",
    schemaObjectNode([
      schemaFieldNode("code", schemaScalarNode("string"), {
        required: false,
      }),
    ]),
  ),
  canonicalConstraints: constraintDocument("ConstrainedCode", [
    constraintEntry(constraintTarget("node", ["root", "code"]), [
      constraint("min-length", {
        value: 2,
        message:
          'This JSON Schema "minLength" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "minLength",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "ConstrainedCode",
        type: "object",
        properties: {
          code: {
            type: "string",
            minLength: 2,
          },
        },
      },
      options: {
        name: "ConstrainedCode",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir", "constraint-ir", "string-constraints"],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "string-constraints",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "string-constraints",
          sourcePath: ["root", "code"],
        },
      ],
    },
  },
};

export const closedObjectConstraintFixture: SemanticFixture = {
  id: "constraint.closed-object",
  description:
    "A JSON Schema object whose additionalProperties: false rule is preserved in constraint IR.",
  canonicalShape: schemaDocument(
    "ClosedUser",
    schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
  ),
  canonicalConstraints: constraintDocument("ClosedUser", [
    constraintEntry(constraintTarget("node", ["root"]), [
      constraint("closed-object", {
        value: false,
        message:
          'This JSON Schema "additionalProperties: false" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "additionalProperties",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "ClosedUser",
        type: "object",
        properties: {
          id: {
            type: "string",
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      options: {
        name: "ClosedUser",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir", "constraint-ir", "object-constraints"],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "object-constraints",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "object-constraints",
          sourcePath: ["root"],
        },
      ],
    },
  },
};

export const descriptionAnnotationFixture: SemanticFixture = {
  id: "annotation.description",
  description:
    "A JSON Schema object whose description annotation is preserved in constraint IR.",
  canonicalShape: schemaDocument(
    "DescribedUser",
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("string"), {
        required: false,
      }),
    ]),
  ),
  canonicalConstraints: constraintDocument("DescribedUser", [
    constraintEntry(constraintTarget("node", ["root"]), [
      constraint("description", {
        value: "User constraints",
        message:
          'This JSON Schema "description" annotation was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "description",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "DescribedUser",
        type: "object",
        description: "User constraints",
        properties: {
          id: {
            type: "string",
          },
        },
      },
      options: {
        name: "DescribedUser",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir", "constraint-ir", "portable-annotations"],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "portable-annotations",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "portable-annotations",
          sourcePath: ["root"],
        },
      ],
    },
  },
};

export const numericMinimumConstraintFixture: SemanticFixture = {
  id: "constraint.numeric-minimum",
  description:
    "A JSON Schema object whose numeric field carries a preserved minimum constraint.",
  canonicalShape: schemaDocument(
    "MinimumScore",
    schemaObjectNode([
      schemaFieldNode("score", schemaScalarNode("number"), {
        required: false,
      }),
    ]),
  ),
  canonicalConstraints: constraintDocument("MinimumScore", [
    constraintEntry(constraintTarget("node", ["root", "score"]), [
      constraint("minimum", {
        value: 0,
        message:
          'This JSON Schema "minimum" rule was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "minimum",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "MinimumScore",
        type: "object",
        properties: {
          score: {
            type: "number",
            minimum: 0,
          },
        },
      },
      options: {
        name: "MinimumScore",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir", "constraint-ir", "numeric-constraints"],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "numeric-constraints",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "numeric-constraints",
          sourcePath: ["root", "score"],
        },
      ],
    },
  },
};

export const arrayMinItemsConstraintFixture: SemanticFixture = {
  id: "constraint.array-min-items",
  description:
    "A JSON Schema object whose array field carries a preserved minItems constraint.",
  canonicalShape: schemaDocument(
    "TaggedItems",
    schemaObjectNode([
      schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string")), {
        required: false,
      }),
    ]),
  ),
  canonicalConstraints: constraintDocument("TaggedItems", [
    constraintEntry(constraintTarget("node", ["root", "tags"]), [
      constraint("min-items", {
        value: 1,
        message:
          'This JSON Schema "minItems" constraint was preserved in constraint IR.',
        evidence: {
          sourceKeyword: "minItems",
        },
      }),
    ]),
  ]),
  sources: {
    "json-schema": {
      input: {
        title: "TaggedItems",
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            minItems: 1,
          },
        },
      },
      options: {
        name: "TaggedItems",
      },
    },
  },
  support: {
    json: "not-applicable",
    "json-schema": "exact",
    typescript: "unsupported",
  },
  capabilityCoverage: {
    "json-schema": ["shape-ir", "constraint-ir", "collection-constraints"],
    "generator:json-schema": [
      "shape-ir",
      "constraint-ir",
      "collection-constraints",
    ],
  },
  conversionExpectations: {
    "json-schema->typescript": {
      semanticLosses: [
        {
          lostCapability: "collection-constraints",
          sourcePath: ["root", "tags"],
        },
      ],
    },
  },
};

export const sharedSemanticFixtures: SemanticFixture[] = [
  primitiveStringFixture,
  requiredPropertyFixture,
  integerPropertyFixture,
  stringArrayFixture,
  optionalPropertyFixture,
  stringRecordFixture,
  nullablePropertyFixture,
  nestedObjectFixture,
  optionalVsNullableFixture,
  optionalTupleFixture,
  unknownRootFixture,
  literalUnknownUnionFixture,
  localReferenceFixture,
  primitiveUnionFixture,
  literalUnionFixture,
  sharedReferenceFixture,
  recursiveReferenceFixture,
  recordArrayReferenceUnionFixture,
  tupleNullableReferenceFixture,
  multiLevelDefinitionGraphFixture,
  recordTupleReferenceFixture,
  paginatedResponseFixture,
  configLikeFixture,
  referencedMinLengthConstraintFixture,
  referencedDescriptionAnnotationFixture,
  stringAnnotationBundleFixture,
  collectionConstraintBundleFixture,
  stringMinLengthConstraintFixture,
  closedObjectConstraintFixture,
  descriptionAnnotationFixture,
  numericMinimumConstraintFixture,
  arrayMinItemsConstraintFixture,
];
