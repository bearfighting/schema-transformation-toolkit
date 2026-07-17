import type {
  Constraint,
  SchemaArrayNode,
  SchemaDocument,
  SchemaNode,
  SchemaObjectNode,
  SchemaRecordNode,
  SchemaTupleNode,
  SchemaUnionNode,
} from "@aio/core";
import type {
  JsonSchemaOutput,
  ResolvedJsonSchemaGeneratorOptions,
} from "./options.js";

const DRAFT_2020_12_URI = "https://json-schema.org/draft/2020-12/schema";

export function renderJsonSchemaDocument(
  doc: SchemaDocument,
  options: ResolvedJsonSchemaGeneratorOptions,
): JsonSchemaOutput {
  const rootSchema = renderJsonSchemaNode(doc.root, options, ["root"]);
  const metadata: Record<string, unknown> = {
    title: doc.name.source,
  };

  if (options.includeSchemaUri) {
    metadata.$schema = DRAFT_2020_12_URI;
  }

  if (options.includeId) {
    metadata.$id = doc.name.source;
  }

  if (doc.definitions.length > 0) {
    metadata.$defs = Object.fromEntries(
      doc.definitions.map((definition) => [
        definition.name.source,
        renderJsonSchemaNode(definition.type, options, [
          "definitions",
          definition.name.source,
        ]),
      ]),
    );
  }

  if (typeof rootSchema === "boolean") {
    if (rootSchema) {
      return metadata;
    }

    return {
      ...metadata,
      allOf: [rootSchema],
    };
  }

  return {
    ...metadata,
    ...rootSchema,
  };
}

function renderJsonSchemaNode(
  node: SchemaNode,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  const rendered = renderJsonSchemaNodeBase(node, options, path);

  return decorateRenderedSchema(rendered, options, path);
}

function renderJsonSchemaNodeBase(
  node: SchemaNode,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  switch (node.kind) {
    case "scalar":
      return renderScalarNode(node.scalar);
    case "literal":
      return { const: node.value };
    case "null":
      return { type: "null" };
    case "unknown":
      return true;
    case "reference":
      return { $ref: `#/$defs/${node.name}` };
    case "array":
      return renderArrayNode(node, options, path);
    case "tuple":
      return renderTupleNode(node, options, path);
    case "record":
      return renderRecordNode(node, options, path);
    case "union":
      return renderUnionNode(node, options, path);
    case "object":
      return renderObjectNode(node, options, path);
  }
}

function renderScalarNode(
  scalar: "string" | "integer" | "number" | "boolean",
): JsonSchemaOutput {
  return { type: scalar };
}

function renderArrayNode(
  node: SchemaArrayNode,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  return {
    type: "array",
    items: renderJsonSchemaNode(node.elementType, options, [
      ...path,
      "elementType",
    ]),
  };
}

function renderTupleNode(
  node: SchemaTupleNode,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  return {
    type: "array",
    prefixItems: node.elements.map((element) =>
      renderJsonSchemaNode(element.type, options, path),
    ),
    minItems: node.elements.filter((element) => element.required).length,
    items: false,
  };
}

function renderRecordNode(
  node: SchemaRecordNode,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  return {
    type: "object",
    additionalProperties: renderJsonSchemaNode(node.value, options, [
      ...path,
      "value",
    ]),
  };
}

function renderUnionNode(
  node: SchemaUnionNode,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  return {
    [options.unionComposition]: node.members.map((member) =>
      renderJsonSchemaNode(member, options, path),
    ),
  };
}

function renderObjectNode(
  node: SchemaObjectNode,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  const properties = Object.fromEntries(
    node.fields.map((field) => [
      field.name.source,
      renderFieldSchema(field.type, field.nullable, options, [
        ...path,
        field.name.source,
      ]),
    ]),
  );
  const required = node.fields
    .filter((field) => field.required)
    .map((field) => field.name.source);
  const closedByConstraint = hasConstraint(options, path, "closed-object");

  return {
    type: "object",
    properties,
    ...(options.objectAdditionalPropertiesMode === "false" || closedByConstraint
      ? { additionalProperties: false }
      : {}),
    ...(required.length > 0 ? { required } : {}),
  };
}

