import {
  schemaArrayNode,
  schemaDefinition,
  schemaDocument,
  schemaFieldNode,
  schemaLiteralNode,
  schemaNullNode,
  schemaObjectNode,
  schemaRecordNode,
  schemaReferenceNode,
  schemaScalarNode,
  schemaTupleElement,
  schemaTupleNode,
  schemaUnionNode,
  schemaUnknownNode,
  type SchemaDefinition,
  type SchemaDiagnostic,
  type SchemaNode,
} from "@aio/core";
import { jsonSchemaDiagnostic } from "./diagnostics.js";
import {
  type JsonSchemaInferenceErrorCode,
  throwJsonSchemaInferenceError,
} from "./errors.js";
import type { ResolvedJsonSchemaParseOptions } from "./options.js";

const DRAFT_2020_12_URI = "https://json-schema.org/draft/2020-12/schema";
const ROOT_ALLOWED_KEYWORDS = new Set([
  "$schema",
  "$id",
  "title",
  "$defs",
  "$ref",
  "type",
  "const",
  "properties",
  "required",
  "items",
  "prefixItems",
  "minItems",
  "oneOf",
  "anyOf",
  "additionalProperties",
]);
const NODE_ALLOWED_KEYWORDS = new Set([
  "$ref",
  "type",
  "const",
  "properties",
  "required",
  "items",
  "prefixItems",
  "minItems",
  "oneOf",
  "anyOf",
  "additionalProperties",
]);
const SUPPORTED_COMPACT_NULLABLE_TYPE_VALUES = new Set([
  "string",
  "integer",
  "number",
  "boolean",
]);
type CompactNullableScalarType = "string" | "integer" | "number" | "boolean";
const EXPLICITLY_UNSUPPORTED_KEYWORDS = new Set([
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "dependentSchemas",
  "contains",
  "propertyNames",
  "unevaluatedProperties",
  "unevaluatedItems",
  "pattern",
  "format",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
  "description",
  "examples",
  "default",
  "deprecated",
  "readOnly",
  "writeOnly",
  "enum",
]);
type JsonSchemaObject = Record<string, unknown>;

export function convertJsonSchemaToDocument(
  input: unknown,
  options: ResolvedJsonSchemaParseOptions,
): {
  document: ReturnType<typeof schemaDocument>;
  diagnostics: SchemaDiagnostic[];
} {
  const diagnostics: SchemaDiagnostic[] = [];
  const rootPath = ["root"];

  if (typeof input === "boolean") {
    if (!input) {
      throwUnsupportedBooleanFalse(rootPath);
    }

    return {
      document: schemaDocument(
        options.name ?? "JsonSchemaDocument",
        schemaUnknownNode({
          evidence: {
            source: "parser-json",
            detail: "JSON Schema boolean true was lowered to unknown.",
          },
        }),
      ),
      diagnostics: [
        jsonSchemaDiagnostic({
          severity: "warning",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: rootPath,
          nodeKind: "unknown",
          evidence: {
            sourceKeyword: true,
          },
        }),
      ],
    };
  }

  if (!isJsonSchemaObject(input)) {
    throwInvalidShape(
      "A JSON Schema document must be an object or boolean schema.",
      rootPath,
    );
  }

  assertNoUnsupportedKeywords(input, rootPath, ROOT_ALLOWED_KEYWORDS);
  assertSupportedDraft(input, rootPath);

  const definitions = convertDefinitions(input.$defs, diagnostics);
  const documentName =
    options.name ?? readOptionalString(input.title) ?? "JsonSchemaDocument";
  const rootSchema = stripDocumentMetadata(input);
  const root = convertSchemaNode(rootSchema, rootPath, diagnostics);

  return {
    document: schemaDocument(documentName, root, { definitions }),
    diagnostics,
  };
}

function convertDefinitions(
  defsValue: unknown,
  diagnostics: SchemaDiagnostic[],
): SchemaDefinition[] {
  if (defsValue === undefined) {
    return [];
  }

  if (!isJsonSchemaObject(defsValue)) {
    throwInvalidShape(
      'The "$defs" keyword must be an object.',
      ["definitions"],
      "document",
    );
  }

  return Object.entries(defsValue).map(([name, value]) =>
    schemaDefinition(
      name,
      convertSchemaNode(value, ["definitions", name], diagnostics),
    ),
  );
}

