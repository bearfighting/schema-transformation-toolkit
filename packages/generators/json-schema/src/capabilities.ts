import type { GeneratorCapabilities } from "@aio/core";

export const jsonSchemaGeneratorCapabilities: GeneratorCapabilities = {
  target: "json-schema",
  consumesIr: ["shape", "constraint"],
  supportsCapabilities: [
    "shape-ir",
    "constraint-ir",
    "string-constraints",
    "numeric-constraints",
    "collection-constraints",
    "object-constraints",
    "portable-annotations",
  ],
};
