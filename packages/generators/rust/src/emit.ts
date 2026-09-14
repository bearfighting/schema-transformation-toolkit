import {
  areEquivalentNumericConstraintSets,
  compareNumericValues,
  getNumericConstraintsAtPath,
  mergeNumericConstraints,
  type ConstraintDocument,
  type NumericValue,
  type SchemaDocument,
  type SchemaNode,
  type SchemaSemanticNote,
  type ScalarRepresentationHint,
} from "@schema-transformation-toolkit/core";
import { rustIdentifier } from "./identifiers.js";
import { RustGenerationError } from "./failure.js";

interface RenderContext {
  constraints?: ConstraintDocument;
  notes: SchemaSemanticNote[];
  currentDefinition: string | undefined;
  recursiveReferences: Set<string>;
}

const INTEGER_TYPES = [
  ["i8", "-128", "127"],
  ["i16", "-32768", "32767"],
  ["i32", "-2147483648", "2147483647"],
  ["i64", "-9223372036854775808", "9223372036854775807"],
  [
    "i128",
    "-170141183460469231731687303715884105728",
    "170141183460469231731687303715884105727",
  ],
  ["u8", "0", "255"],
  ["u16", "0", "65535"],
  ["u32", "0", "4294967295"],
  ["u64", "0", "18446744073709551615"],
  ["u128", "0", "340282366920938463463374607431768211455"],
] as const;

export function renderRustDocument(
  document: SchemaDocument,
  constraints?: ConstraintDocument,
): { output: string; semanticNotes: SchemaSemanticNote[] } {
  const context: RenderContext = {
    ...(constraints ? { constraints } : {}),
    notes: [],
    currentDefinition: undefined,
    recursiveReferences: findRecursiveReferences(document),
  };
  const rootReferenceName =
    document.root.kind === "reference" ? document.root.name : undefined;
  const rootDefinition = rootReferenceName
    ? document.definitions.find(
        (definition) => definition.name.source === rootReferenceName,
      )
    : undefined;
  const root =
    document.root.kind === "object" || document.root.kind === "union"
      ? {
          name: document.rootName?.source ?? document.name.source,
          node: document.root,
          path: ["root"],
        }
      : rootDefinition &&
          (rootDefinition.type.kind === "object" ||
            rootDefinition.type.kind === "union")
        ? {
            name: rootDefinition.name.source,
            node: rootDefinition.type,
            path: ["definitions", rootDefinition.name.source],
          }
        : undefined;
  if (!root)
    throw new RustGenerationError(
      "unsupported-rust-root",
      "Rust generator requires an object or string-enum root.",
    );
  const renderedRoot = renderDefinition(
    root.name,
    root.node,
    root.path,
    context,
  );
  const renderedDefinitions = document.definitions
    .filter((definition) => definition.name.source !== root.name)
    .map((definition) => {
      return renderDefinition(
        definition.name.source,
        definition.type,
        ["definitions", definition.name.source],
        context,
      );
    });
  return {
    output: [renderedRoot, ...renderedDefinitions].join("\n\n"),
    semanticNotes: context.notes,
  };
}

function renderDefinition(
  name: string,
  node: SchemaNode,
  path: string[],
  context: RenderContext,
): string {
  const previousDefinition = context.currentDefinition;
  context.currentDefinition = name;
  try {
    if (node.kind === "object") return renderStruct(name, node, path, context);
    if (node.kind === "union") return renderEnum(name, node);
  } finally {
    context.currentDefinition = previousDefinition;
  }
  throw new RustGenerationError(
    "unsupported-rust-node",
    `Rust definition "${name}" must be an object or string enum.`,
  );
}

function renderStruct(
  name: string,
  node: Extract<SchemaNode, { kind: "object" }>,
  path: string[],
  context: RenderContext,
): string {
  const fields = node.fields.map((field) => {
    const type = renderNode(field.type, [...path, field.name.source], context);
    const wrapped =
      field.required && !field.nullable
        ? type
        : type.startsWith("Option<")
          ? type
          : `Option<${type}>`;
    return `    pub ${rustIdentifier(field.name.source)}: ${wrapped},`;
  });
  return fields.length > 0
    ? `pub struct ${rustIdentifier(name)} {\n${fields.join("\n")}\n}`
    : `pub struct ${rustIdentifier(name)} {\n}`;
}

