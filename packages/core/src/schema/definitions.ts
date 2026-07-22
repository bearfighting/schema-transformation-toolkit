import type { SchemaDefinition, SchemaDocument } from "./types.js";

export interface SchemaDefinitionIndex {
  all: ReadonlyMap<string, readonly SchemaDefinition[]>;
  unique: ReadonlyMap<string, SchemaDefinition>;
}

export type SchemaReferenceResolution =
  | { status: "missing"; name: string }
  | {
      status: "ambiguous";
      name: string;
      definitions: readonly SchemaDefinition[];
    }
  | { status: "resolved"; definition: SchemaDefinition };

export function createSchemaDefinitionIndex(
  document: Pick<SchemaDocument, "definitions">,
): SchemaDefinitionIndex {
  const all = new Map<string, SchemaDefinition[]>();

  for (const definition of document.definitions) {
    const definitions = all.get(definition.name.source);

    if (definitions === undefined) {
      all.set(definition.name.source, [definition]);
      continue;
    }

    definitions.push(definition);
  }

  return {
    all,
    unique: createUniqueDefinitionLookup(all),
  };
}

export function createSchemaDefinitionIndexFromLookup(
  definitionLookup: ReadonlyMap<string, SchemaDefinition>,
): SchemaDefinitionIndex {
  const all = new Map<string, readonly SchemaDefinition[]>();

  for (const [name, definition] of definitionLookup.entries()) {
    all.set(name, [definition]);
  }

  return {
    all,
    unique: new Map(definitionLookup),
  };
}

export function resolveSchemaReference(
  definitionIndex: SchemaDefinitionIndex,
  name: string,
): SchemaReferenceResolution {
  const definitions = definitionIndex.all.get(name);

  if (definitions === undefined || definitions.length === 0) {
    return { status: "missing", name };
  }

  if (definitions.length > 1) {
    return {
      status: "ambiguous",
      name,
      definitions,
    };
  }

  const definition = definitions[0];

  return definition === undefined
    ? { status: "missing", name }
    : { status: "resolved", definition };
}

function createUniqueDefinitionLookup(
  definitionIndex: ReadonlyMap<string, readonly SchemaDefinition[]>,
): ReadonlyMap<string, SchemaDefinition> {
  const definitionLookup = new Map<string, SchemaDefinition>();

  for (const [name, definitions] of definitionIndex.entries()) {
    if (definitions.length !== 1) {
      continue;
    }

    const definition = definitions[0];

    if (definition !== undefined) {
      definitionLookup.set(name, definition);
    }
  }

  return definitionLookup;
}
