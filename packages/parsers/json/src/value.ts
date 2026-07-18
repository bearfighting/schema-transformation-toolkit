import type {
  ParseFailureResult,
  SchemaDiagnostic,
  SchemaDocument,
  ValueDocument,
  ValueNode,
} from "@aio/core";
import {
  schemaDocument,
  valueArrayNode,
  valueDocument,
  valueObjectField,
  valueObjectNode,
  valueScalarNode,
} from "@aio/core";
import { decodeJsonText } from "./decode.js";
import { isJsonInferenceError } from "./errors.js";
import { inferSchemaNodeFromJsonValue } from "./schema/infer.js";
import {
  assertSupportedJsonParseOptions,
  resolveJsonParseOptions,
  type JsonParseOptions,
  type ResolvedJsonParseOptions,
} from "./schema/options.js";
import type { JsonValue } from "./types.js";

export interface JsonValueDocumentSuccessResult {
  ok: true;
  document: ValueDocument;
}

export type JsonValueDocumentFailureResult = ParseFailureResult<"invalid-json">;

export type JsonValueDocumentResult =
  JsonValueDocumentSuccessResult | JsonValueDocumentFailureResult;

export function parseJsonValueDocument(
  input: string,
  name = "JsonDocument",
): ValueDocument {
  return parseJsonValueDocumentWithResolvedOptions(input, {
    ...resolveJsonParseOptions(),
    name,
  });
}

export function parseJsonValueDocumentWithOptions(
  input: string,
  options: JsonParseOptions = {},
): ValueDocument {
  const resolvedOptions = resolveJsonParseOptions(options);

  assertSupportedJsonParseOptions(resolvedOptions);

  return parseJsonValueDocumentWithResolvedOptions(input, resolvedOptions);
}

export function tryParseJsonValueDocument(
  input: string,
  name = "JsonDocument",
): JsonValueDocumentResult {
  return tryParseJsonValueDocumentWithOptions(input, { name });
}

export function tryParseJsonValueDocumentWithOptions(
  input: string,
  options: JsonParseOptions = {},
): JsonValueDocumentResult {
  const resolvedOptions = resolveJsonParseOptions(options);

  assertSupportedJsonParseOptions(resolvedOptions);

  try {
    return {
      ok: true,
      document: parseJsonValueDocumentWithResolvedOptions(
        input,
        resolvedOptions,
      ),
    };
  } catch (error) {
    if (isJsonInferenceError(error) && error.code === "invalid-json") {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        ...(error.diagnostics && error.diagnostics.length > 0
          ? { diagnostics: error.diagnostics }
          : {}),
      };
    }

    throw error;
  }
}

export function inferJsonDocumentFromValueDocument(
  document: ValueDocument,
): SchemaDocument {
  return inferJsonDocumentFromValueDocumentWithResolvedOptions(document, {
    ...resolveJsonParseOptions(),
    name: document.name,
  });
}

export function inferJsonDocumentFromValueDocumentWithOptions(
  document: ValueDocument,
  options: JsonParseOptions = {},
): SchemaDocument {
  const resolvedOptions = resolveJsonParseOptions({
    ...options,
    name: options.name ?? document.name,
  });

  assertSupportedJsonParseOptions(resolvedOptions);

  return inferJsonDocumentFromValueDocumentWithResolvedOptions(
    document,
    resolvedOptions,
  );
}

export function tryInferJsonDocumentFromValueDocument(document: ValueDocument):
  | {
      ok: true;
      document: SchemaDocument;
      diagnostics?: SchemaDiagnostic[];
    }
  | ParseFailureResult<"unsupported-mixed-types"> {
  return tryInferJsonDocumentFromValueDocumentWithOptions(document, {
    name: document.name,
  });
}

export function tryInferJsonDocumentFromValueDocumentWithOptions(
  document: ValueDocument,
  options: JsonParseOptions = {},
):
  | {
      ok: true;
      document: SchemaDocument;
      diagnostics?: SchemaDiagnostic[];
    }
  | ParseFailureResult<"unsupported-mixed-types"> {
  const resolvedOptions = resolveJsonParseOptions({
    ...options,
    name: options.name ?? document.name,
  });

  assertSupportedJsonParseOptions(resolvedOptions);

  try {
    const diagnostics: SchemaDiagnostic[] = [];

    return {
      ok: true,
      document: inferJsonDocumentFromValueDocumentWithResolvedOptions(
        document,
        resolvedOptions,
        diagnostics,
      ),
      ...(diagnostics.length > 0 ? { diagnostics } : {}),
    };
  } catch (error) {
    if (
      isJsonInferenceError(error) &&
      error.code === "unsupported-mixed-types"
    ) {
      return {
        ok: false,
        code: error.code,
        message: error.message,
        ...(error.diagnostics && error.diagnostics.length > 0
          ? { diagnostics: error.diagnostics }
          : {}),
      };
    }

    throw error;
  }
}

function parseJsonValueDocumentWithResolvedOptions(
  input: string,
  options: ResolvedJsonParseOptions,
): ValueDocument {
  return valueDocument(
    options.name,
    jsonValueToValueNode(decodeJsonText(input)),
  );
}

function inferJsonDocumentFromValueDocumentWithResolvedOptions(
  document: ValueDocument,
  options: ResolvedJsonParseOptions,
  diagnostics: SchemaDiagnostic[] = [],
): SchemaDocument {
  return schemaDocument(
    options.name,
    inferSchemaNodeFromJsonValue(
      valueNodeToJsonValue(document.root),
      options,
      diagnostics,
    ),
  );
}

function jsonValueToValueNode(value: JsonValue): ValueNode {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return valueScalarNode(value);
  }

  if (Array.isArray(value)) {
    return valueArrayNode(value.map((item) => jsonValueToValueNode(item)));
  }

  return valueObjectNode(
    Object.entries(value).map(([name, fieldValue]) =>
      valueObjectField(name, jsonValueToValueNode(fieldValue)),
    ),
  );
}

function valueNodeToJsonValue(node: ValueNode): JsonValue {
  if (
    node.kind === "string" ||
    node.kind === "number" ||
    node.kind === "boolean"
  ) {
    return node.value;
  }

  if (node.kind === "null") {
    return null;
  }

  if (node.kind === "array") {
    return node.items.map((item) => valueNodeToJsonValue(item));
  }

  return Object.fromEntries(
    node.fields.map((field) => [field.name, valueNodeToJsonValue(field.value)]),
  );
}
