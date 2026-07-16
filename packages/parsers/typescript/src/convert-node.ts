import {
  schemaArrayNode,
  schemaDefinition,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  type SchemaTupleElement,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  type SchemaDiagnosticNodeKind,
  type SchemaFieldNode,
  type SchemaNode,
} from "@aio/core";
import ts from "typescript";
import { convertTypeScriptEnumDeclaration } from "./convert-enum.js";
import { createTypeScriptUnsupportedDiagnostic } from "./diagnostics.js";
import { throwTypeScriptInferenceError } from "./errors.js";
import { getTypeScriptSourceLocation } from "./syntax.js";
import type {
  TypeScriptConvertContext,
  TypeScriptEntryDeclaration,
} from "./types.js";

export function convertTypeScriptTypeNode(
  node: ts.TypeNode,
  context: TypeScriptConvertContext,
): SchemaNode {
  if (node.kind === ts.SyntaxKind.StringKeyword) {
    return schemaScalarNode("string");
  }

  if (node.kind === ts.SyntaxKind.NumberKeyword) {
    return schemaScalarNode("number");
  }

  if (node.kind === ts.SyntaxKind.BooleanKeyword) {
    return schemaScalarNode("boolean");
  }

  if (
    ts.isTypeOperatorNode(node) &&
    node.operator === ts.SyntaxKind.ReadonlyKeyword
  ) {
    return convertTypeScriptTypeNode(node.type, context);
  }

  if (ts.isTypeLiteralNode(node)) {
    return schemaObjectNode(
      node.members.map((member) =>
        convertTypeScriptPropertySignature(member, context),
      ),
    );
  }

  if (ts.isUnionTypeNode(node)) {
    return schemaUnionNode(
      node.types.map((member, index) =>
        convertTypeScriptTypeNode(member, {
          ...context,
          path: [...context.path, "union", String(index)],
        }),
      ),
    );
  }

  if (ts.isArrayTypeNode(node)) {
    return schemaArrayNode(
      convertTypeScriptTypeNode(node.elementType, {
        ...context,
        path: [...context.path, "elementType"],
      }),
    );
  }

  if (ts.isTupleTypeNode(node)) {
    return schemaTupleNode(
      node.elements.map((element, index) =>
        convertTypeScriptTupleElement(element, {
          ...context,
          path: [...context.path, "elements", String(index)],
        }),
      ),
    );
  }

  if (ts.isLiteralTypeNode(node)) {
    return convertTypeScriptLiteralTypeNode(node);
  }

  if (ts.isTypeReferenceNode(node)) {
    return convertTypeScriptTypeReferenceNode(node, context);
  }

  if (ts.isConditionalTypeNode(node)) {
    throwTypeScriptUnsupportedNode(
      context,
      node,
      "unsupported-typescript-conditional-type",
      "Conditional types are outside the supported TypeScript schema subset.",
      `Unsupported TypeScript syntax kind: ${ts.SyntaxKind[node.kind]}.`,
    );
  }

  if (ts.isFunctionTypeNode(node)) {
    throwTypeScriptUnsupportedNode(
      context,
      node,
      "unsupported-typescript-function-type",
      "Function types are outside the supported TypeScript schema subset.",
      `Unsupported TypeScript syntax kind: ${ts.SyntaxKind[node.kind]}.`,
    );
  }

  if (ts.isIntersectionTypeNode(node)) {
    throwTypeScriptUnsupportedNode(
      context,
      node,
      "unsupported-typescript-intersection-type",
      "Intersection types are outside the supported TypeScript schema subset in v0.",
      `Unsupported TypeScript syntax kind: ${ts.SyntaxKind[node.kind]}.`,
    );
  }

  if (ts.isMappedTypeNode(node)) {
    throwTypeScriptUnsupportedNode(
      context,
      node,
      "unsupported-typescript-mapped-type",
      "Mapped types are outside the supported TypeScript schema subset.",
      `Unsupported TypeScript syntax kind: ${ts.SyntaxKind[node.kind]}.`,
    );
  }

  throwTypeScriptUnsupportedNode(
    context,
    node,
    "unsupported-typescript-syntax",
    `Unsupported TypeScript syntax kind "${ts.SyntaxKind[node.kind]}" in the current schema subset.`,
    `Unsupported TypeScript syntax kind: ${ts.SyntaxKind[node.kind]}.`,
  );
}

