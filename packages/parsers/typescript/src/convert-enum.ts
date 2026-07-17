import {
  schemaLiteralNode,
  schemaUnionNode,
  type SchemaLiteralNode,
  type SchemaNode,
  type SchemaSemanticNote,
} from "@aio/core";
import ts from "typescript";
import {
  createTypeScriptUnsupportedDiagnostic,
  typeScriptSemanticNote,
} from "./diagnostics.js";
import { throwTypeScriptInferenceError } from "./errors.js";
import { getTypeScriptSourceLocation } from "./syntax.js";

export function convertTypeScriptEnumDeclaration(
  declaration: ts.EnumDeclaration,
  options?: {
    sourceName?: string;
    path?: string[];
    semanticNotes?: SchemaSemanticNote[];
  },
): SchemaNode {
  const members: SchemaLiteralNode[] = [];
  const memberValues = new Map<string, string | number | boolean>();
  let nextNumericValue: number | undefined = 0;
  let containsMemberReferences = false;

  for (const member of declaration.members) {
    const value = getTypeScriptEnumMemberValue(
      declaration,
      member,
      nextNumericValue,
      memberValues,
      options,
    );
    members.push(schemaLiteralNode(value.value));
    memberValues.set(member.name.getText(), value.value);
    containsMemberReferences =
      containsMemberReferences || value.usedMemberReference;

    if (typeof value.value === "number") {
      nextNumericValue = value.value + 1;
    } else {
      nextNumericValue = undefined;
    }
  }

  options?.semanticNotes?.push(
    typeScriptSemanticNote({
      kind: "normalization",
      code: "typescript-enum-lowered",
      message:
        "This TypeScript enum declaration was lowered into shared literal or literal-union schema semantics.",
      ...(options.path ? { path: options.path } : {}),
      nodeKind: "definition",
      layer: "shape",
      evidence: {
        enumName: declaration.name.text,
        memberCount: declaration.members.length,
        loweredForm: members.length === 1 ? "literal" : "literal-union",
        containsMemberReferences,
      },
    }),
  );

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
): {
  value: string | number | boolean;
  usedMemberReference: boolean;
} {
  if (!member.initializer) {
    if (fallbackNumericValue === undefined) {
      throwUnsupportedEnumInitializer(
        member.name,
        "Implicit enum member values are only supported at the start of an enum or after numeric-valued members.",
        options,
        member.name.getText(),
      );
    }

    return {
      value: fallbackNumericValue,
      usedMemberReference: false,
    };
  }

  if (ts.isStringLiteral(member.initializer)) {
    return {
      value: member.initializer.text,
      usedMemberReference: false,
    };
  }

  if (ts.isNumericLiteral(member.initializer)) {
    return {
      value: Number(member.initializer.text),
      usedMemberReference: false,
    };
  }

  if (member.initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return {
      value: true,
      usedMemberReference: false,
    };
  }

  if (member.initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return {
      value: false,
      usedMemberReference: false,
    };
  }

  if (
    ts.isPrefixUnaryExpression(member.initializer) &&
    member.initializer.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(member.initializer.operand)
  ) {
    return {
      value: -Number(member.initializer.operand.text),
      usedMemberReference: false,
    };
  }

  if (ts.isIdentifier(member.initializer)) {
    const referencedValue = memberValues.get(member.initializer.text);

    if (referencedValue !== undefined) {
      return {
        value: referencedValue,
        usedMemberReference: true,
      };
    }
  }

  if (
    ts.isPropertyAccessExpression(member.initializer) &&
    ts.isIdentifier(member.initializer.expression) &&
    member.initializer.expression.text === declaration.name.text
  ) {
    const referencedValue = memberValues.get(member.initializer.name.text);

    if (referencedValue !== undefined) {
      return {
        value: referencedValue,
        usedMemberReference: true,
      };
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
