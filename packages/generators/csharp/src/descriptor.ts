import {
  isIrBundle,
  type GeneratorDescriptor,
  type GeneratorExecutionContext,
  type IrBundle,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { csharpGeneratorCapabilities } from "./capabilities.js";
import { tryGenerateCSharp } from "./api.js";
import type { CSharpGeneratorOptions } from "./options.js";

export const csharpGeneratorDescriptor: GeneratorDescriptor<
  SchemaDocument,
  string,
  CSharpGeneratorOptions
> = {
  kind: "generator",
  descriptorVersion: "0.1",
  format: "csharp",
  capabilities: csharpGeneratorCapabilities,
  options: {
    format: "csharp",
    role: "generator",
    options: [],
  },
  generate(
    input: IrBundle<SchemaDocument>,
    context: GeneratorExecutionContext<CSharpGeneratorOptions>,
  ) {
    if (!isIrBundle(input) || input.document.kind !== "document") {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The C# generator requires Shape IR.",
      };
    }
    return tryGenerateCSharp(input.document, context.options ?? {});
  },
};
