import type {
  ParseResult,
  ParserDescriptor,
  ParserExecutionContext,
  SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { csharpParserCapabilities } from "./capabilities.js";
import { csharpParserOptionCatalog } from "./option-metadata.js";
import { tryParseCSharp } from "./api.js";
import type { CSharpParserOptions } from "./options.js";
export const csharpParserDescriptor: ParserDescriptor<
  SchemaDocument,
  CSharpParserOptions
> = {
  kind: "parser",
  descriptorVersion: "0.1",
  format: "csharp",
  capabilities: csharpParserCapabilities,
  options: csharpParserOptionCatalog,
  parse(
    input: string,
    context: ParserExecutionContext<CSharpParserOptions>,
  ): ParseResult<SchemaDocument> {
    return tryParseCSharp(input, {
      ...(context.options ?? {}),
      name: context.name,
    });
  },
};
