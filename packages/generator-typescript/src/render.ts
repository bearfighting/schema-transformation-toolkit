import type {
  ArrayTypeNode,
  ConfiguredGenerator,
  FieldNode,
  GenerateOptions,
  PreparedOptions,
  GenerateSuccessResult,
  IdentifierName,
  NamingStrategy,
  ObjectTypeNode,
  ScalarTypeNode,
  SchemaDocument,
  SchemaGenerator,
  TypeNode
} from "@aio/core";
import { createNamingStrategy } from "@aio/core";

const TYPESCRIPT_RESERVED_WORDS = [
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "as",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
  "any",
  "boolean",
  "constructor",
  "declare",
  "get",
  "module",
  "require",
  "number",
  "set",
  "string",
  "symbol",
  "type",
  "from",
  "of"
] as const;
const INDENT = "  ";

export interface TypeScriptGeneratorOptions extends GenerateOptions {
  namingStrategy?: NamingStrategy;
}

export interface ResolvedTypeScriptGeneratorOptions {
  namingStrategy: NamingStrategy;
}

export interface PreparedTypeScriptGeneratorOptions {
  resolved: ResolvedTypeScriptGeneratorOptions;
  warnings: string[];
  errors: string[];
}

export const DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS: ResolvedTypeScriptGeneratorOptions = {
  namingStrategy: createTypeScriptNamingStrategy()
};
const defaultConfiguredTypeScriptGenerator = configureTypeScriptGenerator();
const defaultTypeScriptGenerator = defaultConfiguredTypeScriptGenerator.generator;

export function generateTypeScript(doc: SchemaDocument): string {
  return renderTypeScriptDocument(doc, resolveTypeScriptGeneratorOptions());
}

export function createTypeScriptGenerator(
  options: TypeScriptGeneratorOptions = {}
): SchemaGenerator<string, GenerateOptions, GenerateSuccessResult<string>> {
  return configureTypeScriptGenerator(options).generator;
}

export function resolveTypeScriptGeneratorOptions(
  options: TypeScriptGeneratorOptions = {}
): ResolvedTypeScriptGeneratorOptions {
  return {
    namingStrategy: options.namingStrategy ?? DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.namingStrategy
  };
}

export function prepareTypeScriptGeneratorOptions(
  options: TypeScriptGeneratorOptions = {}
): PreparedOptions<ResolvedTypeScriptGeneratorOptions> {
  const resolved = resolveTypeScriptGeneratorOptions(options);

  return {
    resolved,
    warnings: [],
    errors: validateTypeScriptGeneratorOptions(resolved)
  };
}

export function validateTypeScriptGeneratorOptions(
  options: ResolvedTypeScriptGeneratorOptions
): string[] {
  const errors: string[] = [];

  if (
    typeof options.namingStrategy.renderTypeName !== "function" ||
    typeof options.namingStrategy.renderFieldName !== "function"
  ) {
    errors.push("namingStrategy must provide renderTypeName() and renderFieldName().");
  }

  return errors;
}

export function configureTypeScriptGenerator(
  options: TypeScriptGeneratorOptions = {}
): ConfiguredGenerator<
  SchemaGenerator<string, GenerateOptions, GenerateSuccessResult<string>>,
  ResolvedTypeScriptGeneratorOptions
> {
  const prepared = prepareTypeScriptGeneratorOptions(options);

  if (prepared.errors.length > 0) {
    throw new Error(
      `Invalid TypeScript generator options: ${prepared.errors.join("; ")}`
    );
  }

  return {
    prepared,
    generator: {
      target: "typescript",
      generate(document) {
        return {
          ok: true,
          output: renderTypeScriptDocument(document, prepared.resolved)
        };
      }
    }
  };
}

function renderTypeScriptDocument(
  doc: SchemaDocument,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  if (doc.root.kind === "object") {
    return renderRootInterface(doc.name, doc.root, options);
  }

  return `export type ${renderTypeName(doc.name, options)} = ${renderTypeNode(doc.root, 0, options)};`;
}

function renderRootInterface(
  name: IdentifierName,
  node: ObjectTypeNode,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  const fields = node.fields.map((field) => renderFieldNode(field, 1, options)).join("\n");

  return `export interface ${renderTypeName(name, options)} {\n${fields}\n}`;
}

function renderFieldNode(
  field: FieldNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  const optionalMarker = field.required ? "" : "?";
  const fieldType = renderFieldType(field, options);

  return `${indent(depth)}${renderFieldName(field.name, options)}${optionalMarker}: ${fieldType};`;
}

function renderFieldType(field: FieldNode, options: ResolvedTypeScriptGeneratorOptions): string {
  const renderedType = renderTypeNode(field.type, 1, options);

  if (!field.nullable) {
    return renderedType;
  }

  return `${wrapForUnion(renderedType)} | null`;
}

function renderTypeNode(
  node: TypeNode,
  depth = 0,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  if (node.kind === "scalar") {
    return renderScalarType(node);
  }

  if (node.kind === "unknown") {
    return renderUnknownType(node);
  }

  if (node.kind === "array") {
    return renderArrayType(node, depth, options);
  }

  return renderInlineObjectType(node, depth, options);
}

function renderScalarType(node: ScalarTypeNode): string {
  switch (node.scalar) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
  }
}

function renderUnknownType(node: Extract<TypeNode, { kind: "unknown" }>): string {
  if (node.nullable) {
    return "unknown | null";
  }

  return "unknown";
}

function renderArrayType(
  node: ArrayTypeNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  const renderedElementType = renderTypeNode(node.elementType, depth, options);

  return `${wrapForArray(renderedElementType)}[]`;
}

function renderInlineObjectType(
  node: ObjectTypeNode,
  depth: number,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  const fields = node.fields.map((field) => renderFieldNode(field, depth + 1, options)).join("\n");

  return `{\n${fields}\n${indent(depth)}}`;
}

function wrapForArray(renderedType: string): string {
  if (renderedType.startsWith("{\n")) {
    return `(${renderedType})`;
  }

  if (renderedType.includes(" | ")) {
    return `(${renderedType})`;
  }

  return renderedType;
}

function wrapForUnion(renderedType: string): string {
  if (renderedType.startsWith("{\n")) {
    return `(${renderedType})`;
  }

  return renderedType;
}

function indent(depth: number): string {
  return INDENT.repeat(depth);
}

function renderTypeName(
  name: IdentifierName,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  return options.namingStrategy.renderTypeName(name);
}

function renderFieldName(
  name: IdentifierName,
  options: ResolvedTypeScriptGeneratorOptions
): string {
  return options.namingStrategy.renderFieldName(name);
}

function createTypeScriptNamingStrategy(): NamingStrategy {
  return createNamingStrategy({
    typeName: {
      style: "pascal",
      emptyFallback: "GeneratedType",
      invalidPrefix: "_",
      reservedWords: [...TYPESCRIPT_RESERVED_WORDS],
      reservedWordHandling: "suffix",
      reservedWordSuffix: "_"
    },
    fieldName: {
      style: "camel",
      fallback: "quoted",
      invalidPrefix: "_",
      reservedWords: [...TYPESCRIPT_RESERVED_WORDS],
      reservedWordHandling: "suffix",
      reservedWordSuffix: "_"
    }
  });
}

export const typeScriptGenerator: SchemaGenerator<
  string,
  GenerateOptions,
  GenerateSuccessResult<string>
> = defaultTypeScriptGenerator;
export const preparedTypeScriptGeneratorOptions = defaultConfiguredTypeScriptGenerator.prepared;
