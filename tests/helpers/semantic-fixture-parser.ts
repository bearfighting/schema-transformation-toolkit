import type {
  ConstraintDocument,
  SchemaDiagnostic,
  SchemaDocument,
  SchemaSemanticNote,
} from "@schema-transformation-toolkit/core";
import { isConstraintDocument } from "@schema-transformation-toolkit/core";
import { tryInferJsonDocumentWithOptions } from "@schema-transformation-toolkit/parser-json";
import { tryInferJsonSchemaDocumentWithOptions } from "@schema-transformation-toolkit/parser-json-schema";
import { tryInferTypeScriptDocumentWithOptions } from "@schema-transformation-toolkit/parser-typescript";
import { tryParseOpenApiDocument } from "@schema-transformation-toolkit/parser-openapi";
import { tryInferZodDocumentWithOptions } from "@schema-transformation-toolkit/parser-zod";
import { tryParseRust } from "../../packages/parsers/rust/src/api.js";
import { tryParsePython } from "../../packages/parsers/python/src/api.js";
import { tryParseGo } from "../../packages/parsers/go/src/api.js";
import { tryParseJava } from "../../packages/parsers/java/src/api.js";
import { tryParseKotlin } from "../../packages/parsers/kotlin/src/api.js";
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

export class SemanticFixtureParseError extends Error {
  readonly fixtureId: string;
  readonly format: SemanticFixtureFormatId;
  readonly code: string;
  readonly diagnostics: SchemaDiagnostic[] | undefined;
  readonly position: unknown;

  constructor(
    fixtureId: string,
    formatId: SemanticFixtureFormatId,
    code: string,
    diagnostics?: SchemaDiagnostic[],
  ) {
    super(`Fixture "${fixtureId}" failed to parse as ${formatId}: ${code}`);
    this.name = "SemanticFixtureParseError";
    this.fixtureId = fixtureId;
    this.format = formatId;
    this.code = code;
    this.diagnostics = diagnostics;
    this.position = findDiagnosticPosition(diagnostics);
  }
}

function findDiagnosticPosition(
  diagnostics: SchemaDiagnostic[] | undefined,
): unknown {
  const evidence = diagnostics?.find(
    (diagnostic) =>
      diagnostic.evidence &&
      typeof diagnostic.evidence === "object" &&
      "position" in diagnostic.evidence,
  )?.evidence;
  return evidence && typeof evidence === "object" && "position" in evidence
    ? evidence.position
    : undefined;
}

function missingSource(
  fixture: SemanticFixture,
  format: SemanticFixtureFormatId,
): never {
  throw new SemanticFixtureParseError(
    fixture.id,
    format,
    "missing-fixture-source",
    [
      {
        severity: "error",
        code: "missing-fixture-source",
        message: `Fixture "${fixture.id}" does not define a ${format} source.`,
        path: ["sources", format],
        source: "tests/semantic-fixture-parser",
      },
    ],
  );
}

export function parseSemanticFixture(
  fixture: SemanticFixture,
  formatId: SemanticFixtureFormatId,
): ParsedSemanticFixture {
  switch (formatId) {
    case "json": {
      const source = fixture.sources.json;

      if (!source) {
        missingSource(fixture, formatId);
      }

      const result = tryInferJsonDocumentWithOptions(
        source.input,
        source.options,
      );

      if (!result.ok) {
        throw new SemanticFixtureParseError(
          fixture.id,
          formatId,
          result.code,
          result.diagnostics,
        );
      }

      return {
        document: result.document,
      };
    }
    case "json-schema": {
      const source = fixture.sources["json-schema"];

      if (!source) {
        missingSource(fixture, formatId);
      }

      const result = tryInferJsonSchemaDocumentWithOptions(
        JSON.stringify(source.input),
        source.options,
      );

      if (!result.ok) {
        throw new SemanticFixtureParseError(
          fixture.id,
          formatId,
          result.code,
          result.diagnostics,
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
        missingSource(fixture, formatId);
      }

      const result = tryInferTypeScriptDocumentWithOptions(
        source.input,
        source.options,
      );

      if (!result.ok) {
        throw new SemanticFixtureParseError(
          fixture.id,
          formatId,
          result.code,
          result.diagnostics,
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
    case "zod": {
      const source = fixture.sources.zod;
      if (!source) {
        missingSource(fixture, formatId);
      }
      const result = tryInferZodDocumentWithOptions(
        source.input,
        source.options,
      );
      if (!result.ok) {
        throw new SemanticFixtureParseError(
          fixture.id,
          formatId,
          result.code,
          result.diagnostics,
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
    case "openapi": {
      const source = fixture.sources.openapi;
      if (!source) {
        missingSource(fixture, formatId);
      }
      const result = tryParseOpenApiDocument(source.input, source.options);
      if (!result.ok) {
        throw new SemanticFixtureParseError(
          fixture.id,
          formatId,
          result.code,
          result.diagnostics,
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
    case "rust":
    case "python":
    case "go":
    case "java":
    case "kotlin": {
      const source = fixture.sources[formatId];
      if (!source) {
        missingSource(fixture, formatId);
      }
      const result =
        formatId === "rust"
          ? tryParseRust(source.input, source.options)
          : formatId === "python"
            ? tryParsePython(source.input, source.options)
            : formatId === "go"
              ? tryParseGo(source.input, source.options)
              : formatId === "java"
                ? tryParseJava(source.input, source.options)
                : tryParseKotlin(source.input, source.options);
      if (!result.ok) {
        throw new SemanticFixtureParseError(
          fixture.id,
          formatId,
          result.code,
          result.diagnostics,
        );
      }
      const artifacts =
        "artifacts" in result &&
        typeof result.artifacts === "object" &&
        result.artifacts !== null &&
        "constraints" in result.artifacts
          ? result.artifacts
          : undefined;
      const constraints =
        artifacts && isConstraintDocument(artifacts.constraints)
          ? artifacts.constraints
          : undefined;
      const diagnostics =
        "diagnostics" in result && Array.isArray(result.diagnostics)
          ? result.diagnostics
          : undefined;
      const semanticNotes =
        "semanticNotes" in result && Array.isArray(result.semanticNotes)
          ? result.semanticNotes
          : undefined;
      return {
        document: result.document,
        ...(constraints ? { constraints } : {}),
        ...(diagnostics ? { diagnostics } : {}),
        ...(semanticNotes ? { semanticNotes } : {}),
      };
    }
  }
}
