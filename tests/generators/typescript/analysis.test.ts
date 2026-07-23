import { describe, expect, it } from "vitest";
import {
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
} from "../../../packages/core/src/index.js";
import {
  collectTypeScriptCapabilityRequirements,
  collectTypeScriptTargetLossHotspots,
} from "../../../packages/generators/typescript/src/analysis.js";

describe("generator-typescript analysis", () => {
  it("collects widening hotspots per reachable reference occurrence", () => {
    const document = schemaDocument(
      "Entry",
      schemaObjectNode([
        schemaFieldNode("left", schemaReferenceNode("Count")),
        schemaFieldNode("right", schemaReferenceNode("Count")),
      ]),
      {
        definitions: [schemaDefinition("Count", schemaScalarNode("integer"))],
      },
    );

    expect(collectTypeScriptTargetLossHotspots(document)).toEqual([
      {
        code: "integer-widening",
        path: ["root", "left"],
        containingDefinitionName: "Count",
        referenceStack: ["Count"],
        evidence: {
          sourceScalar: "integer",
          renderedScalar: "number",
        },
      },
      {
        code: "integer-widening",
        path: ["root", "right"],
        containingDefinitionName: "Count",
        referenceStack: ["Count"],
        evidence: {
          sourceScalar: "integer",
          renderedScalar: "number",
        },
      },
    ]);
  });

  it("collects unknown-union widening through followed references", () => {
    const document = schemaDocument(
      "Entry",
      schemaObjectNode([
        schemaFieldNode("first", schemaReferenceNode("Flexible")),
        schemaFieldNode("second", schemaReferenceNode("Flexible")),
      ]),
      {
        definitions: [
          schemaDefinition(
            "Flexible",
            schemaUnionNode([
              schemaScalarNode("string"),
              schemaUnknownNode({ reason: "no-evidence" }),
            ]),
          ),
        ],
      },
    );

    expect(
      collectTypeScriptTargetLossHotspots(document).filter(
        (hotspot) => hotspot.code === "unknown-union-absorption",
      ),
    ).toEqual([
      {
        code: "unknown-union-absorption",
        path: ["root", "first"],
        containingDefinitionName: "Flexible",
        referenceStack: ["Flexible"],
        evidence: {
          unknownMemberIndexes: [1],
          memberKinds: ["scalar", "unknown"],
        },
      },
      {
        code: "unknown-union-absorption",
        path: ["root", "second"],
        containingDefinitionName: "Flexible",
        referenceStack: ["Flexible"],
        evidence: {
          unknownMemberIndexes: [1],
          memberKinds: ["scalar", "unknown"],
        },
      },
    ]);
  });

  it("collects capability requirements once per followed definition body", () => {
    const document = schemaDocument(
      "Entry",
      schemaObjectNode([
        schemaFieldNode("first", schemaReferenceNode("Pair")),
        schemaFieldNode("second", schemaReferenceNode("Pair")),
      ]),
      {
        definitions: [
          schemaDefinition(
            "Pair",
            schemaTupleNode([
              schemaTupleElement(schemaScalarNode("string")),
              schemaTupleElement(schemaScalarNode("number")),
            ]),
          ),
        ],
      },
    );

    const requirements = collectTypeScriptCapabilityRequirements(document);

    expect(
      requirements.filter((requirement) => requirement.feature === "tuple"),
    ).toEqual([
      {
        feature: "tuple",
        path: ["root", "first"],
        containingDefinitionName: "Pair",
        referenceStack: ["Pair"],
      },
    ]);

    expect(
      requirements.filter(
        (requirement) => requirement.feature === "local-reference",
      ),
    ).toEqual([
      {
        feature: "local-reference",
        path: ["root", "first"],
        referenceStack: [],
        evidence: {
          targetDefinition: "Pair",
        },
      },
      {
        feature: "local-reference",
        path: ["root", "second"],
        referenceStack: [],
        evidence: {
          targetDefinition: "Pair",
        },
      },
    ]);
  });

  it("surfaces recursive-reference requirements at the cycle point", () => {
    const document = schemaDocument("Entry", schemaReferenceNode("Loop"), {
      definitions: [
        schemaDefinition(
          "Loop",
          schemaObjectNode([
            schemaFieldNode("next", schemaReferenceNode("Loop")),
          ]),
        ),
      ],
    });

    expect(
      collectTypeScriptCapabilityRequirements(document).filter(
        (requirement) => requirement.feature === "recursive-reference",
      ),
    ).toEqual([
      {
        feature: "recursive-reference",
        path: ["root", "next"],
        containingDefinitionName: "Loop",
        referenceStack: ["Loop"],
        evidence: {
          referenceName: "Loop",
        },
      },
    ]);
  });
});