function convertSchemaNode(
  input: unknown,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): SchemaNode {
  if (typeof input === "boolean") {
    if (!input) {
      throwUnsupportedBooleanFalse(path);
    }

    diagnostics.push(
      jsonSchemaDiagnostic({
        severity: "warning",
        code: "json-schema-true-schema-lowered",
        message:
          "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
        path,
        nodeKind: "unknown",
        evidence: {
          sourceKeyword: true,
        },
      }),
    );

    return schemaUnknownNode({
      evidence: {
        source: "parser-json",
        detail: "JSON Schema boolean true was lowered to unknown.",
      },
    });
  }

  if (!isJsonSchemaObject(input)) {
    throwInvalidShape(
      "Every supported JSON Schema node must be an object or boolean schema.",
      path,
    );
  }

  assertNoUnsupportedKeywords(input, path, NODE_ALLOWED_KEYWORDS);

  if ("$defs" in input) {
    throwUnsupportedKeyword("$defs", path);
  }

  if ("$ref" in input) {
    return convertReferenceNode(input.$ref, path);
  }

  if ("const" in input) {
    return convertConstNode(input.const, path);
  }

  if ("oneOf" in input || "anyOf" in input) {
    return convertUnionNode(input, path, diagnostics);
  }

  if ("type" in input) {
    if (Array.isArray(input.type)) {
      return convertTypeArrayNode(input.type, path);
    }

    switch (input.type) {
      case "string":
      case "integer":
      case "number":
      case "boolean":
        return schemaScalarNode(input.type);
      case "null":
        return schemaNullNode();
      case "array":
        return convertArrayOrTupleNode(input, path, diagnostics);
      case "object":
        return convertObjectOrRecordNode(input, path, diagnostics);
      default:
        throwUnsupportedKeyword("type", path, {
          detail: `Unsupported JSON Schema type value: ${String(input.type)}.`,
        });
    }
  }

  if (path.length === 1) {
    return schemaUnknownNode({
      evidence: {
        source: "parser-json",
        detail: "Metadata-only root schema was lowered to unknown.",
      },
    });
  }

  throwInvalidShape(
    "This JSON Schema node does not match any currently supported schema shape.",
    path,
  );
}

function convertTypeArrayNode(
  typeValues: unknown[],
  path: string[],
): SchemaNode {
  if (
    typeValues.length === 2 &&
    typeValues.includes("null") &&
    typeValues.filter((value) => value !== "null").length === 1
  ) {
    const nonNullType = typeValues.find((value) => value !== "null");

    if (isCompactNullableScalarType(nonNullType)) {
      return schemaUnionNode([schemaScalarNode(nonNullType), schemaNullNode()]);
    }
  }

  throwTypeArray(path);
}

function convertReferenceNode(refValue: unknown, path: string[]): SchemaNode {
  if (typeof refValue !== "string") {
    throwInvalidShape(
      'The "$ref" keyword must be a string.',
      path,
      "reference",
    );
  }

  if (!refValue.startsWith("#/$defs/")) {
    throwInferenceError(
      "unsupported-json-schema-ref",
      'Only document-local "$ref" values into "#/$defs/..." are supported.',
      [
        jsonSchemaDiagnostic({
          severity: "error",
          code: "unsupported-json-schema-ref",
          message:
            'Only document-local "$ref" values into "#/$defs/..." are supported.',
          path,
          nodeKind: "reference",
          evidence: {
            ref: refValue,
          },
        }),
      ],
    );
  }

  const name = refValue.slice("#/$defs/".length);

  if (name.trim().length === 0) {
    throwInvalidShape(
      'The "$ref" keyword must point to a non-empty document-local definition name.',
      path,
      "reference",
    );
  }

  return schemaReferenceNode(name);
}

function convertConstNode(constValue: unknown, path: string[]): SchemaNode {
  if (
    typeof constValue !== "string" &&
    typeof constValue !== "number" &&
    typeof constValue !== "boolean"
  ) {
    throwInvalidShape(
      'The "const" keyword currently supports only string, number, or boolean values.',
      path,
      "literal",
    );
  }

  return schemaLiteralNode(constValue);
}

function convertUnionNode(
  input: JsonSchemaObject,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): SchemaNode {
  const keyword = "oneOf" in input ? "oneOf" : "anyOf";
  const rawMembers = input[keyword];

  if (!Array.isArray(rawMembers) || rawMembers.length === 0) {
    throwInvalidShape(
      `The "${keyword}" keyword must be a non-empty array.`,
      path,
      "union",
    );
  }

  diagnostics.push(
    jsonSchemaDiagnostic({
      severity: "warning",
      code: "json-schema-union-composition-lowered",
      message: `The JSON Schema "${keyword}" composition was lowered into the shared union semantics.`,
      path,
      nodeKind: "union",
      evidence: {
        sourceKeyword: keyword,
      },
    }),
  );

  return schemaUnionNode(
    rawMembers.map((member, index) =>
      convertSchemaNode(member, [...path, String(index)], diagnostics),
    ),
  );
}

