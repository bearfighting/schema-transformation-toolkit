import {
  schemaArrayNode,
  schemaDocument,
  schemaFieldNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  schemaDefinition,
  type SchemaDocument,
  type SchemaNode,
} from "@schema-transformation-toolkit/core";
import {
  parsePythonType,
  type PythonAliasSyntax,
  type PythonClassSyntax,
  type PythonFileSyntax,
  type PythonTypeSyntax,
} from "./syntax.js";
import type { PythonPosition } from "./syntax.js";
import type { PythonFailureCode } from "./failure.js";

export class PythonSemanticError extends Error {
  constructor(
    readonly code: PythonFailureCode,
    message: string,
    readonly position?: PythonPosition,
  ) {
    super(message);
    this.name = "PythonSemanticError";
  }
}

export function mapPythonFile(
  file: PythonFileSyntax,
  name: string,
  entry?: string,
): SchemaDocument {
  const declarations = [...file.classes, ...file.aliases];
  if (!declarations.length)
    throw new PythonSemanticError(
      "invalid-python-data-model",
      "Python source must declare at least one supported dataclass or map alias.",
    );
  const root = entry
    ? declarations.find((item) => item.name === entry)
    : declarations.length === 1
      ? declarations[0]
      : undefined;
  if (!root)
    throw new PythonSemanticError(
      entry ? "missing-python-entry" : "ambiguous-python-entry",
      entry
        ? `Python entry definition "${entry}" was not found.`
        : "Python source has multiple definitions; an entry option is required.",
    );
  const names = new Set(declarations.map((item) => item.name));
  const mapped = new Map(
    declarations.map(
      (item) =>
        [
          item.name,
          "fields" in item ? mapClass(item, names) : mapAlias(item, names),
        ] as const,
    ),
  );
  const rootNode = mapped.get(root.name)!;
  const rootIsReferenced = declarations.some((item) =>
    schemaNodeReferencesName(mapped.get(item.name)!, root.name),
  );
  const definitions = declarations
    .filter((item) => item !== root || rootIsReferenced)
    .map((item) => schemaDefinition(item.name, mapped.get(item.name)!));
  return schemaDocument(
    name,
    rootIsReferenced ? schemaReferenceNode(root.name) : rootNode,
    { definitions, rootName: root.name },
  );
}

function schemaNodeReferencesName(node: SchemaNode, name: string): boolean {
  switch (node.kind) {
    case "reference":
      return node.name === name;
    case "array":
      return schemaNodeReferencesName(node.elementType, name);
    case "union":
      return node.members.some((member) =>
        schemaNodeReferencesName(member, name),
      );
    case "object":
      return node.fields.some((field) =>
        schemaNodeReferencesName(field.type, name),
      );
    case "record":
      return (
        schemaNodeReferencesName(node.key, name) ||
        schemaNodeReferencesName(node.value, name)
      );
    default:
      return false;
  }
}

function mapAlias(item: PythonAliasSyntax, names: Set<string>): SchemaNode {
  let type: PythonTypeSyntax;
  try {
    type = parsePythonType(item.annotation, { allowQuoted: true });
  } catch (error) {
    if (error instanceof Error)
      throw new PythonSemanticError(
        "invalid-python-syntax",
        error.message,
        item.position,
      );
    throw error;
  }
  const mapped = mapType(type, names, false, item.position);
  if (mapped.nullable || mapped.node.kind !== "record")
    throw new PythonSemanticError(
      "unsupported-python-type",
      "Python V1 only supports aliases of the form Name = dict[str, T].",
      item.position,
    );
  return mapped.node;
}