function convertTypeScriptPropertySignature(
  member: ts.TypeElement,
  context: TypeScriptConvertContext,
): SchemaFieldNode {
  if (!ts.isPropertySignature(member)) {
    throwTypeScriptUnsupportedNode(
      context,
      member,
      "unsupported-typescript-type-member",
      `Unsupported TypeScript type member kind "${ts.SyntaxKind[member.kind]}" in object type literals.`,
      `Unsupported TypeScript type member kind: ${ts.SyntaxKind[member.kind]}.`,
    );
  }

  if (!member.type) {
    throwTypeScriptUnsupportedNode(
      context,
      member,
      "missing-typescript-property-type",
      "Property signatures without explicit type annotations are not supported.",
      "Property signatures without explicit type annotations are not supported.",
    );
  }

  const propertyName = getTypeScriptPropertyName(member.name, context);
  const convertedType = convertTypeScriptFieldTypeNode(member.type, {
    ...context,
    path: [...context.path, propertyName],
  });

  return schemaFieldNode(propertyName, convertedType.type, {
    required: !member.questionToken,
    ...(convertedType.nullable ? { nullable: true } : {}),
  });
}

function convertTypeScriptFieldTypeNode(
  node: ts.TypeNode,
  context: TypeScriptConvertContext,
): {
  type: SchemaNode;
  nullable: boolean;
} {
  if (!ts.isUnionTypeNode(node)) {
    return {
      type: convertTypeScriptTypeNode(node, context),
      nullable: false,
    };
  }

  const nonNullMembers = node.types.filter((member) => !isNullTypeNode(member));
  const nullable = nonNullMembers.length !== node.types.length;

  if (!nullable) {
    return {
      type: convertTypeScriptTypeNode(node, context),
      nullable: false,
    };
  }

  if (nonNullMembers.length === 0) {
    return {
      type: schemaNullNode(),
      nullable: false,
    };
  }

  if (nonNullMembers.length === 1) {
    const nonNullMember = nonNullMembers[0];

    if (!nonNullMember) {
      throw new Error("Expected one non-null union member.");
    }

    return {
      type: convertTypeScriptTypeNode(nonNullMember, context),
      nullable: true,
    };
  }

  return {
    type: schemaUnionNode(
      nonNullMembers.map((member) =>
        convertTypeScriptTypeNode(member, context),
      ),
    ),
    nullable: true,
  };
}

function convertTypeScriptLiteralTypeNode(
  node: ts.LiteralTypeNode,
): SchemaNode {
  if (node.literal.kind === ts.SyntaxKind.NullKeyword) {
    return schemaNullNode();
  }

  if (ts.isStringLiteral(node.literal)) {
    return schemaLiteralNode(node.literal.text);
  }

  if (ts.isNumericLiteral(node.literal)) {
    return schemaLiteralNode(Number(node.literal.text));
  }

  if (node.literal.kind === ts.SyntaxKind.TrueKeyword) {
    return schemaLiteralNode(true);
  }

  if (node.literal.kind === ts.SyntaxKind.FalseKeyword) {
    return schemaLiteralNode(false);
  }

  throw new Error("Unsupported TypeScript literal type.");
}

