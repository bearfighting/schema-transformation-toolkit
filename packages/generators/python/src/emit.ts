import type {
  IdentifierName,
  SchemaDefinition,
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
} from "@schema-transformation-toolkit/core";
import { PythonGenerationError } from "./failure.js";

const INDENT = "    ";

export function renderPythonDocument(document: SchemaDocument): string {
  const rootDefinitionName =
    document.root.kind === "reference" ? document.root.name : undefined;
  const rootDefinition = rootDefinitionName
    ? document.definitions.find(
        (definition) => definition.name.source === rootDefinitionName,
      )
    : undefined;
  if (rootDefinitionName && !rootDefinition) {
    throw new PythonGenerationError(
      "unsupported-python-root",
      `Python root reference "${rootDefinitionName}" has no definition.`,
    );
  }
  const sections = [
    ...document.definitions
      .filter((definition) => definition.name.source !== rootDefinitionName)
      .map((definition) => renderDefinition(definition)),
    rootDefinition ? renderDefinition(rootDefinition) : renderRoot(document),
  ];
  return [
    "from __future__ import annotations",
    "from dataclasses import dataclass",
    "",
    sections.join("\n\n"),
    "",
  ].join("\n");
}

function renderDefinition(definition: SchemaDefinition): string {
  return renderNamedNode(definition.name, definition.type);
}

function renderRoot(document: SchemaDocument): string {
  return renderNamedNode(document.rootName ?? document.name, document.root);
}

function renderNamedNode(name: IdentifierName, node: SchemaNode): string {
  if (node.kind === "record") return renderAlias(name.source, node);
  if (node.kind !== "object") {
    throw new PythonGenerationError(
      "unsupported-python-root",
      `Python dataclasses require object definitions; "${name.source}" is ${node.kind}.`,
    );
  }
  return renderObject(name.source, node);
}

function renderAlias(name: string, node: SchemaRecordNode): string {
  return `${pythonIdentifier(name)} = ${renderNode(node, true)}`;
}

function renderObject(name: string, node: SchemaObjectNode): string {
  if (node.additionalProperties) {
    throw new PythonGenerationError(
      "unsupported-python-node",
      "Python V1 does not generate typed additional properties.",
    );
  }
  const optionalField = node.fields.find((field) => !field.required);
  if (optionalField) {
    throw new PythonGenerationError(
      "unsupported-python-optional-field",
      `Python V1 cannot generate optional field presence for "${optionalField.name.source}" without preserving a dataclass default.`,
    );
  }
  return [
    "@dataclass",
    `class ${pythonIdentifier(name)}:`,
    node.fields.length === 0
      ? `${INDENT}pass`
      : node.fields
          .map(
            (field) =>
              `${INDENT}${pythonIdentifier(field.name.source)}: ${renderFieldType(field)}`,
          )
          .join("\n"),
  ].join("\n");
}

function renderFieldType(field: SchemaFieldNode): string {
  const type = renderNode(field.type);
  return field.nullable ? `${parenthesize(type)} | None` : type;
}

function renderNode(node: SchemaNode, quoteReferences = false): string {
  switch (node.kind) {
    case "scalar":
      if (node.scalar === "string") return "str";
      if (node.scalar === "integer") return "int";
      if (node.scalar === "number") return "float";
      if (node.scalar === "boolean") return "bool";
      break;
    case "reference":
      return quoteReferences
        ? JSON.stringify(pythonIdentifier(node.name))
        : pythonIdentifier(node.name);
    case "array":
      return `list[${renderNode(node.elementType, quoteReferences)}]`;
    case "record":
      return `dict[${renderNode(node.key, quoteReferences)}, ${renderNode(node.value, quoteReferences)}]`;
    case "union": {
      const nonNull = node.members.filter((member) => member.kind !== "null");
      if (
        nonNull.length === 1 &&
        nonNull.length !== node.members.length &&
        node.members.some((member) => member.kind === "null")
      ) {
        const member = nonNull[0]!;
        if (quoteReferences && containsReference(member))
          return JSON.stringify(`${renderNode(member)} | None`);
        return `${parenthesize(renderNode(member, quoteReferences))} | None`;
      }
      throw new PythonGenerationError(
        "unsupported-python-node",
        "Python V1 only supports nullable unions.",
      );
    }
    case "object": {
      throw new PythonGenerationError(
        "unsupported-python-node",
        "Inline object types are not supported by the Python generator.",
      );
    }
    default:
      throw new PythonGenerationError(
        "unsupported-python-node",
        `Unsupported Python Shape IR node "${node.kind}".`,
      );
  }
  throw new PythonGenerationError(
    "unsupported-python-node",
    `Unsupported Python scalar "${node.kind}".`,
  );
}

function containsReference(node: SchemaNode): boolean {
  switch (node.kind) {
    case "reference":
      return true;
    case "array":
      return containsReference(node.elementType);
    case "record":
      return containsReference(node.key) || containsReference(node.value);
    case "union":
      return node.members.some(containsReference);
    default:
      return false;
  }
}

function parenthesize(type: string): string {
  return type.includes(" | ") ? `(${type})` : type;
}

function pythonIdentifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name) || PYTHON_KEYWORDS.has(name)) {
    throw new PythonGenerationError(
      "invalid-python-identifier",
      `"${name}" is not a valid Python identifier.`,
    );
  }
  return name;
}

const PYTHON_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "case",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "match",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "type",
  "while",
  "with",
  "yield",
]);
