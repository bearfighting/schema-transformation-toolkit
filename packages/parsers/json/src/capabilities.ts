import type { ParserCapabilities } from "@aio/core";

export const jsonParserCapabilities: ParserCapabilities = {
  format: "json",
  producesIr: ["value", "shape"],
  capabilities: ["value-ir", "shape-ir"],
};