function convertTypeScriptTypeReferenceNode(
  node: ts.TypeReferenceNode,
  context: TypeScriptConvertContext,
): SchemaNode {
  if (ts.isQualifiedName(node.typeName)) {
    const leftmostIdentifier = getLeftmostQualifiedNameIdentifier(
      node.typeName,
    );
    const importedFrom = context.importedTypeMap.get(leftmostIdentifier.text);

    if (importedFrom) {
      throwTypeScriptUnsupportedNode(
        context,
        node,
        "unsupported-typescript-namespace-import-reference",
        `Namespace-imported TypeScript type reference "${node.getText()}" from "${importedFrom}" is outside the current single-file schema subset.`,
        `Namespace-imported TypeScript type reference requires cross-file resolution: ${node.getText()}.`,
        {
          importSource: importedFrom,
          importedNamespace: leftmostIdentifier.text,
          qualifiedReference: node.getText(),
          typeReference: node.getText(),
        },
      );
    }
  }

  if (
    ts.isIdentifier(node.typeName) &&
    (node.typeName.text === "Array" || node.typeName.text === "ReadonlyArray")
  ) {
    const elementType = node.typeArguments?.[0];

    if (!elementType) {
      throwTypeScriptUnsupportedNode(
        context,
        node,
        "unsupported-typescript-type-reference",
        `${node.typeName.text}<T> requires exactly one type argument.`,
        `${node.typeName.text}<T> requires one type argument.`,
        {
          expectedTypeArguments: 1,
          typeReference: node.getText(),
          utilityType: node.typeName.text,
        },
      );
    }

    return schemaArrayNode(
      convertTypeScriptTypeNode(elementType, {
        ...context,
        path: [...context.path, "elementType"],
      }),
    );
  }

  if (ts.isIdentifier(node.typeName) && node.typeName.text === "Record") {
    const [keyType, valueType] = node.typeArguments ?? [];

    if (keyType && valueType && keyType.kind === ts.SyntaxKind.StringKeyword) {
      return schemaRecordNode(
        schemaScalarNode("string"),
        convertTypeScriptTypeNode(valueType, {
          ...context,
          path: [...context.path, "value"],
        }),
      );
    }

    throwTypeScriptUnsupportedNode(
      context,
      node,
      "unsupported-typescript-record-key",
      "Record utility types currently require a string key type in the shared schema IR.",
      `Unsupported Record key type in: ${node.getText()}.`,
      {
        keyType: keyType?.getText() ?? null,
        keyTypeKind: keyType ? ts.SyntaxKind[keyType.kind] : null,
        typeReference: node.getText(),
        valueType: valueType?.getText() ?? null,
      },
    );
  }

  if (ts.isIdentifier(node.typeName)) {
    const name = node.typeName.text;

    if (context.declarationNames.has(name)) {
      ensureReachableDefinition(name, context);

      return schemaReferenceNode(name);
    }

    const importedFrom = context.importedTypeMap.get(name);

    if (importedFrom) {
      throwTypeScriptUnsupportedNode(
        context,
        node,
        "unsupported-typescript-imported-type-reference",
        `Imported TypeScript type reference "${name}" from "${importedFrom}" is outside the current single-file schema subset.`,
        `Imported TypeScript type reference requires cross-file resolution: ${node.getText()}.`,
        {
          importSource: importedFrom,
          importedName: name,
          typeReference: node.getText(),
        },
      );
    }
  }

  throwTypeScriptUnsupportedNode(
    context,
    node,
    "unsupported-typescript-type-reference",
    `Unsupported TypeScript type reference "${node.getText()}" in the current schema subset.`,
    `Unsupported TypeScript type reference: ${node.getText()}.`,
    {
      typeReference: node.getText(),
    },
  );
}

function convertTypeScriptTupleElement(
  element: ts.TypeNode,
  context: TypeScriptConvertContext,
): SchemaNode | SchemaTupleElement {
  if (ts.isNamedTupleMember(element)) {
    if (element.dotDotDotToken) {
      throwTypeScriptUnsupportedNode(
        context,
        element,
        "unsupported-typescript-tuple-rest-element",
        "Tuple rest elements are not implemented in the TypeScript parser v0 subset.",
        "Tuple rest elements are not implemented yet.",
        {
          tupleElementKind: "named-rest",
        },
      );
    }

    return schemaTupleElement(
      convertTypeScriptTypeNode(element.type, context),
      {
        required: !element.questionToken,
      },
    );
  }

  if (ts.isOptionalTypeNode(element)) {
    return schemaTupleElement(
      convertTypeScriptTypeNode(element.type, context),
      {
        required: false,
      },
    );
  }

  if (ts.isRestTypeNode(element)) {
    throwTypeScriptUnsupportedNode(
      context,
      element,
      "unsupported-typescript-tuple-rest-element",
      "Tuple rest elements are not implemented in the TypeScript parser v0 subset.",
      "Tuple rest elements are not implemented yet.",
      {
        tupleElementKind: "rest",
      },
    );
  }

  return convertTypeScriptTypeNode(element, context);
}

function getTypeScriptPropertyName(
  name: ts.PropertyName,
  context: TypeScriptConvertContext,
): string {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }

  throwTypeScriptInferenceError(
    "unsupported-typescript-property-name",
    "Computed or otherwise non-standard property names are outside the supported TypeScript schema subset.",
    [
      createTypeScriptUnsupportedDiagnostic({
        code: "unsupported-typescript-property-name",
        message:
          "Computed or otherwise non-standard property names are outside the supported TypeScript schema subset.",
        path: context.path,
        nodeKind: "property-name",
        sourceLocation: getTypeScriptSourceLocation(name),
        detail: `Unsupported TypeScript property name kind: ${ts.SyntaxKind[name.kind]}.`,
        evidence: {
          nodeText: name.getText(),
          syntaxKind: ts.SyntaxKind[name.kind],
        },
      }),
    ],
  );
}

