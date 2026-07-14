import {
  schemaLiteralNode,
  schemaUnionNode,
  type SchemaLiteralNode,
  type SchemaNode,
} from "@aio/core";
import ts from "typescript";
import { createTypeScriptUnsupportedDiagnostic } from "./diagnostics.js";
import { throwTypeScriptInferenceError } from "./errors.js";
import { getTypeScriptSourceLocation } from "./syntax.js";

export function convertTypeScriptEnumDeclaration(
  declaration: ts.EnumDeclaration,
  options?: {
    sourceName?: string;
    path?: string[];
  },
): SchemaNode {
  const members: SchemaLiteralNode[] = [];
  const memberValues = new Map<string, string | number | boolean>();
  let nextNumericValue: number | undefined = 0;

  for (const member of declaration.members) {
    const value = getTypeScriptEnumMemberValue(
      declaration,
      member,
      nextNumericValue,
      memberValues,
      options,
    );
    members.push(schemaLiteralNode(value));
    memberValues.set(member.name.getText(), value);

    if (typeof value === "number") {
      nextNumericValue = value + 1;
    } else {
      nextNumericValue = undefined;
    }
  }

  if (members.length === 1) {
    const [member] = members;

    if (!member) {
      throw new Error("Expected one enum member.");
    }

    return member;
  }

  return schemaUnionNode(members);
}

function getTypeScriptEnumMemberValue(
  declaration: ts.EnumDeclaration,
  member: ts.EnumMember,
  fallbackNumericValue: number | undefined,
  memberValues: ReadonlyMap<string, string | number | boolean>,
  options?: {
    sourceName?: string;
    path?: string[];
  },
): string | number | boolean {
  if (!member.initializer) {
    if (fallbackNumericValue === undefined) {
      throwUnsupportedEnumInitializer(
        member.name,
        "Implicit enum member values are only supported at the start of an enum or after numeric-valued members.",
        options,
        member.name.getText(),
      );
    }

    return fallbackNumericValue;
  }

  if (ts.isStringLiteral(member.initializer)) {
    return member.initializer.text;
  }

  if (ts.isNumericLiteral(member.initializer)) {
    return Number(member.initializer.text);
  }

  if (member.initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }

  if (member.initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }

  if (
    ts.isPrefixUnaryExpression(member.initializer) &&
    member.initializer.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(member.initializer.operand)
  ) {
    return -Number(member.initializer.operand.text);
  }

  if (ts.isIdentifier(member.initializer)) {
    const referencedValue = memberValues.get(member.initializer.text);

    if (referencedValue !== undefined) {
      return referencedValue;
    }
  }

  if (
    ts.isPropertyAccessExpression(member.initializer) &&
    ts.isIdentifier(member.initializer.expression) &&
    member.initializer.expression.text === declaration.name.text
  ) {
    const referencedValue = memberValues.get(member.initializer.name.text);

    if (referencedValue !== undefined) {
      return referencedValue;
    }
  }

  throwUnsupportedEnumInitializer(
    member.initializer,
    "Enum member initializers must be string, number, implicit numeric values, or references to earlier enum members in the supported TypeScript schema subset.",
    options,
    member.name.getText(),
  );
}

function throwUnsupportedEnumInitializer(
  node: ts.Node,
  message: string,
  options:
    | {
        sourceName?: string;
        path?: string[];
      }
    | undefined,
  enumMember: string,
): never {
  const diagnostic = createTypeScriptUnsupportedDiagnostic({
    code: "unsupported-typescript-enum-member-initializer",
    message,
    nodeKind: "definition",
    sourceLocation: getTypeScriptSourceLocation(node),
    detail: `Unsupported TypeScript enum member initializer: ${node.getText()}.`,
    ...(options?.path ? { path: options.path } : {}),
    evidence: {
      ...(options?.sourceName ? { documentName: options.sourceName } : {}),
      enumMember,
    },
  });

  throwTypeScriptInferenceError(
    "unsupported-typescript-enum-member-initializer",
    message,
    [diagnostic],
  );
}