function renderEnum(
  name: string,
  node: Extract<SchemaNode, { kind: "union" }>,
): string {
  if (
    node.members.length === 0 ||
    node.members.some(
      (member) => member.kind !== "literal" || typeof member.value !== "string",
    )
  )
    throw new RustGenerationError(
      "unsupported-rust-enum",
      "Rust enums require a non-empty union of string literals.",
    );
  const variants = node.members.map((member) => {
    if (member.kind !== "literal" || typeof member.value !== "string")
      throw new RustGenerationError(
        "unsupported-rust-enum",
        "Rust enums require a non-empty union of string literals.",
      );
    const value = member.value;
    let variant: string;
    try {
      variant = rustIdentifier(value);
    } catch {
      throw new RustGenerationError(
        "unsupported-rust-enum",
        `Rust enum literal "${value}" is not a valid unchanged Rust variant identifier.`,
      );
    }
    if (variant !== value)
      throw new RustGenerationError(
        "unsupported-rust-enum",
        `Rust enum literal "${value}" is not a valid unchanged Rust variant identifier.`,
      );
    return `    ${variant},`;
  });
  return `pub enum ${rustIdentifier(name)} {\n${variants.join("\n")}\n}`;
}

function renderNode(
  node: SchemaNode,
  path: string[],
  context: RenderContext,
): string {
  switch (node.kind) {
    case "scalar":
      if (node.scalar === "boolean") return "bool";
      if (node.scalar === "string") return "String";
      if (node.scalar === "number") return renderNumber(node.representation);
      if (node.scalar === "integer")
        return renderInteger(node.representation, path, context);
      throw new RustGenerationError(
        "unsupported-rust-node",
        `Unsupported Rust scalar "${node.scalar}".`,
      );
    case "reference":
      return context.currentDefinition &&
        context.recursiveReferences.has(
          `${context.currentDefinition}->${node.name}`,
        )
        ? `Box<${rustIdentifier(node.name)}>`
        : rustIdentifier(node.name);
    case "array":
      return `Vec<${renderNode(node.elementType, [...path, "items"], context)}>`;
    case "record":
      if (node.key.kind !== "scalar" || node.key.scalar !== "string")
        throw new RustGenerationError(
          "unsupported-rust-node",
          "Rust maps require string keys.",
        );
      return `std::collections::HashMap<String, ${renderNode(node.value, [...path, "value"], context)}>`;
    case "union": {
      const nonNull = node.members.filter((member) => member.kind !== "null");
      if (
        nonNull.length === 1 &&
        node.members.some((member) => member.kind === "null")
      )
        return `Option<${renderNode(nonNull[0]!, path, context)}>`;
      if (
        node.members.length > 0 &&
        node.members.every(
          (member) =>
            member.kind === "literal" && typeof member.value === "string",
        )
      )
        throw new RustGenerationError(
          "unsupported-rust-enum",
          "String literal unions are only valid as named Rust enum definitions.",
        );
      throw new RustGenerationError(
        "unsupported-rust-union",
        "Only nullable unions are supported inline by the Rust generator.",
      );
    }
    default:
      throw new RustGenerationError(
        "unsupported-rust-node",
        `Unsupported Rust Shape IR node "${node.kind}".`,
      );
  }
}

function renderNumber(
  representation: ScalarRepresentationHint | undefined,
): string {
  if (representation?.family === "float" && representation.widthBits === 32)
    return "f32";
  return "f64";
}

function renderInteger(
  representation:
    { family: string; signedness?: string; widthBits?: unknown } | undefined,
  path: string[],
  context: RenderContext,
): string {
  const constraints = context.constraints
    ? getNumericConstraintsAtPath(context.constraints, path)
    : [];
  const merged = mergeNumericConstraints(constraints);
  if (
    representation?.family === "integer" &&
    representation.signedness &&
    representation.widthBits
  ) {
    const selected =
      representation.widthBits === "pointer"
        ? representation.signedness === "unsigned"
          ? "usize"
          : "isize"
        : `${representation.signedness === "unsigned" ? "u" : "i"}${String(representation.widthBits)}`;
    validateRepresentationRange(selected, merged);
    addConstraintLosses(selected, merged, path, context);
    return selected;
  }
  const selected = chooseIntegerType(merged);
  addConstraintLosses(selected, merged, path, context);
  return selected;
}

