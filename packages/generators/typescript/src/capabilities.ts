import type { GeneratorCapabilities } from "@aio/core";

export const typeScriptGeneratorCapabilities: GeneratorCapabilities = {
  target: "typescript",
  consumesIr: ["shape"],
  supportsCapabilities: ["shape-ir"],
};
