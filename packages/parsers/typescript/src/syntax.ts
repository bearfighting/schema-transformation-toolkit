import ts from "typescript";
import type { TypeScriptSourceLocation } from "./types.js";

export function createTypeScriptSourceFile(
  input: string,
  fileName = "inline.ts",
): ts.SourceFile {
  return ts.createSourceFile(fileName, input, ts.ScriptTarget.Latest, true);
}

export function getTypeScriptSourceLocation(
  node: ts.Node | ts.SourceFile,
): TypeScriptSourceLocation {
  const sourceFile = node.getSourceFile();
  const startOffset = ts.isSourceFile(node) ? 0 : node.getStart(sourceFile);
  const endOffset = node.getEnd();
  const start = sourceFile.getLineAndCharacterOfPosition(startOffset);
  const end = sourceFile.getLineAndCharacterOfPosition(endOffset);

  return {
    start: {
      offset: startOffset,
      line: start.line + 1,
      column: start.character + 1,
    },
    end: {
      offset: endOffset,
      line: end.line + 1,
      column: end.character + 1,
    },
    length: endOffset - startOffset,
  };
}
