import type {
  ScalarKind,
  ScalarRepresentationHint,
  SchemaDocument,
  SchemaFieldNode,
  SchemaNode,
  SchemaSemanticNoteKind,
} from "@schema-transformation-toolkit/core";
import { CSharpGenerationError } from "./failure.js";
import type { ResolvedCSharpGeneratorOptions } from "./options.js";

const LIST_IMPORT = "System.Collections.Generic";
const NUMERICS_IMPORT = "System.Numerics";

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

interface RenderNote {
  kind: Extract<SchemaSemanticNoteKind, "loss" | "widening">;
  code: string;
  message: string;
  path?: string[];
}

interface RenderContext {
  definitions: Map<string, SchemaNode>;
  declarationNames: Set<string>;
  imports: Set<string>;
  notes: RenderNote[];
}

export interface CSharpRenderResult {
  output: string;
  notes: RenderNote[];
}

export function renderCSharpDocument(
  document: SchemaDocument,
  options: ResolvedCSharpGeneratorOptions,
): CSharpRenderResult {
  const context: RenderContext = {
    definitions: new Map(
      document.definitions.map((definition) => [
        definition.name.source,
        definition.type,
      ]),
    ),
    declarationNames: new Set(),
    imports: new Set(),
    notes: [],
  };
  const rootName =
    document.root.kind === "reference"
      ? document.root.name
      : (document.rootName?.source ?? document.name.source);
  const rootNode =
    document.root.kind === "reference"
      ? resolveDefinition(rootName, context)
      : document.root;

  assertDeclarationNode(rootNode, true);

  const rootDefinitionCount = document.definitions.filter(
    (definition) => definition.name.source === rootName,
  ).length;
  if (document.root.kind === "reference" && rootDefinitionCount > 1) {
    throw new CSharpGenerationError(
      "duplicate-csharp-definition",
      `C# root reference "${rootName}" has duplicate definitions.`,
    );
  }

  const declarations = [
    renderDeclaration(rootName, rootNode, context, options),
  ];
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
    assertDeclarationNode(definition.type, false, definition.name.source);
    declarations.push(
      renderDeclaration(
        definition.name.source,
        definition.type,
        context,
        options,
      ),
    );
  }

  const imports = [...context.imports]
    .sort()
    .map((value) => `using ${value};`)
    .join("\n");
  const namespaceOutput = options.namespace
    ? `namespace ${renderNamespace(options.namespace)};\n\n`
    : "";
  const prefix = `#nullable enable\n\n${imports ? `${imports}\n\n` : ""}${namespaceOutput}`;
  return {
    output: `${prefix}${declarations.join("\n\n")}\n`,
    notes: context.notes,
  };
}

function assertDeclarationNode(
  node: SchemaNode,
  isRoot: boolean,
  name?: string,
): asserts node is Extract<SchemaNode, { kind: "object" | "union" }> {
  if (isDeclarationNode(node)) return;

  if (node.kind === "union") {
    throw new CSharpGenerationError(
      "unsupported-csharp-enum",
      `${isRoot ? "C# root" : `C# definition "${name}"`} enum must be a string literal union.`,
    );
  }

  throw new CSharpGenerationError(
    isRoot ? "unsupported-csharp-root" : "unsupported-csharp-node",
    isRoot
      ? "C# generator requires an object root or a string literal union enum root."
      : `C# definition "${name}" must be an object or string literal union.`,
  );
}

function renderDeclaration(
  name: string,
  node: SchemaNode,
  context: RenderContext,
  options: ResolvedCSharpGeneratorOptions,
): string {
  const declarationName = reserveDeclarationName(name, context);
  if (isEnumUnion(node)) return renderEnum(declarationName, node, context);
  if (node.kind !== "object") {
    throw new CSharpGenerationError(
      "unsupported-csharp-node",
      `C# definition "${name}" must be an object or string literal union.`,
    );
  }
  if (node.additionalProperties !== undefined) {
    throw new CSharpGenerationError(
      "unsupported-csharp-node",
      `C# PR2 does not support additional properties on "${name}".`,
    );
  }
  const keyword = options.style === "class" ? "class" : "record";
  const fields = node.fields.map((field) => renderField(field, context));
  return [
    `public sealed ${keyword} ${declarationName}`,
    "{",
    ...fields.map((field) => `    ${field}`),
    "}",
  ].join("\n");
}

function renderField(field: SchemaFieldNode, context: RenderContext): string {
  const name = csharpIdentifier(field.name.source);
  const type = renderType(field.type, field.nullable, context);
  const required = field.required ? "required " : "";
  const initializer = field.required
    ? ""
    : field.nullable
      ? " = null;"
      : " = default!;";
  return `public ${required}${type} ${name} { get; init; }${initializer}`;
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
      "C# PR2 only supports nullable unions with one non-null member.",
    );
  }

  let type: string;
  switch (node.kind) {
    case "scalar":
      type = renderScalar(node.scalar, node.representation, context);
      break;
    case "reference":
      resolveDefinition(node.name, context);
      type = csharpIdentifier(node.name);
      break;
    case "array":
      context.imports.add(LIST_IMPORT);
      type = `IReadOnlyList<${renderType(node.elementType, false, context)}>`;
      break;
    case "record":
      if (node.key.kind !== "scalar" || node.key.scalar !== "string") {
        throw new CSharpGenerationError(
          "unsupported-csharp-node",
          "C# string-keyed maps require a string record key.",
        );
      }
      context.imports.add(LIST_IMPORT);
      type = `IReadOnlyDictionary<string, ${renderType(node.value, false, context)}>`;
      break;
    case "literal":
      throw new CSharpGenerationError(
        "unsupported-csharp-node",
        "C# PR2 only supports literals inside named string enum unions.",
      );
    default:
      throw new CSharpGenerationError(
        "unsupported-csharp-node",
        `C# PR2 does not support Shape IR node "${node.kind}".`,
      );
  }
  return nullable ? nullableType(type) : type;
}

