import { scalarType, schemaDocument, type SchemaDocument } from "@aio/core";
import { parse } from "yaml";

export function parseYamlDocument(input: string, name: string): SchemaDocument {
  parse(input);

  return schemaDocument(name, scalarType("string"));
}
