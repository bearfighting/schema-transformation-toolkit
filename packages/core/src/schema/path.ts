export type SchemaPathSegment =
  | { kind: "root" }
  | { kind: "definition"; name: string }
  | { kind: "elementType" }
  | { kind: "tupleElement"; index: number }
  | { kind: "recordKey" }
  | { kind: "recordValue" }
  | { kind: "field"; name: string }
  | { kind: "unionMember"; index: number };

export type SchemaPath = readonly SchemaPathSegment[];

export function schemaPathToDiagnosticPath(path: SchemaPath): string[] {
  const diagnosticPath: string[] = [];

  for (const segment of path) {
    switch (segment.kind) {
      case "definition":
        diagnosticPath.push("definitions", segment.name);
        break;
      default:
        diagnosticPath.push(schemaPathSegmentToDiagnosticToken(segment));
        break;
    }
  }

  return diagnosticPath;
}

export function appendSchemaPath(
  path: SchemaPath,
  segment: SchemaPathSegment,
): SchemaPath {
  return [...path, segment];
}

export function createRootSchemaPath(): SchemaPath {
  return [{ kind: "root" }];
}

export function createDefinitionSchemaPath(name: string): SchemaPath {
  return [{ kind: "definition", name }];
}

export function schemaPathSegmentToDiagnosticToken(
  segment: SchemaPathSegment,
): string {
  switch (segment.kind) {
    case "root":
      return "root";
    case "definition":
      return segment.name;
    case "elementType":
      return "elementType";
    case "tupleElement":
      return String(segment.index);
    case "recordKey":
      return "key";
    case "recordValue":
      return "value";
    case "field":
      return segment.name;
    case "unionMember":
      return String(segment.index);
  }
}
