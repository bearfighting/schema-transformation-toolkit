import {
  constraint,
  constraintDocument,
  constraintEntry,
  constraintTarget,
  schemaArrayNode,
  pushSchemaObservation,
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
  type SchemaSemanticNote,
  type ConstraintDocument,
  type ConstraintEntry,
} from "@aio/core";
import {
  jsonSchemaDiagnostic,
  jsonSchemaObservation,
  jsonSchemaSemanticNote,
} from "./diagnostics.js";
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
  "maxItems",
  "uniqueItems",
  "oneOf",
  "anyOf",
  "additionalProperties",
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minProperties",
  "maxProperties",
  "format",
  "default",
  "examples",
  "readOnly",
  "writeOnly",
  "description",
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
  "maxItems",
  "uniqueItems",
  "oneOf",
  "anyOf",
  "additionalProperties",
  "pattern",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minProperties",
  "maxProperties",
  "format",
  "default",
  "examples",
  "readOnly",
  "writeOnly",
  "description",
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
  "deprecated",
  "enum",
]);
type JsonSchemaObject = Record<string, unknown>;

export function convertJsonSchemaToDocument(
  input: unknown,
  options: ResolvedJsonSchemaParseOptions,
): {
  document: ReturnType<typeof schemaDocument>;
  constraints: ConstraintDocument;
  diagnostics: SchemaDiagnostic[];
  semanticNotes: SchemaSemanticNote[];
} {
  const diagnostics: SchemaDiagnostic[] = [];
  const semanticNotes: SchemaSemanticNote[] = [];
  const constraintEntries: ConstraintEntry[] = [];
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
      constraints: constraintDocument(
        options.name ?? "JsonSchemaDocument",
        constraintEntries,
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
      semanticNotes: [
        jsonSchemaObservation({
          severity: "warning",
          kind: "widening",
          code: "json-schema-true-schema-lowered",
          message:
            "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
          path: rootPath,
          nodeKind: "unknown",
          layer: "shape",
          evidence: {
            sourceKeyword: true,
          },
        }).semanticNote,
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

  const definitions = convertDefinitions(
    input.$defs,
    constraintEntries,
    diagnostics,
    semanticNotes,
  );
  const documentName =
    options.name ?? readOptionalString(input.title) ?? "JsonSchemaDocument";
  const rootSchema = stripDocumentMetadata(input);
  const root = convertSchemaNode(
    rootSchema,
    rootPath,
    constraintEntries,
    diagnostics,
    semanticNotes,
  );

  return {
    document: schemaDocument(documentName, root, { definitions }),
    constraints: constraintDocument(documentName, constraintEntries),
    diagnostics,
    semanticNotes,
  };
}

function convertDefinitions(
  defsValue: unknown,
  constraintEntries: ConstraintEntry[],
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
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
      convertSchemaNode(
        value,
        ["definitions", name],
        constraintEntries,
        diagnostics,
        semanticNotes,
      ),
    ),
  );
}