function mapClass(item: PythonClassSyntax, names: Set<string>): SchemaNode {
  return schemaObjectNode(
    item.fields.map((field) => {
      if (/^['"]|['"]$/u.test(field.annotation))
        throw new PythonSemanticError(
          "unsupported-python-type",
          "Quoted forward references are not supported in Python V1.",
          field.position,
        );
      if (/^(?:Literal|Annotated)\s*\[/u.test(field.annotation))
        throw new PythonSemanticError(
          "unsupported-python-type",
          `Python type annotation "${field.annotation}" is not supported in V1.`,
          field.position,
        );
      let type: PythonTypeSyntax;
      try {
        type = parsePythonType(field.annotation);
      } catch (error) {
        if (error instanceof Error)
          throw new PythonSemanticError(
            "invalid-python-syntax",
            error.message,
            field.position,
          );
        throw error;
      }
      const parsed = mapType(type, names, false, field.position);
      return schemaFieldNode(field.name, parsed.node, {
        required: true,
        nullable: parsed.nullable,
      });
    }),
  );
}

function mapType(
  type: PythonTypeSyntax,
  names: Set<string>,
  nested = false,
  position?: PythonPosition,
): { node: SchemaNode; nullable: boolean } {
  if (type.kind === "union") {
    const members = type.members ?? [];
    const nullMembers = members.filter(
      (member) => member.kind === "name" && member.name === "None",
    );
    if (nullMembers.length !== 1 || members.length !== 2)
      throw new PythonSemanticError(
        "unsupported-python-union",
        "Python V1 only supports nullable unions of the form T | None.",
        position,
      );
    const other = members.find(
      (member) => !(member.kind === "name" && member.name === "None"),
    )!;
    const mapped = mapType(other, names, nested, position);
    return nested
      ? {
          node: schemaUnionNode([mapped.node, schemaNullNode()]),
          nullable: false,
        }
      : { ...mapped, nullable: true };
  }
  if (type.kind === "generic") {
    const args = type.arguments ?? [];
    if (type.name === "list") {
      if (args.length !== 1)
        throw new PythonSemanticError(
          "unsupported-python-type",
          "list[T] requires exactly one type argument.",
          position,
        );
      const mapped = mapType(args[0]!, names, true, position);
      return { node: schemaArrayNode(mapped.node), nullable: false };
    }
    if (type.name === "Optional") {
      if (args.length !== 1)
        throw new PythonSemanticError(
          "unsupported-python-type",
          "Optional[T] requires exactly one type argument.",
          position,
        );
      const mapped = mapType(args[0]!, names, nested, position);
      return nested
        ? {
            node: schemaUnionNode([mapped.node, schemaNullNode()]),
            nullable: false,
          }
        : { ...mapped, nullable: true };
    }
    if (type.name === "dict") {
      if (args.length !== 2)
        throw new PythonSemanticError(
          "unsupported-python-type",
          "dict[str, T] requires exactly two type arguments.",
          position,
        );
      const key = mapType(args[0]!, names, true, position);
      if (key.node.kind !== "scalar" || key.node.scalar !== "string")
        throw new PythonSemanticError(
          "unsupported-python-type",
          "Python V1 only supports string-keyed dict[str, T] maps.",
          position,
        );
      const value = mapType(args[1]!, names, true, position);
      return { node: schemaRecordNode(key.node, value.node), nullable: false };
    }
    throw new PythonSemanticError(
      "unsupported-python-type",
      `Python generic type "${type.name}" is not supported in V1.`,
      position,
    );
  }
  if (type.name === "str")
    return { node: schemaScalarNode("string"), nullable: false };
  if (type.name === "int")
    return { node: schemaScalarNode("integer"), nullable: false };
  if (type.name === "float")
    return { node: schemaScalarNode("number"), nullable: false };
  if (type.name === "bool")
    return { node: schemaScalarNode("boolean"), nullable: false };
  if (type.name === "None") return { node: schemaNullNode(), nullable: false };
  if (type.name && names.has(type.name))
    return { node: schemaReferenceNode(type.name), nullable: false };
  throw new PythonSemanticError(
    isKnownUnsupportedPythonName(type.name)
      ? "unsupported-python-type"
      : "unknown-python-reference",
    `Python type "${type.name ?? "unknown"}" is not supported or is not a known dataclass reference.`,
    position,
  );
}

function isKnownUnsupportedPythonName(name: string | undefined): boolean {
  return UNSUPPORTED_PYTHON_NAMES.has(name ?? "");
}

const UNSUPPORTED_PYTHON_NAMES = new Set([
  "Any",
  "BaseModel",
  "Enum",
  "NamedTuple",
  "TypedDict",
  "TypeVar",
  "object",
]);
