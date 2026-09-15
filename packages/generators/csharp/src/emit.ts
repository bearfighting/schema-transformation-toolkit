import type {
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
} from "@schema-transformation-toolkit/core";
import { CSharpGenerationError } from "./failure.js";
import type { ResolvedCSharpGeneratorOptions } from "./options.js";

const CSHARP_KEYWORDS = new Set([
  "abstract",
  "as",
  "base",
  "bool",
  "break",
  "byte",
  "case",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "do",
  "double",
  "else",
  "enum",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "is",
  "lock",
  "long",
  "namespace",
  "new",
  "null",
  "object",
  "operator",
  "out",
  "override",
  "params",
  "private",
  "protected",
  "public",
  "readonly",
  "ref",
  "return",
  "sbyte",
  "sealed",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unsafe",
  "ushort",
  "using",
  "virtual",
  "void",
  "volatile",
  "while",
  "add",
  "alias",
  "and",
  "ascending",
  "async",
  "await",
  "by",
  "descending",
  "dynamic",
  "equals",
  "file",
  "from",
  "get",
  "global",
  "group",
  "init",
  "into",
  "join",
  "let",
  "managed",
  "nameof",
  "not",
  "nint",
  "notnull",
  "on",
  "or",
  "orderby",
  "partial",
  "record",
  "remove",
  "required",
  "scoped",
  "select",
  "set",
  "unmanaged",
  "value",
  "var",
  "when",
  "where",
  "with",
  "yield",
]);

interface RenderContext {
  definitions: Map<string, SchemaNode>;
  declarationNames: Set<string>;
}

export function renderCSharpDocument(
  document: SchemaDocument,
  options: ResolvedCSharpGeneratorOptions,
): string {
  void options;
  const rootName =
    document.root.kind === "reference"
      ? document.root.name
      : (document.rootName?.source ?? document.name.source);
  const definitions = new Map(
    document.definitions.map((definition) => [
      definition.name.source,
      definition.type,
    ]),
  );
  const context: RenderContext = { definitions, declarationNames: new Set() };
  const rootNode =
    document.root.kind === "reference"
      ? resolveDefinition(rootName, context)
      : document.root;

  if (rootNode.kind !== "object") {
    throw new CSharpGenerationError(
      "unsupported-csharp-root",
      "C# generator requires an object root.",
    );
  }

  const declarations = [renderObject(rootName, rootNode, context)];
  for (const definition of document.definitions) {
    if (definition.name.source === rootName) {
      if (document.root.kind !== "reference") {
        throw new CSharpGenerationError(
          "duplicate-csharp-definition",
          `C# inline root "${rootName}" conflicts with a definition of the same name.`,
        );
      }
      continue;
    }
    if (definition.type.kind !== "object") {
      throw new CSharpGenerationError(
        "unsupported-csharp-node",
        `C# definition "${definition.name.source}" must be an object in PR1.`,
      );
    }
    declarations.push(
      renderObject(definition.name.source, definition.type, context),
    );
  }

  return `#nullable enable\n\n${declarations.join("\n\n")}\n`;
}

function renderObject(
  name: string,
  node: Extract<SchemaNode, { kind: "object" }>,
  context: RenderContext,
): string {
  if (node.additionalProperties !== undefined) {
    throw new CSharpGenerationError(
      "unsupported-csharp-node",
      `C# PR1 does not support additional properties on "${name}".`,
    );
  }
  const declarationName = csharpIdentifier(name);
  if (context.declarationNames.has(declarationName)) {
    throw new CSharpGenerationError(
      "duplicate-csharp-definition",
      `C# declaration "${name}" renders to duplicate identifier "${declarationName}".`,
    );
  }
  context.declarationNames.add(declarationName);
  const fields = node.fields.map((field) => renderField(field, context));
  return [
    `public sealed record ${declarationName}`,
    "{",
    ...fields.map((field) => `    ${field}`),
    "}",
  ].join("\n");
}

function renderField(field: SchemaFieldNode, context: RenderContext): string {
  const name = csharpIdentifier(field.name.source);
  const type = renderType(field.type, field.nullable, context);
  const initializer = field.required
    ? ""
    : field.nullable
      ? " = null;"
      : " = default!;";
  return `public ${type} ${name} { get; init; }${initializer}`;
}

function renderType(
  node: SchemaNode,
  nullable: boolean,
  context: RenderContext,
): string {
  if (node.kind === "union") {
    const nonNull = node.members.filter((member) => member.kind !== "null");
    if (nonNull.length === 1 && nonNull.length < node.members.length) {
      return renderType(nonNull[0]!, true, context);
    }
    throw new CSharpGenerationError(
      "unsupported-csharp-node",
      "C# PR1 only supports nullable unions with one non-null member.",
    );
  }

  let type: string;
  switch (node.kind) {
    case "scalar":
      if (node.representation) {
        throw new CSharpGenerationError(
          "unsupported-csharp-representation",
          "C# PR1 does not preserve scalar representation hints.",
        );
      }
      type =
        node.scalar === "string"
          ? "string"
          : node.scalar === "boolean"
            ? "bool"
            : node.scalar === "integer"
              ? "long"
              : node.scalar === "number"
                ? "double"
                : (() => {
                    throw new CSharpGenerationError(
                      "unsupported-csharp-node",
                      `C# PR1 does not support scalar "${node.scalar}".`,
                    );
                  })();
      break;
    case "reference":
      resolveDefinition(node.name, context);
      type = csharpIdentifier(node.name);
      break;
    case "array":
      type = `${renderType(node.elementType, false, context)}[]`;
      break;
    default:
      throw new CSharpGenerationError(
        "unsupported-csharp-node",
        `C# PR1 does not support Shape IR node "${node.kind}".`,
      );
  }

  return nullable ? `${type}?` : type;
}

function resolveDefinition(name: string, context: RenderContext): SchemaNode {
  const definition = context.definitions.get(name);
  if (!definition) {
    throw new CSharpGenerationError(
      "unresolved-csharp-reference",
      `C# reference "${name}" does not resolve to a definition.`,
    );
  }
  return definition;
}

function csharpIdentifier(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
    throw new CSharpGenerationError(
      "invalid-csharp-identifier",
      `C# identifier "${name}" is not a supported ASCII identifier.`,
    );
  }
  return CSHARP_KEYWORDS.has(name) ? `@${name}` : name;
}
