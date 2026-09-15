import {
  isIrBundle,
  tryValidateSchemaDocument,
  type GeneratorDescriptor,
  type GeneratorExecutionContext,
  type IrBundle,
  type SchemaDocument,
} from "@schema-transformation-toolkit/core";
import { csharpGeneratorCapabilities } from "./capabilities.js";
import { csharpGeneratorOptionCatalog } from "./option-metadata.js";
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
  options: csharpGeneratorOptionCatalog,
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
    const document = input.document;
    if (!isShapeDocumentLike(document)) {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The C# generator requires a valid Shape IR document.",
      };
    }
    try {
      const validation = tryValidateSchemaDocument(document);
      if (!validation.ok) {
        return {
          ok: false,
          code: "invalid-generator-input",
          message:
            validation.diagnostics[0]?.message ??
            "The C# generator requires a valid Shape IR document.",
        };
      }
    } catch {
      return {
        ok: false,
        code: "invalid-generator-input",
        message: "The C# generator requires a valid Shape IR document.",
      };
    }
    return tryGenerateCSharp(document, context.options ?? {});
  },
};

function isShapeDocumentLike(value: unknown): value is SchemaDocument {
  if (typeof value !== "object" || value === null) return false;
  const document = value as {
    version?: unknown;
    kind?: unknown;
    name?: unknown;
    definitions?: unknown;
    root?: unknown;
  };
  return (
    document.version === "0.1" &&
    document.kind === "document" &&
    isIdentifierLike(document.name) &&
    Array.isArray(document.definitions) &&
    isNodeLike(document.root)
  );
}

function isIdentifierLike(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { source?: unknown }).source === "string"
  );
}

function isNodeLike(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { kind?: unknown }).kind === "string"
  );
}
