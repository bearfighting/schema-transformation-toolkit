import {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaUnionNode,
  type ScalarRepresentationHint,
  type SchemaDocument,
  type SchemaNode,
  type SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import { CSharpSemanticError } from "./failure.js";
import type {
  CSharpFileSyntax,
  CSharpRecordSyntax,
  CSharpTypeSyntax,
} from "./syntax.js";

interface MappedType {
  node: SchemaNode;
  nullable: boolean;
}
export interface CSharpSemanticResult {
  document: SchemaDocument;
  semanticNotes: SchemaSemanticNote[];
}

const scalarTypes: Record<
  string,
  {
    scalar: "string" | "integer" | "number" | "boolean";
    representation?: ScalarRepresentationHint;
  }
> = {
  string: { scalar: "string" },
  String: { scalar: "string" },
  bool: { scalar: "boolean" },
  Boolean: { scalar: "boolean" },
  sbyte: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 8 },
  },
  byte: {
    scalar: "integer",
    representation: { family: "integer", signedness: "unsigned", widthBits: 8 },
  },
  short: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 16 },
  },
  ushort: {
    scalar: "integer",
    representation: {
      family: "integer",
      signedness: "unsigned",
      widthBits: 16,
    },
  },
  int: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 32 },
  },
  uint: {
    scalar: "integer",
    representation: {
      family: "integer",
      signedness: "unsigned",
      widthBits: 32,
    },
  },
  long: {
    scalar: "integer",
    representation: { family: "integer", signedness: "signed", widthBits: 64 },
  },
  ulong: {
    scalar: "integer",
    representation: {
      family: "integer",
      signedness: "unsigned",
      widthBits: 64,
    },
  },
  nint: {
    scalar: "integer",
    representation: {
      family: "integer",
      signedness: "signed",
      widthBits: "pointer",
    },
  },
  nuint: {
    scalar: "integer",
    representation: {
      family: "integer",
      signedness: "unsigned",
      widthBits: "pointer",
    },
  },
  float: {
    scalar: "number",
    representation: { family: "float", widthBits: 32 },
  },
  double: {
    scalar: "number",
    representation: { family: "float", widthBits: 64 },
  },
  decimal: { scalar: "number", representation: { family: "decimal" } },
};
const unsupportedNamedTypes = new Set([
  "object",
  "char",
  "DateTime",
  "Guid",
  "BigInteger",
  "Half",
  "dynamic",
]);

export function mapCSharpFile(
  file: CSharpFileSyntax,
  name: string,
  entry?: string,
): CSharpSemanticResult {
  if (!file.declarations.length)
    throw new CSharpSemanticError(
      "invalid-csharp-data-model",
      "C# source must declare at least one record.",
    );
  const names = new Set<string>();
  for (const declaration of file.declarations) {
    if (names.has(declaration.name))
      throw new CSharpSemanticError(
        "duplicate-csharp-definition",
        `Duplicate C# definition "${declaration.name}".`,
        declaration.position,
      );
    names.add(declaration.name);
  }
  const rootName = selectRoot(file.declarations, names, entry);
  const mapped = new Map<string, SchemaNode>();
  for (const declaration of file.declarations)
    mapped.set(declaration.name, mapDeclaration(declaration, names));
  const root = mapped.get(rootName)!;
  const rootSelfReferenced = declarationReferencesName(
    file.declarations.find((d) => d.name === rootName)!,
    rootName,
  );
  const rootReferenced = file.declarations.some(
    (d) => d.name !== rootName && declarationReferencesName(d, rootName),
  );
  const rootNeedsDefinition = rootSelfReferenced || rootReferenced;
  const definitions = file.declarations
    .filter((d) => d.name !== rootName || rootNeedsDefinition)
    .map((d) => schemaDefinition(d.name, mapped.get(d.name)!));
  return {
    document: schemaDocument(
      name,
      rootNeedsDefinition ? schemaReferenceNode(rootName) : root,
      { rootName, definitions },
    ),
    semanticNotes: [],
  };
}

function selectRoot(
  declarations: CSharpRecordSyntax[],
  names: Set<string>,
  entry?: string,
): string {
  if (entry !== undefined) {
    if (!names.has(entry))
      throw new CSharpSemanticError(
        "invalid-csharp-entry",
        `C# entry "${entry}" does not name a declaration.`,
      );
    return entry;
  }
  if (declarations.length === 1) return declarations[0]!.name;
  const referenced = new Set<string>();
  for (const declaration of declarations)
    collectReferences(declaration, names, referenced);
  const roots = declarations
    .map((d) => d.name)
    .filter((name) => !referenced.has(name));
  if (roots.length === 1) return roots[0]!;
  if (roots.length === 0)
    throw new CSharpSemanticError(
      "missing-csharp-root",
      "C# source has no graph root; provide the entry option.",
    );
  throw new CSharpSemanticError(
    "ambiguous-csharp-root",
    "C# source has multiple graph roots; provide the entry option.",
  );
}

