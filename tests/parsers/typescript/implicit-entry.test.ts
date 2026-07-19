import { describe, expect, it } from "vitest";
import {
  collectExportedTopLevelDeclarations,
  collectTopLevelDeclarations,
} from "../../../packages/parsers/typescript/src/entry.js";
import {
  analyzeImplicitEntry,
  analyzeImplicitEntryFromSource,
  collectRootDeclarationNames,
  derivePreferredEntryNameFromDocumentName,
} from "../../../packages/parsers/typescript/src/implicit-entry.js";
import { createTypeScriptSourceFile } from "../../../packages/parsers/typescript/src/syntax.js";

function collectDeclarationMaps(input: string): {
  declarationMap: ReturnType<typeof collectTopLevelDeclarations>;
  exportedDeclarationMap: ReturnType<typeof collectExportedTopLevelDeclarations>;
} {
  const sourceFile = createTypeScriptSourceFile(input);

  return {
    declarationMap: collectTopLevelDeclarations(sourceFile),
    exportedDeclarationMap: collectExportedTopLevelDeclarations(sourceFile),
  };
}

describe("parser-typescript implicit entry analysis", () => {
  it("collects declaration roots from the local dependency graph", () => {
    const { declarationMap } = collectDeclarationMaps(
      [
        "type Identifier = number;",
        "type User = { id: Identifier };",
        "type UserList = User[];",
      ].join("\n"),
    );

    expect(collectRootDeclarationNames(declarationMap)).toEqual(["UserList"]);
  });

  it("chooses the only exported declaration when exactly one supported export exists", () => {
    const { declarationMap, exportedDeclarationMap } = collectDeclarationMaps(
      [
        "type InternalUser = { id: number };",
        "export type UserList = InternalUser[];",
      ].join("\n"),
    );

    expect(
      analyzeImplicitEntry({
        declarationMap,
        exportedDeclarationMap,
      }),
    ).toEqual({
      entryName: "UserList",
      rootCandidates: ["UserList"],
      exportedRootCandidates: ["UserList"],
      selectionReason: "single-exported-declaration",
    });
  });

  it("chooses the unique exported root when multiple exported declarations collapse to one root", () => {
    const { declarationMap, exportedDeclarationMap } = collectDeclarationMaps(
      [
        "type InternalToken = string;",
        "export type User = { token: InternalToken };",
        "export type UserList = User[];",
      ].join("\n"),
    );

    expect(
      analyzeImplicitEntry({
        declarationMap,
        exportedDeclarationMap,
      }),
    ).toEqual({
      entryName: "UserList",
      rootCandidates: ["UserList"],
      exportedRootCandidates: ["UserList"],
      selectionReason: "single-exported-root",
    });
  });

  it("reports exported-root ambiguity separately from local-root ambiguity", () => {
    const { declarationMap, exportedDeclarationMap } = collectDeclarationMaps(
      [
        "type InternalToken = string;",
        "export type User = { token: InternalToken };",
        "export type Account = { id: number };",
      ].join("\n"),
    );

    expect(
      analyzeImplicitEntry({
        declarationMap,
        exportedDeclarationMap,
      }),
    ).toEqual({
      rootCandidates: ["Account", "User"],
      exportedRootCandidates: ["Account", "User"],
      ambiguityReason: "multiple-exported-root-candidates",
    });
  });

  it("uses a preferred document-name-derived entry when it matches an ambiguous root candidate", () => {
    const { declarationMap, exportedDeclarationMap } = collectDeclarationMaps(
      [
        "type User = { id: number };",
        "type Account = { name: string };",
      ].join("\n"),
    );

    expect(
      analyzeImplicitEntry({
        declarationMap,
        exportedDeclarationMap,
        preferredEntryName: "User",
      }),
    ).toEqual({
      entryName: "User",
      rootCandidates: ["Account", "User"],
      exportedRootCandidates: [],
      selectionReason: "document-name-match",
    });
  });

  it("reports cyclic-root-candidates when declarations only reference each other cyclically", () => {
    const { declarationMap, exportedDeclarationMap } = collectDeclarationMaps(
      [
        "type A = B;",
        "type B = A;",
      ].join("\n"),
    );

    expect(collectRootDeclarationNames(declarationMap)).toEqual([]);

    expect(
      analyzeImplicitEntry({
        declarationMap,
        exportedDeclarationMap,
      }),
    ).toEqual({
      rootCandidates: [],
      exportedRootCandidates: [],
      ambiguityReason: "cyclic-root-candidates",
    });
  });

  it("analyzes implicit entry candidates directly from source text", () => {
    expect(
      analyzeImplicitEntryFromSource(
        [
          "type InternalToken = string;",
          "export type User = { token: InternalToken };",
          "export type UserList = User[];",
        ].join("\n"),
      ),
    ).toEqual({
      entryName: "UserList",
      rootCandidates: ["UserList"],
      exportedRootCandidates: ["UserList"],
      selectionReason: "single-exported-root",
    });
  });

  it("derives a preferred entry name only from non-default document names", () => {
    expect(derivePreferredEntryNameFromDocumentName("UserDocument")).toBe(
      "User",
    );
    expect(
      derivePreferredEntryNameFromDocumentName("TypeScriptDocument"),
    ).toBeUndefined();
    expect(derivePreferredEntryNameFromDocumentName("UserSchema")).toBe(
      undefined,
    );
  });
});