function convertSchemaNode(
  input: unknown,
  path: string[],
  constraintEntries: ConstraintEntry[],
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
): SchemaNode {
  if (typeof input === "boolean") {
    if (!input) {
      throwUnsupportedBooleanFalse(path);
    }

    pushSchemaObservation(diagnostics, semanticNotes, {
      severity: "warning",
      kind: "widening",
      code: "json-schema-true-schema-lowered",
      message:
        "This JSON Schema true-schema was lowered into the shared unknown schema semantics.",
      path,
      nodeKind: "unknown",
      source: "parser-json-schema",
      layer: "shape",
      evidence: {
        sourceKeyword: true,
      },
    });

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
    return convertUnionNode(
      input,
      path,
      constraintEntries,
      diagnostics,
      semanticNotes,
    );
  }

  if ("type" in input) {
    if (Array.isArray(input.type)) {
      return convertTypeArrayNode(input.type, path);
    }

    switch (input.type) {
      case "string":
        return extractStringNodeConstraints(
          input,
          path,
          constraintEntries,
          semanticNotes,
          schemaScalarNode(input.type),
        );
      case "integer":
      case "number":
        return extractNumericNodeConstraints(
          input,
          path,
          constraintEntries,
          semanticNotes,
          schemaScalarNode(input.type),
        );
      case "boolean":
        return extractDescriptionConstraint(
          input,
          path,
          "type",
          constraintEntries,
          semanticNotes,
          schemaScalarNode(input.type),
        );
      case "null":
        return extractDescriptionConstraint(
          input,
          path,
          "type",
          constraintEntries,
          semanticNotes,
          schemaNullNode(),
        );
      case "array":
        return convertArrayOrTupleNode(
          input,
          path,
          constraintEntries,
          diagnostics,
          semanticNotes,
        );
      case "object":
        return convertObjectOrRecordNode(
          input,
          path,
          constraintEntries,
          diagnostics,
          semanticNotes,
        );
      default:
        throwUnsupportedKeyword("type", path, {
          detail: `Unsupported JSON Schema type value: ${String(input.type)}.`,
        });
    }
  }

  if (path.length === 1) {
    semanticNotes.push(
      jsonSchemaObservation({
        severity: "warning",
        kind: "widening",
        code: "json-schema-metadata-only-root-lowered",
        message:
          "This metadata-only root schema was lowered into the shared unknown schema semantics.",
        path,
        nodeKind: "unknown",
        layer: "shape",
        evidence: {
          sourceForm: "metadata-only-root",
        },
      }).semanticNote,
    );
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
  constraintEntries: ConstraintEntry[],
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
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

  pushSchemaObservation(diagnostics, semanticNotes, {
    severity: "warning",
    kind: "loss",
    code: "json-schema-union-composition-lowered",
    message: `The JSON Schema "${keyword}" composition was lowered into the shared union semantics.`,
    path,
    nodeKind: "union",
    source: "parser-json-schema",
    layer: "shape",
    evidence: {
      sourceKeyword: keyword,
    },
  });

  return schemaUnionNode(
    rawMembers.map((member, index) =>
      convertSchemaNode(
        member,
        [...path, String(index)],
        constraintEntries,
        diagnostics,
        semanticNotes,
      ),
    ),
  );
}

function convertArrayOrTupleNode(
  input: JsonSchemaObject,
  path: string[],
  constraintEntries: ConstraintEntry[],
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
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

    const tupleNode = schemaTupleNode(
      input.prefixItems.map((member, index) =>
        schemaTupleElement(
          convertSchemaNode(
            member,
            [...path, String(index)],
            constraintEntries,
            diagnostics,
            semanticNotes,
          ),
          {
            required: index < requiredCount,
          },
        ),
      ),
    );

    extractMaxItemsConstraint(
      input,
      path,
      "tuple",
      constraintEntries,
      semanticNotes,
    );
    extractUniqueItemsConstraint(
      input,
      path,
      "tuple",
      constraintEntries,
      semanticNotes,
    );

    return extractDescriptionConstraint(
      input,
      path,
      "tuple",
      constraintEntries,
      semanticNotes,
      tupleNode,
    );
  }

  if (itemsValue === undefined) {
    semanticNotes.push(
      jsonSchemaObservation({
        severity: "warning",
        kind: "widening",
        code: "json-schema-array-items-missing-lowered",
        message:
          'This JSON Schema array without "items" was lowered into array<unknown> in the shared schema semantics.',
        path: [...path, "elementType"],
        nodeKind: "unknown",
        layer: "shape",
        evidence: {
          sourceKeyword: "items",
          loweredForm: "array<unknown>",
        },
      }).semanticNote,
    );
    return extractDescriptionConstraint(
      input,
      path,
      "array",
      constraintEntries,
      semanticNotes,
      schemaArrayNode(
        schemaUnknownNode({
          evidence: {
            source: "parser-json",
            detail:
              'A JSON Schema array without "items" was lowered to array<unknown>.',
          },
        }),
      ),
    );
  }

  if (itemsValue === false) {
    throwUnsupportedBooleanFalse([...path, "items"]);
  }

  const elementType = convertSchemaNode(
    itemsValue,
    [...path, "elementType"],
    constraintEntries,
    diagnostics,
    semanticNotes,
  );

  if (typeof input.minItems === "number") {
    if (!Number.isInteger(input.minItems) || input.minItems < 0) {
      throwInvalidShape(
        'The "minItems" keyword must be a non-negative integer.',
        path,
        "array",
      );
    }

    constraintEntries.push(
      constraintEntry(constraintTarget("node", path), [
        constraint("min-items", {
          value: input.minItems,
          message:
            'This JSON Schema "minItems" constraint was preserved in constraint IR.',
          evidence: {
            sourceKeyword: "minItems",
          },
        }),
      ]),
    );

    semanticNotes.push(
      jsonSchemaSemanticNote({
        kind: "normalization",
        code: "json-schema-min-items-extracted",
        message:
          'This JSON Schema "minItems" rule was extracted into constraint IR.',
        path,
        nodeKind: "array",
        layer: "constraint",
        evidence: {
          sourceKeyword: "minItems",
          value: input.minItems,
        },
      }),
    );
  }

  extractMaxItemsConstraint(
    input,
    path,
    "array",
    constraintEntries,
    semanticNotes,
  );
  extractUniqueItemsConstraint(
    input,
    path,
    "array",
    constraintEntries,
    semanticNotes,
  );

  return extractDescriptionConstraint(
    input,
    path,
    "array",
    constraintEntries,
    semanticNotes,
    schemaArrayNode(elementType),
  );
}

