import ts from "typescript";
import type { TypeScriptEntryDeclaration } from "./types.js";

export function collectReachableDeclarationNames(
  entryName: string,
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>,
): Set<string> {
  const reachable = new Set<string>();
  const pending = [entryName];

  while (pending.length > 0) {
    const currentName = pending.pop();

    if (!currentName || reachable.has(currentName)) {
      continue;
    }

    const declaration = declarationMap.get(currentName);

    if (!declaration) {
      continue;
    }

    reachable.add(currentName);

    for (const referencedName of collectLocalReferencedDeclarationNames(
      declaration,
      declarationMap,
    )) {
      if (!reachable.has(referencedName)) {
        pending.push(referencedName);
      }
    }
  }

  return reachable;
}

function collectLocalReferencedDeclarationNames(
  declaration: TypeScriptEntryDeclaration,
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>,
): Set<string> {
  const referenced = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      if (declarationMap.has(node.typeName.text)) {
        referenced.add(node.typeName.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(declaration);

  referenced.delete(declaration.name.text);

  return referenced;
}
