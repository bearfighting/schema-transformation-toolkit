import {
  areEquivalentNumericConstraintSets,
  mergeNumericConstraints,
  walkSchemaDocumentFromRoot,
  type ConstraintDocument,
  type ConversionCapabilityRequirement,
  type ConversionLossHotspot,
  type ConversionRouteCapabilities,
  type SchemaDocument,
  type SchemaNode,
  type SemanticLoss,
} from "@schema-transformation-toolkit/core";

const INTEGER_RANGES: Record<string, [string, string]> = {
  i8: ["-128", "127"],
  i16: ["-32768", "32767"],
  i32: ["-2147483648", "2147483647"],
  i64: ["-9223372036854775808", "9223372036854775807"],
  i128: [
    "-170141183460469231731687303715884105728",
    "170141183460469231731687303715884105727",
  ],
  u8: ["0", "255"],
  u16: ["0", "65535"],
  u32: ["0", "4294967295"],
  u64: ["0", "18446744073709551615"],
  u128: ["0", "340282366920938463463374607431768211455"],
};

export function collectRustCapabilityRequirements(
  document: SchemaDocument,
): ConversionCapabilityRequirement[] {
  const rootReferenceName =
    document.root.kind === "reference" ? document.root.name : undefined;
  const rootIsSupported =
    document.root.kind === "object" ||
    isStringLiteralUnion(document.root) ||
    (rootReferenceName !== undefined &&
      document.definitions.some(
        (definition) =>
          definition.name.source === rootReferenceName &&
          (definition.type.kind === "object" ||
            isStringLiteralUnion(definition.type)),
      ));
  return rootIsSupported
    ? []
    : [{ feature: "object-root", path: ["root"], referenceStack: [] }];
}

export function collectRustLossHotspots(
  document: SchemaDocument,
): ConversionLossHotspot[] {
  const hotspots: ConversionLossHotspot[] = [];
  walkSchemaDocumentFromRoot(document, {
    enter(context) {
      if (
        context.node.kind === "scalar" &&
        context.node.scalar === "integer" &&
        !context.node.representation
      ) {
        hotspots.push(
          createHotspot(context, "integer-default-selection", {
            reason:
              "Rust type must be selected from constraints or i64 default.",
          }),
        );
      }
      if (
        context.node.kind === "union" &&
        !isNullableUnion(context.node) &&
        !(context.via?.kind === "root" && isStringLiteralUnion(context.node))
      ) {
        hotspots.push(
          createHotspot(context, "unsupported-rust-union", {
            memberKinds: context.node.members.map((member) => member.kind),
          }),
        );
      }
      if (["tuple", "unknown"].includes(context.node.kind)) {
        hotspots.push(
          createHotspot(context, "unsupported-rust-node", {
            nodeKind: context.node.kind,
          }),
        );
      }
    },
  });
  return hotspots;
}

function isNullableUnion(node: SchemaNode): boolean {
  return (
    node.kind === "union" &&
    node.members.length === 2 &&
    node.members.some((member) => member.kind === "null")
  );
}

function isStringLiteralUnion(node: SchemaNode): boolean {
  return (
    node.kind === "union" &&
    node.members.length > 0 &&
    node.members.every(
      (member) => member.kind === "literal" && typeof member.value === "string",
    )
  );
}

export function planRustSemanticLosses(context: {
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  routeCapabilities: ConversionRouteCapabilities;
  targetFormat: string;
}): SemanticLoss[] {
  if (!context.constraints) return [];
  return context.constraints.entries.flatMap((entry) => {
    const node = nodeAtPath(context.document, entry.target.path);
    const merged = mergeNumericConstraints(entry.constraints);
    const representation =
      node?.kind === "scalar" ? node.representation : undefined;
    const typeName =
      representation?.family === "integer" &&
      representation.signedness &&
      representation.widthBits !== undefined &&
      representation.widthBits !== "pointer"
        ? `${representation.signedness === "unsigned" ? "u" : "i"}${representation.widthBits}`
        : undefined;
    const range = typeName ? INTEGER_RANGES[typeName] : undefined;
    const fullyRepresented =
      node?.kind === "scalar" &&
      node.scalar === "integer" &&
      range !== undefined &&
      areEquivalentNumericConstraintSets(merged, {
        minimum: decimal(range[0]),
        maximum: decimal(range[1]),
      });
    if (fullyRepresented) return [];
    return entry.constraints.map((constraint) => ({
      code: "rust-constraint-may-not-be-enforced",
      message: `Rust output may not enforce the "${constraint.kind}" constraint at runtime.`,
      severity: "warning" as const,
      phase: "generate" as const,
      lostCapability: "numeric-constraints" as const,
      sourcePath: entry.target.path,
      targetFormat: context.targetFormat,
      evidence: { constraintKind: constraint.kind },
    }));
  });
}

function nodeAtPath(
  document: SchemaDocument,
  path: readonly string[],
): SchemaNode | undefined {
  let node: SchemaNode | undefined = document.root;
  let index = path[0] === "root" ? 1 : 0;
  if (path[0] === "definitions") {
    node = document.definitions.find(
      (definition) => definition.name.source === path[1],
    )?.type;
    index = 2;
  }
  for (; node && index < path.length; index += 1) {
    const segment = path[index];
    if (node.kind === "object") {
      node = node.fields.find((field) => field.name.source === segment)?.type;
    } else if (node.kind === "record" && segment === "value") {
      node = node.value;
    } else if (node.kind === "array" && segment === "items") {
      node = node.elementType;
    } else {
      return undefined;
    }
  }
  return node;
}

function decimal(value: string) {
  return { representation: "decimal" as const, value };
}

function createHotspot(
  context: {
    path: string[];
    lexicalDefinition?: { name: { source: string } };
    containingDefinition?: { name: { source: string } };
    referenceStack: readonly {
      targetDefinition: { name: { source: string } };
    }[];
  },
  code: string,
  evidence: Record<string, unknown>,
): ConversionLossHotspot {
  return {
    code,
    path: [...context.path],
    ...(context.lexicalDefinition
      ? { lexicalDefinitionName: context.lexicalDefinition.name.source }
      : {}),
    ...(context.containingDefinition
      ? { containingDefinitionName: context.containingDefinition.name.source }
      : {}),
    referenceStack: context.referenceStack.map(
      (frame) => frame.targetDefinition.name.source,
    ),
    evidence,
  };
}