function convertObjectOrRecordNode(
  input: JsonSchemaObject,
  path: string[],
  constraintEntries: ConstraintEntry[],
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
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

  if (
    additionalPropertiesValue !== undefined &&
    additionalPropertiesValue !== true &&
    additionalPropertiesValue !== false &&
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
        ? (() => {
            semanticNotes.push(
              jsonSchemaObservation({
                severity: "warning",
                kind: "widening",
                code: "json-schema-additional-properties-true-lowered",
                message:
                  'This JSON Schema "additionalProperties: true" map was lowered into Record<string, unknown> in the shared schema semantics.',
                path: [...path, "value"],
                nodeKind: "unknown",
                layer: "shape",
                evidence: {
                  sourceKeyword: "additionalProperties",
                  loweredForm: "Record<string, unknown>",
                },
              }).semanticNote,
            );

            return schemaUnknownNode({
              evidence: {
                source: "parser-json",
                detail:
                  'A JSON Schema "additionalProperties: true" map was lowered to Record<string, unknown>.',
              },
            });
          })()
        : convertSchemaNode(
            additionalPropertiesValue,
            [...path, "value"],
            constraintEntries,
            diagnostics,
            semanticNotes,
          ),
    );
  }

  const objectNode = schemaObjectNode(
    propertyEntries.map(([name, value]) =>
      convertObjectField(
        name,
        value,
        requiredNames.has(name),
        path,
        constraintEntries,
        diagnostics,
        semanticNotes,
      ),
    ),
  );

  if (additionalPropertiesValue === false) {
    constraintEntries.push(
      constraintEntry(constraintTarget("node", path), [
        constraint("closed-object", {
          value: false,
          message:
            'This JSON Schema "additionalProperties: false" rule was preserved in constraint IR.',
          evidence: {
            sourceKeyword: "additionalProperties",
          },
        }),
      ]),
    );

    semanticNotes.push(
      jsonSchemaSemanticNote({
        kind: "normalization",
        code: "json-schema-closed-object-extracted",
        message:
          'This JSON Schema "additionalProperties: false" rule was extracted into constraint IR.',
        path,
        nodeKind: "object",
        layer: "constraint",
        evidence: {
          sourceKeyword: "additionalProperties",
          value: false,
        },
      }),
    );
  }

  extractPropertyCountConstraint(
    input,
    path,
    "minProperties",
    "min-properties",
    "json-schema-min-properties-extracted",
    'This JSON Schema "minProperties" rule was extracted into constraint IR.',
    constraintEntries,
    semanticNotes,
  );
  extractPropertyCountConstraint(
    input,
    path,
    "maxProperties",
    "max-properties",
    "json-schema-max-properties-extracted",
    'This JSON Schema "maxProperties" rule was extracted into constraint IR.',
    constraintEntries,
    semanticNotes,
  );

  return extractDescriptionConstraint(
    input,
    path,
    "object",
    constraintEntries,
    semanticNotes,
    objectNode,
  );
}

function convertObjectField(
  name: string,
  schemaValue: unknown,
  required: boolean,
  objectPath: string[],
  constraintEntries: ConstraintEntry[],
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
) {
  const propertyPath = [...objectPath, name];
  const normalized = tryNormalizeNullablePropertySchema(
    schemaValue,
    propertyPath,
    constraintEntries,
    diagnostics,
    semanticNotes,
  );

  return schemaFieldNode(name, normalized.type, {
    required,
    nullable: normalized.nullable,
  });
}