function chooseIntegerType(
  constraints: ReturnType<typeof mergeNumericConstraints>,
): string {
  const minimum = constraints.minimum ?? constraints.exclusiveMinimum;
  const maximum = constraints.maximum ?? constraints.exclusiveMaximum;
  if (minimum === undefined && maximum === undefined) return "i64";
  const unsigned =
    minimum === undefined
      ? maximum !== undefined && compareNumericValues(maximum, 0) >= 0
      : compareNumericValues(minimum, 0) >= 0;
  const candidates = INTEGER_TYPES.filter((candidate) =>
    candidate[0].startsWith(unsigned ? "u" : "i"),
  );
  const selected = candidates.find(
    (candidate) =>
      (minimum === undefined ||
        compareNumericValues(minimum, decimal(candidate[1])) >= 0) &&
      (maximum === undefined ||
        compareNumericValues(maximum, decimal(candidate[2])) <= 0) &&
      (constraints.exclusiveMinimum === undefined ||
        compareNumericValues(
          decimal(candidate[2]),
          constraints.exclusiveMinimum,
        ) > 0) &&
      (constraints.exclusiveMaximum === undefined ||
        compareNumericValues(
          decimal(candidate[1]),
          constraints.exclusiveMaximum,
        ) < 0),
  );
  if (!selected)
    throw new RustGenerationError(
      "unsupported-rust-integer-range",
      "Rust integer range exceeds the supported i128/u128 range.",
    );
  return selected[0];
}

function validateRepresentationRange(
  selected: string,
  constraints: ReturnType<typeof mergeNumericConstraints>,
): void {
  const candidate = INTEGER_TYPES.find((item) => item[0] === selected);
  if (!candidate) return;
  const minimum = constraints.minimum ?? constraints.exclusiveMinimum;
  const maximum = constraints.maximum ?? constraints.exclusiveMaximum;
  const minimumFits =
    minimum === undefined ||
    compareNumericValues(decimal(candidate[1]), minimum) <= 0;
  const maximumFits =
    maximum === undefined ||
    compareNumericValues(decimal(candidate[2]), maximum) >= 0;
  const exclusiveMinimumFits =
    constraints.exclusiveMinimum === undefined ||
    compareNumericValues(decimal(candidate[2]), constraints.exclusiveMinimum) >
      0;
  const exclusiveMaximumFits =
    constraints.exclusiveMaximum === undefined ||
    compareNumericValues(decimal(candidate[1]), constraints.exclusiveMaximum) <
      0;
  if (
    !minimumFits ||
    !maximumFits ||
    !exclusiveMinimumFits ||
    !exclusiveMaximumFits
  )
    throw new RustGenerationError(
      "incompatible-rust-representation",
      `Numeric constraints do not fit Rust representation ${selected}.`,
    );
}

function addConstraintLosses(
  selected: string,
  constraints: ReturnType<typeof mergeNumericConstraints>,
  path: string[],
  context: RenderContext,
): void {
  const candidate = INTEGER_TYPES.find((item) => item[0] === selected);
  if (!candidate) return;
  const typeRange = {
    minimum: decimal(candidate[1]),
    maximum: decimal(candidate[2]),
  };
  if (
    !areEquivalentNumericConstraintSets(constraints, typeRange) ||
    constraints.exclusiveMinimum !== undefined ||
    constraints.exclusiveMaximum !== undefined ||
    constraints.multipleOf !== undefined
  ) {
    context.notes.push({
      kind: "loss",
      code: "rust-constraint-not-enforced",
      message: `Rust type ${selected} does not fully enforce all numeric constraints.`,
      path,
      nodeKind: "type",
      source: "generator-rust",
      layer: "target",
      evidence: constraints,
    });
  }
}

function decimal(value: string): NumericValue {
  return { representation: "decimal", value };
}

function findRecursiveReferences(document: SchemaDocument): Set<string> {
  const definitions = new Map(
    document.definitions.map((definition) => [
      definition.name.source,
      definition.type,
    ]),
  );
  const graph = new Map<string, Set<string>>();
  for (const [name, node] of definitions) {
    const references = new Set<string>();
    collectReferences(node, references);
    graph.set(
      name,
      new Set(
        [...references].filter((reference) => definitions.has(reference)),
      ),
    );
  }
  const recursive = new Set<string>();
  for (const [source, targets] of graph) {
    for (const target of targets) {
      if (target === source || canReach(graph, target, source))
        recursive.add(`${source}->${target}`);
    }
  }
  return recursive;
}

function collectReferences(node: SchemaNode, references: Set<string>): void {
  switch (node.kind) {
    case "reference":
      references.add(node.name);
      return;
    case "array":
      collectReferences(node.elementType, references);
      return;
    case "record":
      collectReferences(node.value, references);
      return;
    case "union":
      node.members.forEach((member) => collectReferences(member, references));
      return;
    case "object":
      node.fields.forEach((field) => collectReferences(field.type, references));
      return;
    default:
      return;
  }
}

function canReach(
  graph: Map<string, Set<string>>,
  start: string,
  target: string,
): boolean {
  const visited = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of graph.get(current) ?? []) pending.push(next);
  }
  return false;
}