function renderFieldSchema(
  node: SchemaNode,
  nullable: boolean,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  const rendered = renderJsonSchemaNode(node, options, path);

  if (!nullable) {
    return rendered;
  }

  const compactNullable = tryRenderCompactNullableSchema(rendered);

  if (compactNullable !== null) {
    return compactNullable;
  }

  return {
    oneOf: [rendered, { type: "null" }],
  };
}

function tryRenderCompactNullableSchema(
  rendered: JsonSchemaOutput,
): JsonSchemaOutput | null {
  if (typeof rendered === "boolean") {
    return null;
  }

  const keys = Object.keys(rendered);

  if (keys.length !== 1 || rendered.type === undefined) {
    return null;
  }

  if (typeof rendered.type !== "string" || rendered.type === "null") {
    return null;
  }

  return {
    type: [rendered.type, "null"],
  };
}

function decorateRenderedSchema(
  rendered: JsonSchemaOutput,
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): JsonSchemaOutput {
  if (typeof rendered === "boolean") {
    return rendered;
  }

  const format = getConstraintValue(options, path, "format");
  const defaultValue = getConstraintValue(options, path, "default");
  const examples = getConstraintValue(options, path, "examples");
  const readOnly = getConstraintValue(options, path, "read-only");
  const writeOnly = getConstraintValue(options, path, "write-only");
  const description = getConstraintValue(options, path, "description");
  const pattern = getConstraintValue(options, path, "pattern");
  const minLength = getConstraintValue(options, path, "min-length");
  const maxLength = getConstraintValue(options, path, "max-length");
  const minimum = getConstraintValue(options, path, "minimum");
  const exclusiveMinimum = getConstraintValue(
    options,
    path,
    "exclusive-minimum",
  );
  const multipleOf = getConstraintValue(options, path, "multiple-of");
  const maximum = getConstraintValue(options, path, "maximum");
  const exclusiveMaximum = getConstraintValue(
    options,
    path,
    "exclusive-maximum",
  );
  const minItems = getConstraintValue(options, path, "min-items");
  const maxItems = getConstraintValue(options, path, "max-items");
  const uniqueItems = getConstraintValue(options, path, "unique-items");
  const minProperties = getConstraintValue(options, path, "min-properties");
  const maxProperties = getConstraintValue(options, path, "max-properties");

  return {
    ...rendered,
    ...(typeof format === "string" ? { format } : {}),
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    ...(Array.isArray(examples) ? { examples } : {}),
    ...(typeof readOnly === "boolean" ? { readOnly } : {}),
    ...(typeof writeOnly === "boolean" ? { writeOnly } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof pattern === "string" ? { pattern } : {}),
    ...(typeof minLength === "number" ? { minLength } : {}),
    ...(typeof maxLength === "number" ? { maxLength } : {}),
    ...(typeof minimum === "number" ? { minimum } : {}),
    ...(typeof exclusiveMinimum === "number" ? { exclusiveMinimum } : {}),
    ...(typeof multipleOf === "number" ? { multipleOf } : {}),
    ...(typeof maximum === "number" ? { maximum } : {}),
    ...(typeof exclusiveMaximum === "number" ? { exclusiveMaximum } : {}),
    ...(typeof minItems === "number" ? { minItems } : {}),
    ...(typeof maxItems === "number" ? { maxItems } : {}),
    ...(typeof uniqueItems === "boolean" ? { uniqueItems } : {}),
    ...(typeof minProperties === "number" ? { minProperties } : {}),
    ...(typeof maxProperties === "number" ? { maxProperties } : {}),
  };
}

function hasConstraint(
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
  kind: string,
): boolean {
  return getConstraintsAtPath(options, path).some(
    (constraint) => constraint.kind === kind,
  );
}

function getConstraintValue(
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
  kind: string,
): unknown {
  return getConstraintsAtPath(options, path).find(
    (constraint) => constraint.kind === kind,
  )?.value;
}

function getConstraintsAtPath(
  options: ResolvedJsonSchemaGeneratorOptions,
  path: string[],
): Constraint[] {
  return (options.constraints?.entries ?? [])
    .filter(
      (entry) =>
        entry.target.kind === "node" && arePathsEqual(entry.target.path, path),
    )
    .flatMap((entry) => entry.constraints);
}

function arePathsEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((segment, index) => segment === right[index])
  );
}