function tryNormalizeNullablePropertySchema(
  schemaValue: unknown,
  path: string[],
  constraintEntries: ConstraintEntry[],
  diagnostics: SchemaDiagnostic[],
  semanticNotes: SchemaSemanticNote[],
): { type: SchemaNode; nullable: boolean } {
  if (!isJsonSchemaObject(schemaValue)) {
    return {
      type: convertSchemaNode(
        schemaValue,
        path,
        constraintEntries,
        diagnostics,
        semanticNotes,
      ),
      nullable: false,
    };
  }

  if (Array.isArray(schemaValue.type)) {
    const compactNullable = tryNormalizeCompactNullableTypeArray(
      schemaValue.type,
      path,
      diagnostics,
      semanticNotes,
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
      type: convertSchemaNode(
        schemaValue,
        path,
        constraintEntries,
        diagnostics,
        semanticNotes,
      ),
      nullable: false,
    };
  }

  const members = schemaValue[keyword];

  if (!Array.isArray(members) || members.length < 2) {
    return {
      type: convertSchemaNode(
        schemaValue,
        path,
        constraintEntries,
        diagnostics,
        semanticNotes,
      ),
      nullable: false,
    };
  }

  const nonNullMembers = members.filter(
    (member) => !isExplicitNullSchema(member),
  );
  const nullMemberCount = members.length - nonNullMembers.length;

  if (nullMemberCount !== 1 || nonNullMembers.length === 0) {
    return {
      type: convertSchemaNode(
        schemaValue,
        path,
        constraintEntries,
        diagnostics,
        semanticNotes,
      ),
      nullable: false,
    };
  }

  pushSchemaObservation(diagnostics, semanticNotes, {
    severity: "warning",
    kind: "normalization",
    code: "json-schema-nullable-property-normalized",
    message:
      "This nullable property schema was normalized into field-level nullability in the shared IR.",
    path,
    nodeKind: "field",
    source: "parser-json-schema",
    layer: "shape",
    evidence: {
      sourceKeyword: keyword,
    },
  });

  const type =
    nonNullMembers.length === 1
      ? convertSchemaNode(
          nonNullMembers[0],
          path,
          constraintEntries,
          diagnostics,
          semanticNotes,
        )
      : schemaUnionNode(
          nonNullMembers.map((member, index) =>
            convertSchemaNode(
              member,
              [...path, String(index)],
              constraintEntries,
              diagnostics,
              semanticNotes,
            ),
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
  semanticNotes: SchemaSemanticNote[],
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

  pushSchemaObservation(diagnostics, semanticNotes, {
    severity: "warning",
    kind: "normalization",
    code: "json-schema-nullable-property-normalized",
    message:
      "This nullable property schema was normalized into field-level nullability in the shared IR.",
    path,
    nodeKind: "field",
    source: "parser-json-schema",
    layer: "shape",
    evidence: {
      sourceKeyword: "type",
    },
  });

  return {
    type: schemaScalarNode(nonNullType),
    nullable: true,
  };
}

function extractStringNodeConstraints(
  input: JsonSchemaObject,
  path: string[],
  constraintEntries: ConstraintEntry[],
  semanticNotes: SchemaSemanticNote[],
  node: SchemaNode,
): SchemaNode {
  if (input.pattern !== undefined) {
    if (typeof input.pattern !== "string") {
      throwInvalidShape(
        'The "pattern" keyword must be a string.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "pattern",
      "json-schema-pattern-extracted",
      'This JSON Schema "pattern" rule was extracted into constraint IR.',
      input.pattern,
      "pattern",
    );
  }

  if (input.minLength !== undefined) {
    if (
      typeof input.minLength !== "number" ||
      !Number.isInteger(input.minLength) ||
      input.minLength < 0
    ) {
      throwInvalidShape(
        'The "minLength" keyword must be a non-negative integer.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "min-length",
      "json-schema-min-length-extracted",
      'This JSON Schema "minLength" rule was extracted into constraint IR.',
      input.minLength,
      "minLength",
    );
  }

  if (input.maxLength !== undefined) {
    if (
      typeof input.maxLength !== "number" ||
      !Number.isInteger(input.maxLength) ||
      input.maxLength < 0
    ) {
      throwInvalidShape(
        'The "maxLength" keyword must be a non-negative integer.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "max-length",
      "json-schema-max-length-extracted",
      'This JSON Schema "maxLength" rule was extracted into constraint IR.',
      input.maxLength,
      "maxLength",
    );
  }

  return extractDescriptionConstraint(
    input,
    path,
    "type",
    constraintEntries,
    semanticNotes,
    node,
  );
}

function extractNumericNodeConstraints(
  input: JsonSchemaObject,
  path: string[],
  constraintEntries: ConstraintEntry[],
  semanticNotes: SchemaSemanticNote[],
  node: SchemaNode,
): SchemaNode {
  if (input.minimum !== undefined) {
    if (typeof input.minimum !== "number" || !Number.isFinite(input.minimum)) {
      throwInvalidShape(
        'The "minimum" keyword must be a finite number.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "minimum",
      "json-schema-minimum-extracted",
      'This JSON Schema "minimum" rule was extracted into constraint IR.',
      input.minimum,
      "minimum",
    );
  }

  if (input.exclusiveMinimum !== undefined) {
    if (
      typeof input.exclusiveMinimum !== "number" ||
      !Number.isFinite(input.exclusiveMinimum)
    ) {
      throwInvalidShape(
        'The "exclusiveMinimum" keyword must be a finite number.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "exclusive-minimum",
      "json-schema-exclusive-minimum-extracted",
      'This JSON Schema "exclusiveMinimum" rule was extracted into constraint IR.',
      input.exclusiveMinimum,
      "exclusiveMinimum",
    );
  }

  if (input.maximum !== undefined) {
    if (typeof input.maximum !== "number" || !Number.isFinite(input.maximum)) {
      throwInvalidShape(
        'The "maximum" keyword must be a finite number.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "maximum",
      "json-schema-maximum-extracted",
      'This JSON Schema "maximum" rule was extracted into constraint IR.',
      input.maximum,
      "maximum",
    );
  }

  if (input.exclusiveMaximum !== undefined) {
    if (
      typeof input.exclusiveMaximum !== "number" ||
      !Number.isFinite(input.exclusiveMaximum)
    ) {
      throwInvalidShape(
        'The "exclusiveMaximum" keyword must be a finite number.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "exclusive-maximum",
      "json-schema-exclusive-maximum-extracted",
      'This JSON Schema "exclusiveMaximum" rule was extracted into constraint IR.',
      input.exclusiveMaximum,
      "exclusiveMaximum",
    );
  }

  if (input.multipleOf !== undefined) {
    if (
      typeof input.multipleOf !== "number" ||
      !Number.isFinite(input.multipleOf) ||
      input.multipleOf <= 0
    ) {
      throwInvalidShape(
        'The "multipleOf" keyword must be a finite number greater than 0.',
        path,
        "type",
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      "type",
      "multiple-of",
      "json-schema-multiple-of-extracted",
      'This JSON Schema "multipleOf" rule was extracted into constraint IR.',
      input.multipleOf,
      "multipleOf",
    );
  }

  return extractDescriptionConstraint(
    input,
    path,
    "type",
    constraintEntries,
    semanticNotes,
    node,
  );
}

function extractMaxItemsConstraint(
  input: JsonSchemaObject,
  path: string[],
  nodeKind: "array" | "tuple",
  constraintEntries: ConstraintEntry[],
  semanticNotes: SchemaSemanticNote[],
): void {
  const maxItems = input.maxItems;

  if (maxItems === undefined) {
    return;
  }

  if (
    typeof maxItems !== "number" ||
    !Number.isInteger(maxItems) ||
    maxItems < 0
  ) {
    throwInvalidShape(
      'The "maxItems" keyword must be a non-negative integer.',
      path,
      nodeKind,
    );
  }

  pushExtractedConstraint(
    constraintEntries,
    semanticNotes,
    path,
    nodeKind,
    "max-items",
    "json-schema-max-items-extracted",
    'This JSON Schema "maxItems" rule was extracted into constraint IR.',
    maxItems,
    "maxItems",
  );
}

function extractUniqueItemsConstraint(
  input: JsonSchemaObject,
  path: string[],
  nodeKind: "array" | "tuple",
  constraintEntries: ConstraintEntry[],
  semanticNotes: SchemaSemanticNote[],
): void {
  const uniqueItems = input.uniqueItems;

  if (uniqueItems === undefined) {
    return;
  }

  if (typeof uniqueItems !== "boolean") {
    throwInvalidShape(
      'The "uniqueItems" keyword must be a boolean.',
      path,
      nodeKind,
    );
  }

  pushExtractedConstraint(
    constraintEntries,
    semanticNotes,
    path,
    nodeKind,
    "unique-items",
    "json-schema-unique-items-extracted",
    'This JSON Schema "uniqueItems" rule was extracted into constraint IR.',
    uniqueItems,
    "uniqueItems",
  );
}

function extractDescriptionConstraint(
  input: JsonSchemaObject,
  path: string[],
  nodeKind: "type" | "array" | "tuple" | "object",
  constraintEntries: ConstraintEntry[],
  semanticNotes: SchemaSemanticNote[],
  node: SchemaNode,
): SchemaNode {
  if (input.format !== undefined) {
    if (typeof input.format !== "string") {
      throwInvalidShape(
        'The "format" keyword must be a string.',
        path,
        nodeKind,
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      nodeKind,
      "format",
      "json-schema-format-extracted",
      'This JSON Schema "format" annotation was extracted into constraint IR.',
      input.format,
      "format",
    );
  }

  if (input.default !== undefined) {
    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      nodeKind,
      "default",
      "json-schema-default-extracted",
      'This JSON Schema "default" annotation was extracted into constraint IR.',
      input.default,
      "default",
    );
  }

  if (input.examples !== undefined) {
    if (!Array.isArray(input.examples)) {
      throwInvalidShape(
        'The "examples" keyword must be an array.',
        path,
        nodeKind,
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      nodeKind,
      "examples",
      "json-schema-examples-extracted",
      'This JSON Schema "examples" annotation was extracted into constraint IR.',
      input.examples,
      "examples",
    );
  }

  if (input.readOnly !== undefined) {
    if (typeof input.readOnly !== "boolean") {
      throwInvalidShape(
        'The "readOnly" keyword must be a boolean.',
        path,
        nodeKind,
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      nodeKind,
      "read-only",
      "json-schema-read-only-extracted",
      'This JSON Schema "readOnly" annotation was extracted into constraint IR.',
      input.readOnly,
      "readOnly",
    );
  }

  if (input.writeOnly !== undefined) {
    if (typeof input.writeOnly !== "boolean") {
      throwInvalidShape(
        'The "writeOnly" keyword must be a boolean.',
        path,
        nodeKind,
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      nodeKind,
      "write-only",
      "json-schema-write-only-extracted",
      'This JSON Schema "writeOnly" annotation was extracted into constraint IR.',
      input.writeOnly,
      "writeOnly",
    );
  }

  if (input.description !== undefined) {
    if (typeof input.description !== "string") {
      throwInvalidShape(
        'The "description" keyword must be a string.',
        path,
        nodeKind,
      );
    }

    pushExtractedConstraint(
      constraintEntries,
      semanticNotes,
      path,
      nodeKind,
      "description",
      "json-schema-description-extracted",
      'This JSON Schema "description" annotation was extracted into constraint IR.',
      input.description,
      "description",
    );
  }

  return node;
}

function extractPropertyCountConstraint(
  input: JsonSchemaObject,
  path: string[],
  sourceKeyword: "minProperties" | "maxProperties",
  kind: "min-properties" | "max-properties",
  code: string,
  message: string,
  constraintEntries: ConstraintEntry[],
  semanticNotes: SchemaSemanticNote[],
): void {
  const value = input[sourceKeyword];

  if (value === undefined) {
    return;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throwInvalidShape(
      `The "${sourceKeyword}" keyword must be a non-negative integer.`,
      path,
      "object",
    );
  }

  pushExtractedConstraint(
    constraintEntries,
    semanticNotes,
    path,
    "object",
    kind,
    code,
    message,
    value,
    sourceKeyword,
  );
}

function pushExtractedConstraint(
  constraintEntries: ConstraintEntry[],
  semanticNotes: SchemaSemanticNote[],
  path: string[],
  nodeKind: "type" | "array" | "tuple" | "object",
  kind: string,
  code: string,
  message: string,
  value: unknown,
  sourceKeyword: string,
): void {
  constraintEntries.push(
    constraintEntry(constraintTarget("node", path), [
      constraint(kind, {
        value,
        message: message.replace("extracted into", "preserved in"),
        evidence: {
          sourceKeyword,
        },
      }),
    ]),
  );

  semanticNotes.push(
    jsonSchemaSemanticNote({
      kind: "normalization",
      code,
      message,
      path,
      nodeKind,
      layer: "constraint",
      evidence: {
        sourceKeyword,
        value,
      },
    }),
  );
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
    | "array"
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
