import { describe, expect, it } from "vitest";
import {
  createRootSchemaPath,
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaRecordNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
} from "../../packages/core/src/index.js";
import {
  transformSchemaDocument,
  transformSchemaDocumentFromRoot,
  transformSchemaDefinitions,
  transformSchemaNode,
} from "../../packages/core/src/schema/transform.js";

describe("schema transform", () => {
  it("reuses the original node for a no-op transform", () => {
    const node = schemaObjectNode([
      schemaFieldNode("name", schemaScalarNode("string")),
      schemaFieldNode("tags", schemaArrayNode(schemaScalarNode("string"))),
    ]);

    const transformed = transformSchemaNode(
      node,
      {},
      {
        typedPath: createRootSchemaPath(),
        path: ["root"],
        definitionLookup: new Map(),
        referenceStack: [],
      },
    );

    expect(transformed).toBe(node);
  });

  it("transforms nested child nodes while preserving wrapper semantics", () => {
    const node = schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer"), {
        required: false,
        nullable: true,
      }),
      schemaFieldNode(
        "pair",
        schemaTupleNode([
          schemaTupleElement(schemaScalarNode("integer"), { required: false }),
          schemaRecordNode(
            schemaScalarNode("string"),
            schemaScalarNode("integer"),
          ),
        ]),
      ),
    ]);

    const transformed = transformSchemaNode(
      node,
      {
        transformNode(current) {
          return current.kind === "scalar" && current.scalar === "integer"
            ? schemaScalarNode("number")
            : current;
        },
      },
      {
        typedPath: createRootSchemaPath(),
        path: ["root"],
        definitionLookup: new Map(),
        referenceStack: [],
      },
    );

    expect(transformed).toEqual(
      schemaObjectNode([
        schemaFieldNode("id", schemaScalarNode("number"), {
          required: false,
          nullable: true,
        }),
        schemaFieldNode(
          "pair",
          schemaTupleNode([
            schemaTupleElement(schemaScalarNode("number"), {
              required: false,
            }),
            schemaRecordNode(
              schemaScalarNode("string"),
              schemaScalarNode("number"),
            ),
          ]),
        ),
      ]),
    );
  });

  it("can skip transforming a selected subtree while still transforming the current node", () => {
    const node = schemaObjectNode([
      schemaFieldNode(
        "profile",
        schemaObjectNode([schemaFieldNode("id", schemaScalarNode("integer"))]),
      ),
      schemaFieldNode("count", schemaScalarNode("integer")),
    ]);

    const transformed = transformSchemaNode(
      node,
      {
        shouldTransformChildren(current, context) {
          return context.path.join(".") !== "root.profile";
        },
        transformNode(current, context) {
          if (current.kind === "scalar" && current.scalar === "integer") {
            return schemaScalarNode("number");
          }

          if (
            current.kind === "object" &&
            context.path.join(".") === "root.profile"
          ) {
            return schemaObjectNode([
              ...current.fields,
              schemaFieldNode("skipped", schemaScalarNode("boolean")),
            ]);
          }

          return current;
        },
      },
      {
        typedPath: createRootSchemaPath(),
        path: ["root"],
        definitionLookup: new Map(),
        referenceStack: [],
      },
    );

    expect(transformed).toEqual(
      schemaObjectNode([
        schemaFieldNode(
          "profile",
          schemaObjectNode([
            schemaFieldNode("id", schemaScalarNode("integer")),
            schemaFieldNode("skipped", schemaScalarNode("boolean")),
          ]),
        ),
        schemaFieldNode("count", schemaScalarNode("number")),
      ]),
    );
  });

  it("calls leaveNode in post-order after child transforms complete", () => {
    const node = schemaObjectNode([
      schemaFieldNode(
        "profile",
        schemaObjectNode([schemaFieldNode("id", schemaScalarNode("string"))]),
      ),
    ]);

    const events: string[] = [];

    transformSchemaNode(
      node,
      {
        leaveNode(current, context) {
          events.push(`leave:${context.path.join(".")}::${current.kind}`);
          return current;
        },
      },
      {
        typedPath: createRootSchemaPath(),
        path: ["root"],
        definitionLookup: new Map(),
        referenceStack: [],
      },
    );

    expect(events).toEqual([
      "leave:root.profile.id::scalar",
      "leave:root.profile::object",
      "leave:root::object",
    ]);
  });

  it("runs leaveNode after transformNode on the same node", () => {
    const node = schemaObjectNode([
      schemaFieldNode("count", schemaScalarNode("integer")),
    ]);

    const events: string[] = [];

    const transformed = transformSchemaNode(
      node,
      {
        transformNode(current, context) {
          events.push(`transform:${context.path.join(".")}::${current.kind}`);

          if (current.kind === "scalar" && current.scalar === "integer") {
            return schemaScalarNode("number");
          }

          return current;
        },
        leaveNode(current, context) {
          events.push(`leave:${context.path.join(".")}::${current.kind}`);

          if (current.kind === "object") {
            return schemaObjectNode([
              ...current.fields,
              schemaFieldNode("done", schemaScalarNode("boolean")),
            ]);
          }

          return current;
        },
      },
      {
        typedPath: createRootSchemaPath(),
        path: ["root"],
        definitionLookup: new Map(),
        referenceStack: [],
      },
    );

    expect(events).toEqual([
      "transform:root.count::scalar",
      "leave:root.count::scalar",
      "transform:root::object",
      "leave:root::object",
    ]);
    expect(transformed).toEqual(
      schemaObjectNode([
        schemaFieldNode("count", schemaScalarNode("number")),
        schemaFieldNode("done", schemaScalarNode("boolean")),
      ]),
    );
  });

  it("propagates lexicalDefinition and referenceStack through transformed definition children", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([schemaFieldNode("user", schemaReferenceNode("User"))]),
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
        lexicalDefinition?: string;
        containingDefinition?: string;
        referenceStackDepth: number;
      }
    >();

    transformSchemaDocument(document, {
      transformNode(node, context) {
        visits.set(context.path.join("."), {
          ...(context.lexicalDefinition
            ? { lexicalDefinition: context.lexicalDefinition.name.source }
            : {}),
          ...(context.containingDefinition
            ? { containingDefinition: context.containingDefinition.name.source }
            : {}),
          referenceStackDepth: context.referenceStack.length,
        });

        return node;
      },
    });

    expect(visits.get("definitions.User")).toEqual({
      lexicalDefinition: "User",
      containingDefinition: "User",
      referenceStackDepth: 0,
    });
    expect(visits.get("definitions.User.id")).toEqual({
      lexicalDefinition: "User",
      containingDefinition: "User",
      referenceStackDepth: 0,
    });
    expect(visits.get("root")).toEqual({
      referenceStackDepth: 0,
    });
    expect(visits.get("root.user")).toEqual({
      referenceStackDepth: 0,
    });
  });

  it("transforms definitions and root in a schema document", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
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

    const transformed = transformSchemaDocument(document, {
      transformNode(current) {
        return current.kind === "scalar" && current.scalar === "integer"
          ? schemaScalarNode("number")
          : current;
      },
    });

    expect(transformed).toEqual(
      schemaDocument(
        "Order",
        schemaObjectNode([
          schemaFieldNode("userId", schemaScalarNode("number")),
        ]),
        {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("number")),
              ]),
            ),
          ],
        },
      ),
    );
  });

  it("transforms only the root when using the root entry point", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
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

    const transformed = transformSchemaDocumentFromRoot(document, {
      transformNode(current) {
        return current.kind === "scalar" && current.scalar === "integer"
          ? schemaScalarNode("number")
          : current;
      },
    });

    expect(transformed).toEqual(
      schemaDocument(
        "Order",
        schemaObjectNode([
          schemaFieldNode("userId", schemaScalarNode("number")),
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
      ),
    );
  });

  it("transforms only definitions when using the definitions entry point", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([
        schemaFieldNode("userId", schemaScalarNode("integer")),
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

    const transformed = transformSchemaDefinitions(document, {
      transformNode(current) {
        return current.kind === "scalar" && current.scalar === "integer"
          ? schemaScalarNode("number")
          : current;
      },
    });

    expect(transformed).toEqual(
      schemaDocument(
        "Order",
        schemaObjectNode([
          schemaFieldNode("userId", schemaScalarNode("integer")),
        ]),
        {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("number")),
              ]),
            ),
          ],
        },
      ),
    );
  });

  it("preserves reference targets by default in root transforms", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([schemaFieldNode("user", schemaReferenceNode("User"))]),
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

    const transformed = transformSchemaDocumentFromRoot(document, {
      transformNode(current) {
        return current.kind === "scalar" && current.scalar === "integer"
          ? schemaScalarNode("number")
          : current;
      },
    });

    expect(transformed).toEqual(document);
  });

  it("can transform root-reachable definitions when configured for reachable definitions", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([schemaFieldNode("user", schemaReferenceNode("User"))]),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
              schemaFieldNode("address", schemaReferenceNode("Address")),
            ]),
          ),
          schemaDefinition(
            "Address",
            schemaObjectNode([
              schemaFieldNode("zip", schemaScalarNode("integer")),
            ]),
          ),
          schemaDefinition(
            "Unused",
            schemaObjectNode([
              schemaFieldNode("count", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    const transformed = transformSchemaDocumentFromRoot(
      document,
      {
        transformNode(current) {
          return current.kind === "scalar" && current.scalar === "integer"
            ? schemaScalarNode("number")
            : current;
        },
      },
      { reachability: "selected-and-root-reachable-definitions" },
    );

    expect(transformed).toEqual(
      schemaDocument(
        "Order",
        schemaObjectNode([
          schemaFieldNode("user", schemaReferenceNode("User")),
        ]),
        {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("number")),
                schemaFieldNode("address", schemaReferenceNode("Address")),
              ]),
            ),
            schemaDefinition(
              "Address",
              schemaObjectNode([
                schemaFieldNode("zip", schemaScalarNode("number")),
              ]),
            ),
            schemaDefinition(
              "Unused",
              schemaObjectNode([
                schemaFieldNode("count", schemaScalarNode("integer")),
              ]),
            ),
          ],
        },
      ),
    );
  });

  it("keeps transform reference context explicit and narrow in root-reachable definition transforms", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([schemaFieldNode("user", schemaReferenceNode("User"))]),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("address", schemaReferenceNode("Address")),
            ]),
          ),
          schemaDefinition(
            "Address",
            schemaObjectNode([
              schemaFieldNode("zip", schemaScalarNode("integer")),
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

    transformSchemaDocumentFromRoot(
      document,
      {
        transformNode(node, context) {
          visits.set(context.path.join("."), {
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

          return node;
        },
      },
      { reachability: "selected-and-root-reachable-definitions" },
    );

    expect(visits.get("root")).toEqual({
      referenceStackDepth: 0,
    });
    expect(visits.get("root.user")).toEqual({
      referenceStackDepth: 0,
    });
    expect(visits.get("definitions.User")).toEqual({
      lexicalDefinition: "User",
      containingDefinition: "User",
      referenceStackDepth: 0,
    });
    expect(visits.get("definitions.User.address")).toEqual({
      lexicalDefinition: "User",
      containingDefinition: "User",
      referenceStackDepth: 0,
    });
    expect(visits.get("definitions.Address")).toEqual({
      lexicalDefinition: "Address",
      containingDefinition: "Address",
      referenceStackDepth: 0,
    });
  });

  it("can skip transforming children for a reachable definition branch", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([schemaFieldNode("user", schemaReferenceNode("User"))]),
      {
        definitions: [
          schemaDefinition(
            "User",
            schemaObjectNode([
              schemaFieldNode("id", schemaScalarNode("integer")),
              schemaFieldNode("address", schemaReferenceNode("Address")),
            ]),
          ),
          schemaDefinition(
            "Address",
            schemaObjectNode([
              schemaFieldNode("zip", schemaScalarNode("integer")),
            ]),
          ),
        ],
      },
    );

    const transformed = transformSchemaDocumentFromRoot(
      document,
      {
        shouldTransformChildren(_current, context) {
          return context.path.join(".") !== "definitions.User";
        },
        transformNode(current) {
          return current.kind === "scalar" && current.scalar === "integer"
            ? schemaScalarNode("number")
            : current;
        },
      },
      { reachability: "selected-and-root-reachable-definitions" },
    );

    expect(transformed).toEqual(
      schemaDocument(
        "Order",
        schemaObjectNode([
          schemaFieldNode("user", schemaReferenceNode("User")),
        ]),
        {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("integer")),
                schemaFieldNode("address", schemaReferenceNode("Address")),
              ]),
            ),
            schemaDefinition(
              "Address",
              schemaObjectNode([
                schemaFieldNode("zip", schemaScalarNode("number")),
              ]),
            ),
          ],
        },
      ),
    );
  });

  it("keeps the legacy follow option working for compatibility", () => {
    const document = schemaDocument(
      "Order",
      schemaObjectNode([schemaFieldNode("user", schemaReferenceNode("User"))]),
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

    const transformed = transformSchemaDocumentFromRoot(
      document,
      {
        transformNode(current) {
          return current.kind === "scalar" && current.scalar === "integer"
            ? schemaScalarNode("number")
            : current;
        },
      },
      { references: "follow" },
    );

    expect(transformed).toEqual(
      schemaDocument(
        "Order",
        schemaObjectNode([
          schemaFieldNode("user", schemaReferenceNode("User")),
        ]),
        {
          definitions: [
            schemaDefinition(
              "User",
              schemaObjectNode([
                schemaFieldNode("id", schemaScalarNode("number")),
              ]),
            ),
          ],
        },
      ),
    );
  });
});
