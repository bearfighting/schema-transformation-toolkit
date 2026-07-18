import type { ParserCapabilities } from "@aio/core";

export const typeScriptParserCapabilities: ParserCapabilities = {
  format: "typescript",
  producesIr: ["shape"],
  capabilities: ["shape-ir"],
};
