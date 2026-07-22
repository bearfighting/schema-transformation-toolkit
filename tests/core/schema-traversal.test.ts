import { describe, expect, it } from "vitest";
import {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaRecordNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaTupleNode,
  tryValidateSchemaDocument,
  walkSchemaDocumentFromRoot,
  walkSchemaDocumentStructure,
  walkSchemaDocument,
} from "../../packages/core/src/index.js";
import { getSchemaNodeChildren } from "../../packages/core/src/schema/children.js";

describe("schema traversal", () => {
  it("walkSchemaDocumentStructure keeps the current definitions-plus-root traversal", () => {
    const document = schemaDocument("UserList", schemaReferenceNode("User"), {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
        ),
      ],
    });

    const visited: string[] = [];

    walkSchemaDocumentStructure(
      document,
      {
        enter(context) {
          visited.push(`${context.path.join(".")}::${context.node.kind}`);
        },
      },
      { references: "preserve" },
    );

    expect(visited).toEqual([
      "definitions.User::object",
      "definitions.User.id::scalar",
      "root::reference",
    ]);
  });

  it("walkSchemaDocumentFromRoot skips unreachable definitions", () => {
    const document = schemaDocument("Entry", schemaReferenceNode("User"), {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
        ),
        schemaDefinition(
          "Unused",
          schemaObjectNode([
            schemaFieldNode("code", schemaScalarNode("integer")),
          ]),
        ),
      ],
    });

    const visited: string[] = [];

    walkSchemaDocumentFromRoot(
      document,
      {
        enter(context) {
          visited.push(`${context.path.join(".")}::${context.node.kind}`);
        },
      },
      { references: "follow" },
    );

    expect(visited).toEqual([
      "root::reference",
      "root::object",
      "root.id::scalar",
    ]);
  });

  it("walks canonical logical paths in preserve mode", () => {
    const document = schemaDocument(
      "UserList",
      schemaTupleNode([
        schemaReferenceNode("User"),
        schemaArrayNode(schemaScalarNode("integer")),
      ]),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );

    const visits: Array<{
      kind: string;
      path: string[];
      via?: string;
    }> = [];

    walkSchemaDocument(
      document,
      {
        enter(context) {
          visits.push({
            kind: context.node.kind,
            path: context.path,
            ...(context.via ? { via: context.via.kind } : {}),
          });
        },
      },
      { references: "preserve" },
    );

    expect(visits).toEqual([
      {
        kind: "object",
        path: ["definitions", "User"],
        via: "definition",
      },
      {
        kind: "scalar",
        path: ["definitions", "User", "id"],
        via: "field",
      },
      {
        kind: "tuple",
        path: ["root"],
        via: "root",
      },
      {
        kind: "reference",
        path: ["root", "0"],
        via: "tupleElement",
      },
      {
        kind: "array",
        path: ["root", "1"],
        via: "tupleElement",
      },
      {
        kind: "scalar",
        path: ["root", "1", "elementType"],
        via: "elementType",
      },
    ]);
  });

  it("can follow references without rewriting the reference-site path", () => {
    const document = schemaDocument("Wrapper", schemaReferenceNode("User"), {
      definitions: [
        schemaDefinition(
          "User",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
        ),
      ],
    });

    const visits: Array<{
      kind: string;
      path: string[];
      via?: string;
      containingDefinition?: string;
    }> = [];

    walkSchemaDocument(
      document,
      {
        enter(context) {
          visits.push({
            kind: context.node.kind,
            path: context.path,
            ...(context.via ? { via: context.via.kind } : {}),
            ...(context.containingDefinition
              ? {
                  containingDefinition:
                    context.containingDefinition.name.source,
                }
              : {}),
          });
        },
      },
      { references: "follow" },
    );

    expect(visits).toEqual([
      {
        kind: "object",
        path: ["definitions", "User"],
        via: "definition",
        containingDefinition: "User",
      },
      {
        kind: "scalar",
        path: ["definitions", "User", "id"],
        via: "field",
        containingDefinition: "User",
      },
      {
        kind: "reference",
        path: ["root"],
        via: "root",
      },
      {
        kind: "object",
        path: ["root"],
        via: "referenceResolution",
        containingDefinition: "User",
      },
      {
        kind: "scalar",
        path: ["root", "id"],
        via: "field",
        containingDefinition: "User",
      },
    ]);
  });

  it("stops reference-follow expansion at cycles", () => {
    const document = schemaDocument("LoopStart", schemaReferenceNode("LoopA"), {
      definitions: [
        schemaDefinition(
          "LoopA",
          schemaObjectNode([
            schemaFieldNode("next", schemaReferenceNode("LoopB")),
          ]),
        ),
        schemaDefinition(
          "LoopB",
          schemaObjectNode([
            schemaFieldNode("next", schemaReferenceNode("LoopA")),
          ]),
        ),
      ],
    });

    const visits: Array<{
      kind: string;
      path: string[];
      via?: string;
      containingDefinition?: string;
    }> = [];

    walkSchemaDocument(
      document,
      {
        enter(context) {
          visits.push({
            kind: context.node.kind,
            path: context.path,
            ...(context.via ? { via: context.via.kind } : {}),
            ...(context.containingDefinition
              ? {
                  containingDefinition:
                    context.containingDefinition.name.source,
                }
              : {}),
          });
        },
      },
      { references: "follow" },
    );

    expect(visits).toEqual([
      {
        kind: "object",
        path: ["definitions", "LoopA"],
        via: "definition",
        containingDefinition: "LoopA",
      },
      {
        kind: "reference",
        path: ["definitions", "LoopA", "next"],
        via: "field",
        containingDefinition: "LoopA",
      },
      {
        kind: "object",
        path: ["definitions", "LoopA", "next"],
        via: "referenceResolution",
        containingDefinition: "LoopB",
      },
      {
        kind: "reference",
        path: ["definitions", "LoopA", "next", "next"],
        via: "field",
        containingDefinition: "LoopB",
      },
      {
        kind: "object",
        path: ["definitions", "LoopA", "next", "next"],
        via: "referenceResolution",
        containingDefinition: "LoopA",
      },
      {
        kind: "reference",
        path: ["definitions", "LoopA", "next", "next", "next"],
        via: "field",
        containingDefinition: "LoopA",
      },
      {
        kind: "object",
        path: ["definitions", "LoopB"],
        via: "definition",
        containingDefinition: "LoopB",
      },
      {
        kind: "reference",
        path: ["definitions", "LoopB", "next"],
        via: "field",
        containingDefinition: "LoopB",
      },
      {
        kind: "object",
        path: ["definitions", "LoopB", "next"],
        via: "referenceResolution",
        containingDefinition: "LoopA",
      },
      {
        kind: "reference",
        path: ["definitions", "LoopB", "next", "next"],
        via: "field",
        containingDefinition: "LoopA",
      },
      {
        kind: "object",
        path: ["definitions", "LoopB", "next", "next"],
        via: "referenceResolution",
        containingDefinition: "LoopB",
      },
      {
        kind: "reference",
        path: ["definitions", "LoopB", "next", "next", "next"],
        via: "field",
        containingDefinition: "LoopB",
      },
      {
        kind: "reference",
        path: ["root"],
        via: "root",
      },
      {
        kind: "object",
        path: ["root"],
        via: "referenceResolution",
        containingDefinition: "LoopA",
      },
      {
        kind: "reference",
        path: ["root", "next"],
        via: "field",
        containingDefinition: "LoopA",
      },
      {
        kind: "object",
        path: ["root", "next"],
        via: "referenceResolution",
        containingDefinition: "LoopB",
      },
      {
        kind: "reference",
        path: ["root", "next", "next"],
        via: "field",
        containingDefinition: "LoopB",
      },
    ]);
  });

  it("does not synthesize resolved nodes for unresolved references in follow mode", () => {
    const document = {
      version: "0.1" as const,
      kind: "document" as const,
      name: { source: "MissingReference", words: ["Missing", "Reference"] },
      definitions: [],
      root: schemaReferenceNode("User"),
    };

    const visits: Array<{
      kind: string;
      path: string[];
      via?: string;
      referenceResolution?: string;
    }> = [];

    walkSchemaDocument(
      document,
      {
        enter(context) {
          visits.push({
            kind: context.node.kind,
            path: context.path,
            ...(context.via ? { via: context.via.kind } : {}),
            ...(context.referenceResolution
              ? { referenceResolution: context.referenceResolution.status }
              : {}),
          });
        },
      },
      { references: "follow" },
    );

    expect(visits).toEqual([
      {
        kind: "reference",
        path: ["root"],
        via: "root",
        referenceResolution: "missing",
      },
    ]);
  });

  it("reports ambiguous references in follow mode without expanding them", () => {
    const document = {
      version: "0.1" as const,
      kind: "document" as const,
      name: { source: "AmbiguousReference", words: ["Ambiguous", "Reference"] },
      definitions: [
        schemaDefinition("User", schemaScalarNode("string")),
        schemaDefinition("User", schemaScalarNode("integer")),
      ],
      root: schemaReferenceNode("User"),
    };

    const visits: Array<{
      kind: string;
      path: string[];
      referenceResolution?: string;
    }> = [];

    walkSchemaDocumentFromRoot(
      document,
      {
        enter(context) {
          visits.push({
            kind: context.node.kind,
            path: context.path,
            ...(context.referenceResolution
              ? { referenceResolution: context.referenceResolution.status }
              : {}),
          });
        },
      },
      { references: "follow" },
    );

    expect(visits).toEqual([
      {
        kind: "reference",
        path: ["root"],
        referenceResolution: "ambiguous",
      },
    ]);
  });

  it("reports cycle status on references that stop expansion", () => {
    const document = schemaDocument("LoopStart", schemaReferenceNode("LoopA"), {
      definitions: [
        schemaDefinition(
          "LoopA",
          schemaObjectNode([
            schemaFieldNode("next", schemaReferenceNode("LoopB")),
          ]),
        ),
        schemaDefinition(
          "LoopB",
          schemaObjectNode([
            schemaFieldNode("next", schemaReferenceNode("LoopA")),
          ]),
        ),
      ],
    });

    const referenceVisits: Array<{
      path: string[];
      referenceResolution?: string;
    }> = [];

    walkSchemaDocumentFromRoot(
      document,
      {
        enter(context) {
          if (context.node.kind !== "reference") {
            return;
          }

          referenceVisits.push({
            path: context.path,
            ...(context.referenceResolution
              ? { referenceResolution: context.referenceResolution.status }
              : {}),
          });
        },
      },
      { references: "follow" },
    );

    expect(referenceVisits).toEqual([
      {
        path: ["root"],
        referenceResolution: "resolved",
      },
      {
        path: ["root", "next"],
        referenceResolution: "resolved",
      },
      {
        path: ["root", "next", "next"],
        referenceResolution: "cycle",
      },
    ]);
  });

  it("exposes structured via metadata for traversal edges", () => {
    const document = schemaDocument(
      "EdgeShapes",
      schemaTupleNode([
        schemaArrayNode(schemaScalarNode("string")),
        schemaRecordNode(
          schemaScalarNode("string"),
          schemaReferenceNode("User"),
        ),
      ]),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    const visits = new Map<
      string,
      {
        viaKind?: string;
        index?: number;
        fieldName?: string;
        definitionName?: string;
        referenceName?: string;
      }
    >();

    walkSchemaDocument(
      document,
      {
        enter(context) {
          const visit: {
            viaKind?: string;
            index?: number;
            fieldName?: string;
            definitionName?: string;
            referenceName?: string;
          } = {};

          switch (context.via?.kind) {
            case "definition":
              visit.viaKind = context.via.kind;
              visit.definitionName = context.via.definitionName;
              break;
            case "tupleElement":
            case "unionMember":
              visit.viaKind = context.via.kind;
              visit.index = context.via.index;
              break;
            case "field":
              visit.viaKind = context.via.kind;
              visit.fieldName = context.via.fieldName;
              break;
            case "referenceResolution":
              visit.viaKind = context.via.kind;
              visit.referenceName = context.via.referenceName;
              break;
            case "root":
            case "elementType":
            case "recordKey":
            case "recordValue":
              visit.viaKind = context.via.kind;
              break;
            default:
              break;
          }

          visits.set(`${context.path.join(".")}::${context.node.kind}`, visit);
        },
      },
      { references: "follow" },
    );

    expect(visits.get("definitions.User::object")).toEqual({
      viaKind: "definition",
      definitionName: "User",
    });
    expect(visits.get("definitions.User.id::scalar")).toEqual({
      viaKind: "field",
      fieldName: "id",
    });
    expect(visits.get("root::tuple")).toEqual({
      viaKind: "root",
    });
    expect(visits.get("root.0::array")).toEqual({
      viaKind: "tupleElement",
      index: 0,
    });
    expect(visits.get("root.0.elementType::scalar")).toEqual({
      viaKind: "elementType",
    });
    expect(visits.get("root.1::record")).toEqual({
      viaKind: "tupleElement",
      index: 1,
    });
    expect(visits.get("root.1.key::scalar")).toEqual({
      viaKind: "recordKey",
    });
    expect(visits.get("root.1.value::reference")).toEqual({
      viaKind: "recordValue",
    });
    expect(visits.get("root.1.value::object")).toEqual({
      viaKind: "referenceResolution",
      referenceName: "User",
    });
  });

  it("sets containingDefinition only for definition-owned traversal branches", () => {
    const document = schemaDocument(
      "ContainerScopes",
      schemaObjectNode([
        schemaFieldNode("profile", schemaReferenceNode("User")),
        schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
      ]),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );

    const visits = new Map<string, string | null>();

    walkSchemaDocument(
      document,
      {
        enter(context) {
          visits.set(
            `${context.path.join(".")}::${context.node.kind}`,
            context.containingDefinition?.name.source ?? null,
          );
        },
      },
      { references: "follow" },
    );

    expect(visits.get("definitions.User::object")).toBe("User");
    expect(visits.get("definitions.User.id::scalar")).toBe("User");
    expect(visits.get("root::object")).toBeNull();
    expect(visits.get("root.profile::reference")).toBeNull();
    expect(visits.get("root.profile::object")).toBe("User");
    expect(visits.get("root.profile.id::scalar")).toBe("User");
    expect(visits.get("root.tags::array")).toBeNull();
    expect(visits.get("root.tags.elementType::scalar")).toBeNull();
  });

  it("uses a stable shared child-enumeration order", () => {
    const tupleChildren = getSchemaNodeChildren(
      schemaTupleNode([
        schemaScalarNode("string"),
        schemaScalarNode("integer"),
      ]),
    );
    const recordChildren = getSchemaNodeChildren(
      schemaRecordNode(schemaScalarNode("string"), schemaReferenceNode("User")),
    );
    const objectChildren = getSchemaNodeChildren(
      schemaObjectNode([
        schemaFieldNode("name", schemaScalarNode("string")),
        schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
      ]),
    );
    const unionChildren = getSchemaNodeChildren({
      kind: "union",
      members: [schemaScalarNode("string"), schemaScalarNode("integer")],
    });

    expect(tupleChildren.map((child) => child.pathSegment)).toEqual(["0", "1"]);
    expect(tupleChildren.map((child) => child.via.kind)).toEqual([
      "tupleElement",
      "tupleElement",
    ]);

    expect(recordChildren.map((child) => child.pathSegment)).toEqual([
      "key",
      "value",
    ]);
    expect(recordChildren.map((child) => child.via.kind)).toEqual([
      "recordKey",
      "recordValue",
    ]);

    expect(objectChildren.map((child) => child.pathSegment)).toEqual([
      "name",
      "tags",
    ]);
    expect(objectChildren.map((child) => child.via.kind)).toEqual([
      "field",
      "field",
    ]);

    expect(unionChildren.map((child) => child.pathSegment)).toEqual(["0", "1"]);
    expect(unionChildren.map((child) => child.via.kind)).toEqual([
      "unionMember",
      "unionMember",
    ]);
  });

  it("uses canonical tuple and union-style member paths in schema validation", () => {
    const result = tryValidateSchemaDocument({
      version: "0.1",
      kind: "document",
      name: {
        source: "MissingNestedReference",
        words: ["Missing", "Nested", "Reference"],
      },
      definitions: [],
      root: schemaTupleNode([schemaReferenceNode("Account")]),
    });

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        {
          severity: "error",
          code: "unknown-reference",
          message:
            'Invalid schema document: reference "Account" does not match a known definition.',
          path: ["root", "0"],
          nodeKind: "reference",
          source: "core",
          evidence: {
            referenceName: "Account",
          },
        },
      ],
    });
  });
});
