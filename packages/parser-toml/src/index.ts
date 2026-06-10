import { scalarType, schemaDocument, type SchemaDocument } from "@aio/core";
import { parse } from "@iarna/toml";

export function parseTomlDocument(input: string, name: string): SchemaDocument {
  parse(input);

  return schemaDocument(name, scalarType("string"));
}
