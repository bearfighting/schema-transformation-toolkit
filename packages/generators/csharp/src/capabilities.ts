import type { GeneratorCapabilities } from "@schema-transformation-toolkit/core";

export const csharpGeneratorCapabilities: GeneratorCapabilities = {
  target: "csharp",
  consumesIr: ["shape"],
  entryIr: ["shape"],
  entries: [{ ir: "shape" }],
  supportsCapabilities: ["shape-ir"],
};
