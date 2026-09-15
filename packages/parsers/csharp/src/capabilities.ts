import type { ParserCapabilities } from "@schema-transformation-toolkit/core";
export const csharpParserCapabilities: ParserCapabilities = {
  format: "csharp",
  producesIr: ["shape"],
  outputs: [{ ir: "shape" }],
  capabilities: ["shape-ir"],
};
