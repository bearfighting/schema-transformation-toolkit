import { describe, expect, it } from "vitest";
import {
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
        path: ["root"],
        definitionLookup: new Map(),
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
        path: ["root"],
        definitionLookup: new Map(),
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

  it("can transform root-reachable definitions when following references", () => {
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
});
