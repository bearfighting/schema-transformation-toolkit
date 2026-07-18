import type { ParserCapabilities } from "@aio/core";

export const jsonSchemaParserCapabilities: ParserCapabilities = {
  format: "json-schema",
  producesIr: ["shape", "constraint"],
  capabilities: [
    "shape-ir",
    "constraint-ir",
    "string-constraints",
    "numeric-constraints",
    "collection-constraints",
    "object-constraints",
    "portable-annotations",
  ],
};