function renderScalar(
  scalar: ScalarKind,
  representation: ScalarRepresentationHint | undefined,
  context: RenderContext,
): string {
  if (!representation) return defaultScalarType(scalar);
  if (representation.family === "decimal" && scalar === "number")
    return "decimal";
  if (representation.family === "float" && scalar === "number") {
    if (representation.widthBits === 32) return "float";
    if (
      representation.widthBits === 64 ||
      representation.widthBits === undefined
    )
      return "double";
  }
  if (representation.family === "integer" && scalar === "integer") {
    const unsigned = representation.signedness === "unsigned";
    if (representation.widthBits === 8) return unsigned ? "byte" : "sbyte";
    if (representation.widthBits === 16) return unsigned ? "ushort" : "short";
    if (representation.widthBits === 32) return unsigned ? "uint" : "int";
    if (
      representation.widthBits === 64 ||
      representation.widthBits === undefined
    )
      return unsigned ? "ulong" : "long";
    if (representation.widthBits === 128) {
      context.imports.add(NUMERICS_IMPORT);
      context.notes.push({
        kind: "widening",
        code: "csharp-integer-representation-widened",
        message: "128-bit integer representation is emitted as BigInteger.",
      });
      return "BigInteger";
    }
    if (representation.widthBits === "pointer")
      return unsigned ? "nuint" : "nint";
  }
  const fallback = defaultScalarType(scalar);
  context.notes.push({
    kind: "loss",
    code: "csharp-scalar-representation-lost",
    message: `C# representation for ${scalar} could not be preserved; emitted ${fallback}.`,
  });
  return fallback;
}

function renderEnum(
  name: string,
  node: Extract<SchemaNode, { kind: "union" }>,
  context: RenderContext,
): string {
  const members = new Set<string>();
  const rendered = node.members.map((member) => {
    if (member.kind !== "literal" || typeof member.value !== "string") {
      throw new CSharpGenerationError(
        "unsupported-csharp-enum",
        `C# enum "${name}" requires string literal members.`,
      );
    }
    const memberName = normalizeEnumMember(member.value);
    const key = memberName.toLowerCase();
    if (members.has(key)) {
      throw new CSharpGenerationError(
        "csharp-enum-name-collision",
        `C# enum "${name}" has members that collide as "${memberName}".`,
      );
    }
    members.add(key);
    if (memberName !== member.value) {
      context.notes.push({
        kind: "loss",
        code: "csharp-enum-member-renamed",
        message: `C# enum member "${member.value}" was normalized to "${memberName}".`,
      });
    }
    return memberName;
  });
  return [
    `public enum ${name}`,
    "{",
    ...rendered.map(
      (member, index) =>
        `    ${member}${index < rendered.length - 1 ? "," : ""}`,
    ),
    "}",
  ].join("\n");
}

function normalizeEnumMember(value: string): string {
  const words =
    value.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").match(/[A-Za-z0-9]+/gu) ?? [];
  let normalized = words
    .map((word) => {
      const lower = word.toLowerCase();
      return lower[0]!.toUpperCase() + lower.slice(1);
    })
    .join("");
  if (!normalized) normalized = "Value";
  if (/^[0-9]/u.test(normalized)) normalized = `Value${normalized}`;
  return csharpIdentifier(normalized);
}

function renderNamespace(namespaceValue: string): string {
  return namespaceValue.split(".").map(csharpIdentifier).join(".");
}

function reserveDeclarationName(name: string, context: RenderContext): string {
  const rendered = csharpIdentifier(name);
  if (context.declarationNames.has(rendered)) {
    throw new CSharpGenerationError(
      "duplicate-csharp-definition",
      `C# declaration "${name}" renders to duplicate identifier "${rendered}".`,
    );
  }
  context.declarationNames.add(rendered);
  return rendered;
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

function nullableType(type: string): string {
  return type.endsWith("?") ? type : `${type}?`;
}

function defaultScalarType(scalar: ScalarKind): string {
  if (scalar === "string") return "string";
  if (scalar === "boolean") return "bool";
  if (scalar === "integer") return "long";
  return "double";
}

function isEnumUnion(
  node: SchemaNode,
): node is Extract<SchemaNode, { kind: "union" }> {
  return (
    node.kind === "union" &&
    node.members.length > 0 &&
    node.members.every(
      (member) => member.kind === "literal" && typeof member.value === "string",
    )
  );
}

function isDeclarationNode(node: SchemaNode): boolean {
  return node.kind === "object" || isEnumUnion(node);
}
