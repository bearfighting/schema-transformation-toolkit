import type { SchemaDefinition, SchemaDiagnostic } from "@aio/core";
import type ts from "typescript";

export type TypeScriptEntryDeclaration =
  ts.TypeAliasDeclaration | ts.InterfaceDeclaration | ts.EnumDeclaration;

export type TypeScriptNamedTopLevelStatement =
  | TypeScriptEntryDeclaration
  | ts.ClassDeclaration
  | ts.ModuleDeclaration;

export interface TypeScriptReExportReference {
  exportedName: string;
  importedName: string;
  moduleSpecifier: string;
  declarationText: string;
  sourceLocation: TypeScriptSourceLocation;
}

export interface TypeScriptConvertContext {
  definitions: SchemaDefinition[];
  diagnostics: SchemaDiagnostic[];
  declarationMap: ReadonlyMap<string, TypeScriptEntryDeclaration>;
  declarationNames: Set<string>;
  importedTypeMap: ReadonlyMap<string, string>;
  convertedDefinitionNames: Set<string>;
  activeDefinitionNames: Set<string>;
  path: string[];
  sourceName: string;
}

export interface TypeScriptSourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface TypeScriptSourceLocation {
  start: TypeScriptSourcePosition;
  end: TypeScriptSourcePosition;
  length: number;
}