function convertArrayOrTupleNode(
  input: JsonSchemaObject,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): SchemaNode {
  const hasPrefixItems = "prefixItems" in input;
  const itemsValue = input.items;

  if (hasPrefixItems) {
    if (!Array.isArray(input.prefixItems)) {
      throwInvalidShape(
        'The "prefixItems" keyword must be an array.',
        path,
        "tuple",
      );
    }

    if (itemsValue !== false) {
      throwInvalidShape(
        'Tuple-style schemas currently require "items": false.',
        path,
        "tuple",
      );
    }

    const minItems = input.minItems;

    if (
      minItems !== undefined &&
      (!Number.isInteger(minItems) ||
        (minItems as number) < 0 ||
        (minItems as number) > input.prefixItems.length)
    ) {
      throwInvalidShape(
        'The "minItems" keyword must be an integer between 0 and the "prefixItems" length.',
        path,
        "tuple",
      );
    }

    const requiredCount =
      minItems === undefined ? input.prefixItems.length : (minItems as number);

    return schemaTupleNode(
      input.prefixItems.map((member, index) =>
        schemaTupleElement(
          convertSchemaNode(member, [...path, String(index)], diagnostics),
          {
            required: index < requiredCount,
          },
        ),
      ),
    );
  }

  if (itemsValue === undefined) {
    return schemaArrayNode(
      schemaUnknownNode({
        evidence: {
          source: "parser-json",
          detail:
            'A JSON Schema array without "items" was lowered to array<unknown>.',
        },
      }),
    );
  }

  if (itemsValue === false) {
    throwUnsupportedBooleanFalse([...path, "items"]);
  }

  if (minItemsIsPresentWithoutTuple(input)) {
    throwUnsupportedKeyword("minItems", path, {
      detail:
        'The "minItems" keyword is only supported in the tuple-aligned "prefixItems" form.',
    });
  }

  return schemaArrayNode(
    convertSchemaNode(itemsValue, [...path, "elementType"], diagnostics),
  );
}

function convertObjectOrRecordNode(
  input: JsonSchemaObject,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): SchemaNode {
  const propertiesValue = input.properties;
  const requiredValue = input.required;
  const additionalPropertiesValue = input.additionalProperties;

  if (propertiesValue !== undefined && !isJsonSchemaObject(propertiesValue)) {
    throwInvalidShape(
      'The "properties" keyword must be an object.',
      path,
      "object",
    );
  }

  if (requiredValue !== undefined) {
    if (
      !Array.isArray(requiredValue) ||
      requiredValue.some((member) => typeof member !== "string")
    ) {
      throwInvalidShape(
        'The "required" keyword must be an array of property names.',
        path,
        "object",
      );
    }
  }

  const propertyEntries = propertiesValue
    ? Object.entries(propertiesValue)
    : [];
  const hasProperties = propertyEntries.length > 0;
  const requiredNames = new Set<string>(requiredValue ?? []);

  for (const requiredName of requiredNames) {
    if (!propertyEntries.some(([name]) => name === requiredName)) {
      throwInvalidShape(
        `The "required" keyword references an unknown property: ${requiredName}.`,
        [...path, requiredName],
        "object",
      );
    }
  }

  if (additionalPropertiesValue === false) {
    throwInferenceError(
      "unsupported-json-schema-closed-object",
      'Closed objects through "additionalProperties: false" are not supported by the current shared IR.',
      [
        jsonSchemaDiagnostic({
          severity: "error",
          code: "unsupported-json-schema-closed-object",
          message:
            'Closed objects through "additionalProperties: false" are not supported by the current shared IR.',
          path,
          nodeKind: "object",
        }),
      ],
    );
  }

  if (
    additionalPropertiesValue !== undefined &&
    additionalPropertiesValue !== true &&
    hasProperties
  ) {
    throwInferenceError(
      "unsupported-json-schema-mixed-object-shape",
      "Mixed fixed-field objects plus typed additionalProperties are not supported by the current shared IR.",
      [
        jsonSchemaDiagnostic({
          severity: "error",
          code: "unsupported-json-schema-mixed-object-shape",
          message:
            "Mixed fixed-field objects plus typed additionalProperties are not supported by the current shared IR.",
          path,
          nodeKind: "object",
        }),
      ],
    );
  }

  if (!hasProperties && additionalPropertiesValue !== undefined) {
    return schemaRecordNode(
      schemaScalarNode("string"),
      additionalPropertiesValue === true
        ? schemaUnknownNode({
            evidence: {
              source: "parser-json",
              detail:
                'A JSON Schema "additionalProperties: true" map was lowered to Record<string, unknown>.',
            },
          })
        : convertSchemaNode(
            additionalPropertiesValue,
            [...path, "value"],
            diagnostics,
          ),
    );
  }

  return schemaObjectNode(
    propertyEntries.map(([name, value]) =>
      convertObjectField(
        name,
        value,
        requiredNames.has(name),
        path,
        diagnostics,
      ),
    ),
  );
}

