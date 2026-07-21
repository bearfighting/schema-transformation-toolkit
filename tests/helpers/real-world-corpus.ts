import type { ConstraintDocument, SchemaDocument } from "@aio/core";
import { tryInferJsonDocumentWithOptions } from "@aio/parser-json";
import { tryInferJsonSchemaDocumentWithOptions } from "@aio/parser-json-schema";
import { tryInferTypeScriptDocumentWithOptions } from "@aio/parser-typescript";
import type { RealWorldCorpusCase } from "../fixtures/real-world/minimal-corpus.js";

export interface ParsedRealWorldCorpusCase {
  document: SchemaDocument;
  constraints?: ConstraintDocument;
}

export function parseRealWorldCorpusCase(
  corpusCase: RealWorldCorpusCase,
): ParsedRealWorldCorpusCase {
  switch (corpusCase.sourceFormat) {
    case "json": {
      const result = tryInferJsonDocumentWithOptions(corpusCase.input, {
        name: corpusCase.expectedDocumentName,
      });

      if (!result.ok) {
        throw new Error(`Expected JSON corpus "${corpusCase.id}" to parse.`);
      }

      return {
        document: result.document,
      };
    }
    case "json-schema": {
      const result = tryInferJsonSchemaDocumentWithOptions(corpusCase.input, {
        name: corpusCase.expectedDocumentName,
      });

      if (!result.ok) {
        throw new Error(
          `Expected JSON Schema corpus "${corpusCase.id}" to parse.`,
        );
      }

      return {
        document: result.document,
        ...(result.constraints ? { constraints: result.constraints } : {}),
      };
    }
    case "typescript": {
      const result = tryInferTypeScriptDocumentWithOptions(corpusCase.input, {
        name: corpusCase.expectedDocumentName,
        ...(corpusCase.entry ? { entry: corpusCase.entry } : {}),
      });

      if (!result.ok) {
        throw new Error(
          `Expected TypeScript corpus "${corpusCase.id}" to parse.`,
        );
      }

      return {
        document: result.document,
      };
    }
  }
}