function isNullTypeNode(node: ts.TypeNode): boolean {
  return (
    ts.isLiteralTypeNode(node) &&
    node.literal.kind === ts.SyntaxKind.NullKeyword
  );
}

function throwTypeScriptUnsupportedNode(
  context: TypeScriptConvertContext,
  node: ts.Node,
  code:
    | "unsupported-typescript-conditional-type"
    | "unsupported-typescript-function-type"
    | "unsupported-typescript-imported-type-reference"
    | "unsupported-typescript-intersection-type"
    | "unsupported-typescript-mapped-type"
    | "unsupported-typescript-namespace-import-reference"
    | "unsupported-typescript-record-key"
    | "unsupported-typescript-syntax"
    | "unsupported-typescript-tuple-rest-element"
    | "unsupported-typescript-type-member"
    | "unsupported-typescript-type-reference"
    | "missing-typescript-property-type",
  message: string,
  detail: string,
  evidence?: Record<string, unknown>,
): never {
  const syntaxKind = ts.SyntaxKind[node.kind];
  const diagnostic = createTypeScriptUnsupportedDiagnostic({
    code,
    message,
    detail,
    path: context.path,
    nodeKind: inferDiagnosticNodeKind(code, context.path),
    sourceLocation: getTypeScriptSourceLocation(node),
    evidence: {
      documentName: context.sourceName,
      nodeText: node.getText(),
      syntaxKind,
      ...(evidence ?? {}),
    },
  });

  context.diagnostics.push(diagnostic);
  throwTypeScriptInferenceError(code, message, [diagnostic]);
}

function inferDiagnosticNodeKind(
  code: string,
  path: string[],
): SchemaDiagnosticNodeKind {
  if (code === "unsupported-typescript-type-reference") {
    return "type-reference";
  }

  if (code === "unsupported-typescript-imported-type-reference") {
    return "type-reference";
  }

  if (code === "unsupported-typescript-namespace-import-reference") {
    return "type-reference";
  }

  if (code === "unsupported-typescript-record-key") {
    return "record";
  }

  if (code === "unsupported-typescript-tuple-rest-element") {
    return "tuple";
  }

  if (code === "unsupported-typescript-type-member") {
    return "type-member";
  }

  if (code === "missing-typescript-property-type") {
    return "field";
  }

  if (path.includes("union")) {
    return "union";
  }

  if (path.includes("elements")) {
    return "tuple";
  }

  if (path.includes("elementType")) {
    return "array";
  }

  if (path[0] === "definitions" && path.length > 2) {
    return "field";
  }

  if (path[0] === "definitions") {
    return "definition";
  }

  return "type";
}

function ensureReachableDefinition(
  name: string,
  context: TypeScriptConvertContext,
): void {
  if (
    context.activeDefinitionNames.has(name) ||
    context.convertedDefinitionNames.has(name)
  ) {
    return;
  }

  const declaration = context.declarationMap.get(name);

  if (!declaration) {
    throw new Error(`Unknown TypeScript declaration "${name}".`);
  }

  context.activeDefinitionNames.add(name);

  try {
    const type = convertReachableDeclarationType(name, declaration, context);
    context.definitions.push(schemaDefinition(name, type));
    context.convertedDefinitionNames.add(name);
  } finally {
    context.activeDefinitionNames.delete(name);
  }
}

function convertReachableDeclarationType(
  name: string,
  declaration: TypeScriptEntryDeclaration,
  context: TypeScriptConvertContext,
): SchemaNode {
  const definitionPath = ["definitions", name];

  if (ts.isTypeAliasDeclaration(declaration)) {
    return convertTypeScriptTypeNode(declaration.type, {
      ...context,
      path: definitionPath,
    });
  }

  if (ts.isEnumDeclaration(declaration)) {
    return convertTypeScriptEnumDeclaration(declaration, {
      sourceName: context.sourceName,
      path: definitionPath,
    });
  }

  return convertTypeScriptTypeNode(
    ts.factory.createTypeLiteralNode(declaration.members),
    {
      ...context,
      path: definitionPath,
    },
  );
}

function getLeftmostQualifiedNameIdentifier(
  name: ts.QualifiedName,
): ts.Identifier {
  let currentLeft: ts.EntityName = name.left;

  while (ts.isQualifiedName(currentLeft)) {
    currentLeft = currentLeft.left;
  }

  return currentLeft;
}