function convertObjectField(
  name: string,
  schemaValue: unknown,
  required: boolean,
  objectPath: string[],
  diagnostics: SchemaDiagnostic[],
) {
  const propertyPath = [...objectPath, name];
  const normalized = tryNormalizeNullablePropertySchema(
    schemaValue,
    propertyPath,
    diagnostics,
  );

  return schemaFieldNode(name, normalized.type, {
    required,
    nullable: normalized.nullable,
  });
}

function tryNormalizeNullablePropertySchema(
  schemaValue: unknown,
  path: string[],
  diagnostics: SchemaDiagnostic[],
): { type: SchemaNode; nullable: boolean } {
  if (!isJsonSchemaObject(schemaValue)) {
    return {
      type: convertSchemaNode(schemaValue, path, diagnostics),
      nullable: false,
    };
  }

  if (Array.isArray(schemaValue.type)) {
    const compactNullable = tryNormalizeCompactNullableTypeArray(
      schemaValue.type,
      path,
      diagnostics,
    );

    if (compactNullable !== null) {
      return compactNullable;
    }
  }

  const keyword =
    "oneOf" in schemaValue
      ? "oneOf"
      : "anyOf" in schemaValue
        ? "anyOf"
        : undefined;

  if (keyword === undefined) {
    return {
      type: convertSchemaNode(schemaValue, path, diagnostics),
      nullable: false,
    };
  }

  const members = schemaValue[keyword];

  if (!Array.isArray(members) || members.length < 2) {
    return {
      type: convertSchemaNode(schemaValue, path, diagnostics),
      nullable: false,
    };
  }

  const nonNullMembers = members.filter(
    (member) => !isExplicitNullSchema(member),
  );
  const nullMemberCount = members.length - nonNullMembers.length;

  if (nullMemberCount !== 1 || nonNullMembers.length === 0) {
    return {
      type: convertSchemaNode(schemaValue, path, diagnostics),
      nullable: false,
    };
  }

  diagnostics.push(
    jsonSchemaDiagnostic({
      severity: "warning",
      code: "json-schema-nullable-property-normalized",
      message:
        "This nullable property schema was normalized into field-level nullability in the shared IR.",
      path,
      nodeKind: "field",
      evidence: {
        sourceKeyword: keyword,
      },
    }),
  );

  const type =
    nonNullMembers.length === 1
      ? convertSchemaNode(nonNullMembers[0], path, diagnostics)
      : schemaUnionNode(
          nonNullMembers.map((member, index) =>
            convertSchemaNode(member, [...path, String(index)], diagnostics),
          ),
        );

  return {
    type,
    nullable: true,
  };
}

function tryNormalizeCompactNullableTypeArray(
  typeValues: unknown[],
  path: string[],
  diagnostics: SchemaDiagnostic[],
): { type: SchemaNode; nullable: boolean } | null {
  if (
    typeValues.length !== 2 ||
    !typeValues.includes("null") ||
    typeValues.filter((value) => value !== "null").length !== 1
  ) {
    return null;
  }

  const nonNullType = typeValues.find((value) => value !== "null");

  if (!isCompactNullableScalarType(nonNullType)) {
    return null;
  }

  diagnostics.push(
    jsonSchemaDiagnostic({
      severity: "warning",
      code: "json-schema-nullable-property-normalized",
      message:
        "This nullable property schema was normalized into field-level nullability in the shared IR.",
      path,
      nodeKind: "field",
      evidence: {
        sourceKeyword: "type",
      },
    }),
  );

  return {
    type: schemaScalarNode(nonNullType),
    nullable: true,
  };
}

