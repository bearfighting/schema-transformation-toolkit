import { describe, expect, it } from "vitest";
import {
  schemaPathSegmentToDiagnosticToken,
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

    walkSchemaDocumentFromRoot(
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

  it("distinguishes lexicalDefinition from containingDefinition across reference follow", () => {
    const document = schemaDocument(
      "LexicalContext",
      schemaReferenceNode("Order"),
      {
        definitions: [
          schemaDefinition(
            "Order",
            schemaObjectNode([
              schemaFieldNode("customer", schemaReferenceNode("User")),
            ]),
          ),
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("string")),
            ]),
          ),
        ],
      },
    );

    const visits = new Map<
      string,
      {
        lexicalDefinition?: string;
        containingDefinition?: string;
        referenceStackDepth: number;
      }
    >();

    walkSchemaDocument(
      document,
      {
        enter(context) {
          visits.set(`${context.path.join(".")}::${context.node.kind}`, {
            ...(context.lexicalDefinition
              ? { lexicalDefinition: context.lexicalDefinition.name.source }
              : {}),
            ...(context.containingDefinition
              ? {
                  containingDefinition:
                    context.containingDefinition.name.source,
                }
              : {}),
            referenceStackDepth: context.referenceStack.length,
          });
        },
      },
      { references: "follow" },
    );

    expect(visits.get("definitions.Order.customer::reference")).toEqual({
      lexicalDefinition: "Order",
      containingDefinition: "Order",
      referenceStackDepth: 0,
    });
    expect(visits.get("definitions.Order.customer::object")).toEqual({
      lexicalDefinition: "Order",
      containingDefinition: "User",
      referenceStackDepth: 1,
    });
    expect(visits.get("root::reference")).toEqual({
      referenceStackDepth: 0,
    });
    expect(visits.get("root::object")).toEqual({
      containingDefinition: "Order",
      referenceStackDepth: 1,
    });
    expect(visits.get("root.customer::object")).toEqual({
      containingDefinition: "User",
      referenceStackDepth: 2,
    });
  });

  it("captures per-occurrence source and target information in referenceStack", () => {
    const document = schemaDocument(
      "ReferenceStack",
      schemaReferenceNode("Order"),
      {
        definitions: [
          schemaDefinition(
            "Order",
            schemaObjectNode([
              schemaFieldNode("customer", schemaReferenceNode("User")),
            ]),
          ),
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("manager", schemaReferenceNode("User")),
            ]),
          ),
        ],
      },
    );

    const stackSnapshots = new Map<
      string,
      Array<{
        referenceName: string;
        sourcePath: string[];
        sourceDefinition?: string;
        targetDefinition: string;
      }>
    >();

    walkSchemaDocument(
      document,
      {
        enter(context) {
          if (context.node.kind !== "object") {
            return;
          }

          stackSnapshots.set(
            context.path.join("."),
            context.referenceStack.map((frame) => ({
              referenceName: frame.reference.name,
              sourcePath: frame.sourcePath.map((segment) => {
                switch (segment.kind) {
                  case "root":
                    return "root";
                  case "definition":
                    return `definitions.${segment.name}`;
                  case "elementType":
                    return "elementType";
                  case "tupleElement":
                  case "unionMember":
                    return String(segment.index);
                  case "recordKey":
                    return "key";
                  case "recordValue":
                    return "value";
                  case "field":
                    return segment.name;
                }
              }),
              ...(frame.sourceDefinition
                ? { sourceDefinition: frame.sourceDefinition.name.source }
                : {}),
              targetDefinition: frame.targetDefinition.name.source,
            })),
          );
        },
      },
      { references: "follow" },
    );

    expect(stackSnapshots.get("definitions.Order.customer")).toEqual([
      {
        referenceName: "User",
        sourcePath: ["definitions.Order", "customer"],
        sourceDefinition: "Order",
        targetDefinition: "User",
      },
    ]);
    expect(stackSnapshots.get("root")).toEqual([
      {
        referenceName: "Order",
        sourcePath: ["root"],
        targetDefinition: "Order",
      },
    ]);
    expect(stackSnapshots.get("root.customer")).toEqual([
      {
        referenceName: "Order",
        sourcePath: ["root"],
        targetDefinition: "Order",
      },
      {
        referenceName: "User",
        sourcePath: ["root", "customer"],
        targetDefinition: "User",
      },
    ]);
  });

  it("follows references per occurrence by default", () => {
    const document = schemaDocument(
      "RepeatRefs",
      schemaTupleNode([
        schemaReferenceNode("User"),
        schemaReferenceNode("User"),
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

    const visits: string[] = [];

    walkSchemaDocumentFromRoot(
      document,
      {
        enter(context) {
          visits.push(`${context.path.join(".")}::${context.node.kind}`);
        },
      },
      { references: "follow" },
    );

    expect(visits).toEqual([
      "root::tuple",
      "root.0::reference",
      "root.0::object",
      "root.0.id::scalar",
      "root.1::reference",
      "root.1::object",
      "root.1.id::scalar",
    ]);
  });

  it("can follow each definition at most once when configured", () => {
    const document = schemaDocument(
      "RepeatRefs",
      schemaTupleNode([
        schemaReferenceNode("User"),
        schemaReferenceNode("User"),
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

    const visits: string[] = [];

    walkSchemaDocumentFromRoot(
      document,
      {
        enter(context) {
          visits.push(`${context.path.join(".")}::${context.node.kind}`);
        },
      },
      {
        references: "follow",
        referenceVisits: "once-per-definition",
      },
    );

    expect(visits).toEqual([
      "root::tuple",
      "root.0::reference",
      "root.0::object",
      "root.0.id::scalar",
      "root.1::reference",
    ]);
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

    expect(
      tupleChildren.map((child) =>
        schemaPathSegmentToDiagnosticToken(child.pathSegment),
      ),
    ).toEqual(["0", "1"]);
    expect(tupleChildren.map((child) => child.pathSegment.kind)).toEqual([
      "tupleElement",
      "tupleElement",
    ]);
    expect(tupleChildren.map((child) => child.via.kind)).toEqual([
      "tupleElement",
      "tupleElement",
    ]);

    expect(
      recordChildren.map((child) =>
        schemaPathSegmentToDiagnosticToken(child.pathSegment),
      ),
    ).toEqual(["key", "value"]);
    expect(recordChildren.map((child) => child.pathSegment.kind)).toEqual([
      "recordKey",
      "recordValue",
    ]);
    expect(recordChildren.map((child) => child.via.kind)).toEqual([
      "recordKey",
      "recordValue",
    ]);

    expect(
      objectChildren.map((child) =>
        schemaPathSegmentToDiagnosticToken(child.pathSegment),
      ),
    ).toEqual(["name", "tags"]);
    expect(objectChildren.map((child) => child.pathSegment.kind)).toEqual([
      "field",
      "field",
    ]);
    expect(objectChildren.map((child) => child.via.kind)).toEqual([
      "field",
      "field",
    ]);

    expect(
      unionChildren.map((child) =>
        schemaPathSegmentToDiagnosticToken(child.pathSegment),
      ),
    ).toEqual(["0", "1"]);
    expect(unionChildren.map((child) => child.pathSegment.kind)).toEqual([
      "unionMember",
      "unionMember",
    ]);
    expect(unionChildren.map((child) => child.via.kind)).toEqual([
      "unionMember",
      "unionMember",
    ]);
  });

  it("supports skipping children without stopping sibling traversal", () => {
    const document = schemaDocument(
      "TraversalControl",
      schemaObjectNode([
        schemaFieldNode(
          "profile",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("string")),
            schemaFieldNode("age", schemaScalarNode("integer")),
          ]),
        ),
        schemaFieldNode("status", schemaScalarNode("string")),
      ]),
    );

    const visited: string[] = [];

    walkSchemaDocumentFromRoot(document, {
      enter(context) {
        visited.push(`${context.path.join(".")}::${context.node.kind}`);

        if (context.path.join(".") === "root.profile") {
          return "skip-children";
        }
      },
    });

    expect(visited).toEqual([
      "root::object",
      "root.profile::object",
      "root.status::scalar",
    ]);
  });

  it("calls leave in post-order for completed traversal branches", () => {
    const document = schemaDocument(
      "LeaveTraversal",
      schemaObjectNode([
        schemaFieldNode(
          "profile",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
        ),
      ]),
    );

    const events: string[] = [];

    walkSchemaDocumentFromRoot(document, {
      enter(context) {
        events.push(`enter:${context.path.join(".")}::${context.node.kind}`);
      },
      leave(context) {
        events.push(`leave:${context.path.join(".")}::${context.node.kind}`);
      },
    });

    expect(events).toEqual([
      "enter:root::object",
      "enter:root.profile::object",
      "enter:root.profile.id::scalar",
      "leave:root.profile.id::scalar",
      "leave:root.profile::object",
      "leave:root::object",
    ]);
  });

  it("calls leave after skip-children on the skipped node", () => {
    const document = schemaDocument(
      "SkipLeaveTraversal",
      schemaObjectNode([
        schemaFieldNode(
          "profile",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
        ),
        schemaFieldNode("status", schemaScalarNode("string")),
      ]),
    );

    const events: string[] = [];

    walkSchemaDocumentFromRoot(document, {
      enter(context) {
        events.push(`enter:${context.path.join(".")}::${context.node.kind}`);

        if (context.path.join(".") === "root.profile") {
          return "skip-children";
        }
      },
      leave(context) {
        events.push(`leave:${context.path.join(".")}::${context.node.kind}`);
      },
    });

    expect(events).toEqual([
      "enter:root::object",
      "enter:root.profile::object",
      "leave:root.profile::object",
      "enter:root.status::scalar",
      "leave:root.status::scalar",
      "leave:root::object",
    ]);
  });

  it("supports stopping traversal immediately", () => {
    const document = schemaDocument(
      "StopTraversal",
      schemaObjectNode([
        schemaFieldNode("first", schemaScalarNode("string")),
        schemaFieldNode("second", schemaScalarNode("integer")),
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

    const visited: string[] = [];

    walkSchemaDocumentStructure(document, {
      enter(context) {
        visited.push(`${context.path.join(".")}::${context.node.kind}`);

        if (context.path.join(".") === "definitions.User") {
          return "stop";
        }
      },
    });

    expect(visited).toEqual(["definitions.User::object"]);
  });

  it("does not emit leave events after stop", () => {
    const document = schemaDocument(
      "StopLeaveTraversal",
      schemaObjectNode([
        schemaFieldNode(
          "profile",
          schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
        ),
      ]),
    );

    const events: string[] = [];

    walkSchemaDocumentFromRoot(document, {
      enter(context) {
        events.push(`enter:${context.path.join(".")}::${context.node.kind}`);

        if (context.path.join(".") === "root.profile") {
          return "stop";
        }
      },
      leave(context) {
        events.push(`leave:${context.path.join(".")}::${context.node.kind}`);
      },
    });

    expect(events).toEqual([
      "enter:root::object",
      "enter:root.profile::object",
    ]);
  });

  it("exposes definition, field, and tuple-element wrapper hooks in traversal order", () => {
    const document = schemaDocument(
      "WrapperHooks",
      schemaTupleNode([
        schemaScalarNode("string"),
        schemaObjectNode([
          schemaFieldNode("profile", schemaReferenceNode("User")),
        ]),
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

    const events: string[] = [];

    walkSchemaDocument(document, {
      enterDefinition(context) {
        events.push(`enterDefinition:${context.path.join(".")}`);
      },
      leaveDefinition(context) {
        events.push(`leaveDefinition:${context.path.join(".")}`);
      },
      enterField(context) {
        events.push(
          `enterField:${context.path.join(".")}:${context.field.name.source}`,
        );
      },
      leaveField(context) {
        events.push(
          `leaveField:${context.path.join(".")}:${context.field.name.source}`,
        );
      },
      enterTupleElement(context) {
        events.push(
          `enterTupleElement:${context.path.join(".")}:${context.index}`,
        );
      },
      leaveTupleElement(context) {
        events.push(
          `leaveTupleElement:${context.path.join(".")}:${context.index}`,
        );
      },
    });

    expect(events).toEqual([
      "enterDefinition:definitions.User",
      "enterField:definitions.User.id:id",
      "leaveField:definitions.User.id:id",
      "leaveDefinition:definitions.User",
      "enterTupleElement:root.0:0",
      "leaveTupleElement:root.0:0",
      "enterTupleElement:root.1:1",
      "enterField:root.1.profile:profile",
      "leaveField:root.1.profile:profile",
      "leaveTupleElement:root.1:1",
    ]);
  });

  it("supports skip-children on field and tuple-element wrapper hooks", () => {
    const document = schemaDocument(
      "WrapperHookControl",
      schemaTupleNode([
        schemaObjectNode([
          schemaFieldNode(
            "profile",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("string")),
            ]),
          ),
        ]),
        schemaObjectNode([
          schemaFieldNode("status", schemaScalarNode("string")),
        ]),
      ]),
    );

    const events: string[] = [];

    walkSchemaDocumentFromRoot(document, {
      enterTupleElement(context) {
        events.push(`enterTupleElement:${context.path.join(".")}`);

        if (context.index === 1) {
          return "skip-children";
        }
      },
      leaveTupleElement(context) {
        events.push(`leaveTupleElement:${context.path.join(".")}`);
      },
      enterField(context) {
        events.push(`enterField:${context.path.join(".")}`);

        if (context.field.name.source === "profile") {
          return "skip-children";
        }
      },
      leaveField(context) {
        events.push(`leaveField:${context.path.join(".")}`);
      },
      enter(context) {
        events.push(
          `enterNode:${context.path.join(".")}::${context.node.kind}`,
        );
      },
      leave(context) {
        events.push(
          `leaveNode:${context.path.join(".")}::${context.node.kind}`,
        );
      },
    });

    expect(events).toEqual([
      "enterNode:root::tuple",
      "enterTupleElement:root.0",
      "enterNode:root.0::object",
      "enterField:root.0.profile",
      "leaveField:root.0.profile",
      "leaveNode:root.0::object",
      "leaveTupleElement:root.0",
      "enterTupleElement:root.1",
      "leaveTupleElement:root.1",
      "leaveNode:root::tuple",
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