function collectReferences(
  declaration: CSharpRecordSyntax,
  names: Set<string>,
  referenced: Set<string>,
): void {
  for (const field of declaration.fields)
    collectTypeReferences(field.type, declaration.name, names, referenced);
}
function collectTypeReferences(
  type: CSharpTypeSyntax,
  owner: string,
  names: Set<string>,
  referenced: Set<string>,
): void {
  if (
    type.kind === "name" &&
    type.name &&
    names.has(type.name) &&
    type.name !== owner
  )
    referenced.add(type.name);
  for (const argument of type.arguments ?? [])
    collectTypeReferences(argument, owner, names, referenced);
  if (type.element)
    collectTypeReferences(type.element, owner, names, referenced);
}
function declarationReferencesName(
  declaration: CSharpRecordSyntax,
  target: string,
): boolean {
  return declaration.fields.some((field) =>
    typeReferencesName(field.type, target),
  );
}
function typeReferencesName(type: CSharpTypeSyntax, target: string): boolean {
  return (
    (type.kind === "name" && type.name === target) ||
    (type.element ? typeReferencesName(type.element, target) : false) ||
    (type.arguments ?? []).some((argument) =>
      typeReferencesName(argument, target),
    )
  );
}

function mapDeclaration(
  declaration: CSharpRecordSyntax,
  names: Set<string>,
): SchemaNode {
  const fieldNames = new Set<string>();
  return schemaObjectNode(
    declaration.fields.map((field) => {
      if (fieldNames.has(field.name))
        throw new CSharpSemanticError(
          "duplicate-csharp-field",
          `Duplicate C# field "${field.name}".`,
          field.position,
        );
      fieldNames.add(field.name);
      const mapped = mapType(field.type, names);
      return schemaFieldNode(field.name, mapped.node, {
        required: field.required,
        nullable: mapped.nullable,
      });
    }),
  );
}

function mapType(type: CSharpTypeSyntax, names: Set<string>): MappedType {
  if (type.kind === "array") {
    const element = mapType(type.element!, names);
    return {
      node: schemaArrayNode(nullableNested(element)),
      nullable: type.nullable,
    };
  }
  if (type.kind === "generic") {
    const args = type.arguments ?? [];
    if (["List", "IReadOnlyList", "IEnumerable"].includes(type.name!)) {
      if (args.length !== 1)
        throw new CSharpSemanticError(
          "unsupported-csharp-generic",
          `${type.name} requires exactly one type argument.`,
          type.position,
        );
      const element = mapType(args[0]!, names);
      return {
        node: schemaArrayNode(nullableNested(element)),
        nullable: type.nullable,
      };
    }
    if (["Dictionary", "IReadOnlyDictionary"].includes(type.name!)) {
      if (args.length !== 2)
        throw new CSharpSemanticError(
          "unsupported-csharp-generic",
          `${type.name} requires exactly two type arguments.`,
          type.position,
        );
      const key = args[0]!;
      if (
        key.kind !== "name" ||
        (key.name !== "string" && key.name !== "String") ||
        key.nullable
      )
        throw new CSharpSemanticError(
          "unsupported-csharp-map-key",
          "Only string-keyed C# dictionaries are representable.",
          key.position,
        );
      const value = mapType(args[1]!, names);
      return {
        node: schemaRecordNode(
          schemaScalarNode("string"),
          nullableNested(value),
        ),
        nullable: type.nullable,
      };
    }
    throw new CSharpSemanticError(
      "unsupported-csharp-generic",
      `C# generic type "${type.name}" is not supported in PR3.`,
      type.position,
    );
  }
  const definition = scalarTypes[type.name!];
  if (definition)
    return {
      node: schemaScalarNode(
        definition.scalar,
        definition.representation
          ? { representation: definition.representation }
          : undefined,
      ),
      nullable: type.nullable,
    };
  if (names.has(type.name!))
    return { node: schemaReferenceNode(type.name!), nullable: type.nullable };
  if (unsupportedNamedTypes.has(type.name!))
    throw new CSharpSemanticError(
      "unsupported-csharp-type",
      `C# type "${type.name}" is not supported in PR3.`,
      type.position,
    );
  throw new CSharpSemanticError(
    "unknown-csharp-reference",
    `C# type "${type.name}" does not name a declaration in this source.`,
    type.position,
  );
}
function nullableNested(mapped: MappedType): SchemaNode {
  return mapped.nullable
    ? schemaUnionNode([mapped.node, { kind: "null" }])
    : mapped.node;
}