function isCompactNullableScalarType(
  value: unknown,
): value is CompactNullableScalarType {
  return (
    typeof value === "string" &&
    SUPPORTED_COMPACT_NULLABLE_TYPE_VALUES.has(value)
  );
}

function isExplicitNullSchema(value: unknown): boolean {
  return (
    isJsonSchemaObject(value) &&
    Object.keys(value).length === 1 &&
    value.type === "null"
  );
}

function assertSupportedDraft(input: JsonSchemaObject, path: string[]): void {
  const draftValue = input.$schema;

  if (draftValue === undefined) {
    return;
  }

  if (draftValue !== DRAFT_2020_12_URI) {
    throwInferenceError(
      "unsupported-json-schema-draft",
      `Unsupported JSON Schema draft: ${String(draftValue)}.`,
      [
        jsonSchemaDiagnostic({
          severity: "error",
          code: "unsupported-json-schema-draft",
          message: `Unsupported JSON Schema draft: ${String(draftValue)}.`,
          path,
          nodeKind: "document",
          evidence: {
            draft: draftValue,
          },
        }),
      ],
    );
  }
}

function assertNoUnsupportedKeywords(
  input: JsonSchemaObject,
  path: string[],
  allowedKeywords: ReadonlySet<string>,
): void {
  for (const key of Object.keys(input)) {
    if (EXPLICITLY_UNSUPPORTED_KEYWORDS.has(key)) {
      throwUnsupportedKeyword(key, path);
    }

    if (!allowedKeywords.has(key)) {
      throwUnsupportedKeyword(key, path);
    }
  }
}

function throwUnsupportedKeyword(
  keyword: string,
  path: string[],
  evidence?: Record<string, unknown>,
): never {
  throwInferenceError(
    "unsupported-json-schema-keyword",
    `Unsupported JSON Schema keyword: ${keyword}.`,
    [
      jsonSchemaDiagnostic({
        severity: "error",
        code: "unsupported-json-schema-keyword",
        message: `Unsupported JSON Schema keyword: ${keyword}.`,
        path,
        nodeKind: "type",
        evidence: {
          keyword,
          ...evidence,
        },
      }),
    ],
  );
}

function throwTypeArray(path: string[]): never {
  throwInferenceError(
    "unsupported-json-schema-type-array",
    'Compact JSON Schema "type: [...]" forms are not supported by the current parser.',
    [
      jsonSchemaDiagnostic({
        severity: "error",
        code: "unsupported-json-schema-type-array",
        message:
          'Compact JSON Schema "type: [...]" forms are not supported by the current parser.',
        path,
        nodeKind: "type",
      }),
    ],
  );
}

function throwUnsupportedBooleanFalse(path: string[]): never {
  throwInferenceError(
    "unsupported-json-schema-boolean-false",
    "Boolean false schemas are not supported by the current shared IR.",
    [
      jsonSchemaDiagnostic({
        severity: "error",
        code: "unsupported-json-schema-boolean-false",
        message:
          "Boolean false schemas are not supported by the current shared IR.",
        path,
        nodeKind: "type",
      }),
    ],
  );
}

function throwInvalidShape(
  message: string,
  path: string[],
  nodeKind:
    | "document"
    | "object"
    | "tuple"
    | "literal"
    | "reference"
    | "type"
    | "union" = "type",
): never {
  throwInferenceError("invalid-json-schema-shape", message, [
    jsonSchemaDiagnostic({
      severity: "error",
      code: "invalid-json-schema-shape",
      message,
      path,
      nodeKind,
    }),
  ]);
}

function throwInferenceError(
  code: JsonSchemaInferenceErrorCode,
  message: string,
  diagnostics: SchemaDiagnostic[],
): never {
  throwJsonSchemaInferenceError(code, message, diagnostics);
}

function stripDocumentMetadata(input: JsonSchemaObject): JsonSchemaObject {
  const rootSchema: JsonSchemaObject = {};

  for (const [key, value] of Object.entries(input)) {
    if (
      key === "$schema" ||
      key === "$id" ||
      key === "title" ||
      key === "$defs"
    ) {
      continue;
    }

    rootSchema[key] = value;
  }

  return rootSchema;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isJsonSchemaObject(value: unknown): value is JsonSchemaObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function minItemsIsPresentWithoutTuple(input: JsonSchemaObject): boolean {
  return "minItems" in input && !("prefixItems" in input);
}
