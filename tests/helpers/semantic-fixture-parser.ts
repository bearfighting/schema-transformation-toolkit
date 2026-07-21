import type {
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@aio/core";
import { tryInferJsonDocumentWithOptions } from "@aio/parser-json";
import { tryInferJsonSchemaDocumentWithOptions } from "@aio/parser-json-schema";
import { tryInferTypeScriptDocumentWithOptions } from "@aio/parser-typescript";
import type {
  SemanticFixture,
  SemanticFixtureFormatId,
} from "../fixtures/semantics/types.js";

export interface ParsedSemanticFixture {
  document: SchemaDocument;
  constraints?: ConstraintDocument;
  diagnostics?: SchemaDiagnostic[];
  semanticNotes?: SchemaSemanticNote[];
}

export function parseSemanticFixture(
  fixture: SemanticFixture,
  formatId: SemanticFixtureFormatId,
): ParsedSemanticFixture {
  switch (formatId) {
    case "json": {
      const source = fixture.sources.json;

      if (!source) {
        throw new Error(
          `Fixture "${fixture.id}" does not define a JSON source.`,
        );
      }

      const result = tryInferJsonDocumentWithOptions(
        source.input,
        source.options,
      );

      if (!result.ok) {
        throw new Error(
          `Fixture "${fixture.id}" failed to parse as JSON: ${result.code}`,
        );
      }

      return {
        document: result.document,
      };
    }
    case "json-schema": {
      const source = fixture.sources["json-schema"];

      if (!source) {
        throw new Error(
          `Fixture "${fixture.id}" does not define a JSON Schema source.`,
        );
      }

      const result = tryInferJsonSchemaDocumentWithOptions(
        JSON.stringify(source.input),
        source.options,
      );

      if (!result.ok) {
        throw new Error(
          `Fixture "${fixture.id}" failed to parse as JSON Schema: ${result.code}`,
        );
      }

      return {
        document: result.document,
        ...(result.constraints ? { constraints: result.constraints } : {}),
        ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
        ...(result.semanticNotes
          ? { semanticNotes: result.semanticNotes }
          : {}),
      };
    }
    case "typescript": {
      const source = fixture.sources.typescript;

      if (!source) {
        throw new Error(
          `Fixture "${fixture.id}" does not define a TypeScript source.`,
        );
      }

      const result = tryInferTypeScriptDocumentWithOptions(
        source.input,
        source.options,
      );

      if (!result.ok) {
        throw new Error(
          `Fixture "${fixture.id}" failed to parse as TypeScript: ${result.code}`,
        );
      }

      return {
        document: result.document,
        ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
        ...(result.semanticNotes
          ? { semanticNotes: result.semanticNotes }
          : {}),
      };
    }
  }
}
