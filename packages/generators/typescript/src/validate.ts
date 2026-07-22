import { walkSchemaDocument } from "@aio/core";
import type {
  IdentifierName,
  SchemaDiagnostic,
  SchemaDiagnosticNodeKind,
  SchemaDefinition,
  SchemaDocument,
  SchemaNode,
  SchemaObjectNode,
} from "@aio/core";
import type { ResolvedTypeScriptGeneratorOptions } from "./options.js";
import type { TypeScriptGenerateFailureResult } from "./failure.js";
import { TYPESCRIPT_RESERVED_WORDS } from "./naming.js";

export function validateRenderableDocument(
  doc: SchemaDocument,
  options: ResolvedTypeScriptGeneratorOptions,
): TypeScriptGenerateFailureResult | null {
  const renderedTypeName = renderTypeName(doc.name, options);

  if (!isValidTypeName(renderedTypeName)) {
    return createValidationFailure(
      "invalid-type-name",
      `The rendered type name "${renderedTypeName}" is not a valid TypeScript identifier.`,
      ["document"],
      "document",
      {
        renderedName: renderedTypeName,
        sourceName: doc.name.source,
      },
    );
  }

  const renderedTypeNameEntries = new Map<
    string,
    {
      sourceNames: string[];
      path: string[];
      nodeKind: "document" | "definition";
    }
  >();

  const rootDefinition = doc.definitions.find(
    (definition) => definition.name.source === doc.name.source,
  );
  const rootPath =
    rootDefinition === undefined
      ? ["document"]
      : ["definitions", rootDefinition.name.source];
  const rootNodeKind = rootDefinition === undefined ? "document" : "definition";

  registerRenderedTypeName(
    renderedTypeNameEntries,
    renderedTypeName,
    doc.name.source,
    rootPath,
    rootNodeKind,
  );

  for (const definition of doc.definitions) {
    const definitionNameFailure = validateRenderableDefinitionName(
      definition,
      options,
      ["definitions", definition.name.source],
    );

    if (definitionNameFailure !== null) {
      return definitionNameFailure;
    }

    const renderedDefinitionName = renderTypeName(definition.name, options);
    const duplicateRenderedNameFailure = registerRenderedTypeName(
      renderedTypeNameEntries,
      renderedDefinitionName,
      definition.name.source,
      ["definitions", definition.name.source],
      "definition",
    );

    if (duplicateRenderedNameFailure !== null) {
      return duplicateRenderedNameFailure;
    }
  }

  let failure: TypeScriptGenerateFailureResult | null = null;

  walkSchemaDocument(
    doc,
    {
      enter(context) {
        if (failure !== null) {
          return;
        }

        switch (context.node.kind) {
          case "scalar":
          case "literal":
          case "null":
          case "unknown":
          case "array":
          case "tuple":
          case "union":
            return;
          case "reference": {
            const definition = context.definitionLookup.get(context.node.name);

            if (definition === undefined) {
              failure = createValidationFailure(
                "invalid-reference-name",
                `The schema reference "${context.node.name}" does not match a renderable definition.`,
                context.path,
                "reference",
                {
                  referenceName: context.node.name,
                },
              );
              return;
            }

            const renderedReferenceName = renderTypeName(
              definition.name,
              options,
            );

            if (!isValidTypeName(renderedReferenceName)) {
              failure = createValidationFailure(
                "invalid-reference-name",
                `The rendered reference name "${renderedReferenceName}" for schema reference "${context.node.name}" is not a valid TypeScript identifier.`,
                context.path,
                "reference",
                {
                  referenceName: context.node.name,
                  renderedName: renderedReferenceName,
                },
              );
            }
            return;
          }
          case "record":
            if (!isRenderableRecordKeyNode(context.node.key)) {
              failure = createValidationFailure(
                "invalid-record-key",
                "TypeScript record keys must currently render from string scalar keys.",
                [...context.path, "key"],
                "record",
              );
            }
            return;
          case "object":
            failure = validateRenderableObjectType(
              context.node,
              options,
              context.path,
            );
            return;
        }
      },
    },
    { references: "preserve" },
  );

  return failure;
}

function registerRenderedTypeName(
  renderedTypeNameEntries: Map<
    string,
    {
      sourceNames: string[];
      path: string[];
      nodeKind: "document" | "definition";
    }
  >,
  renderedName: string,
  sourceName: string,
  path: string[],
  nodeKind: "document" | "definition",
): TypeScriptGenerateFailureResult | null {
  const existing = renderedTypeNameEntries.get(renderedName);

  if (existing === undefined) {
    renderedTypeNameEntries.set(renderedName, {
      sourceNames: [sourceName],
      path,
      nodeKind,
    });
    return null;
  }

  const sourceNames = Array.from(
    new Set([...existing.sourceNames, sourceName]),
  ).sort();

  return createValidationFailure(
    "duplicate-rendered-type-name",
    `The rendered type name "${renderedName}" is produced by multiple schema declarations and cannot be emitted safely.`,
    path,
    nodeKind,
    {
      renderedName,
      sourceNames,
    },
  );
}

function validateRenderableDefinitionName(
  definition: SchemaDefinition,
  options: ResolvedTypeScriptGeneratorOptions,
  path: string[],
): TypeScriptGenerateFailureResult | null {
  const renderedTypeName = renderTypeName(definition.name, options);

  if (!isValidTypeName(renderedTypeName)) {
    return createValidationFailure(
      "invalid-type-name",
      `The rendered type name "${renderedTypeName}" for schema definition "${definition.name.source}" is not a valid TypeScript identifier.`,
      path,
      "definition",
      {
        renderedName: renderedTypeName,
        sourceName: definition.name.source,
      },
    );
  }

  return null;
}

function validateRenderableObjectType(
  node: SchemaObjectNode,
  options: ResolvedTypeScriptGeneratorOptions,
  path: string[],
): TypeScriptGenerateFailureResult | null {
  const renderedFieldNameEntries = new Map<string, string[]>();

  for (const field of node.fields) {
    const renderedFieldName = renderFieldName(field.name, options);
    const fieldPath = [...path, field.name.source];

    if (!isValidFieldName(renderedFieldName)) {
      return createValidationFailure(
        "invalid-field-name",
        `The rendered field name "${renderedFieldName}" for source field "${field.name.source}" is not valid TypeScript property syntax.`,
        fieldPath,
        "field",
        {
          renderedName: renderedFieldName,
          sourceName: field.name.source,
        },
      );
    }

    const duplicateRenderedFieldNameFailure = registerRenderedFieldName(
      renderedFieldNameEntries,
      renderedFieldName,
      field.name.source,
      fieldPath,
    );

    if (duplicateRenderedFieldNameFailure !== null) {
      return duplicateRenderedFieldNameFailure;
    }
  }

  return null;
}

function registerRenderedFieldName(
  renderedFieldNameEntries: Map<string, string[]>,
  renderedName: string,
  sourceName: string,
  path: string[],
): TypeScriptGenerateFailureResult | null {
  const collisionKey = normalizeRenderedFieldCollisionKey(renderedName);
  const existing = renderedFieldNameEntries.get(collisionKey);

  if (existing === undefined) {
    renderedFieldNameEntries.set(collisionKey, [sourceName]);
    return null;
  }

  const sourceNames = Array.from(new Set([...existing, sourceName])).sort();

  return createValidationFailure(
    "duplicate-rendered-field-name",
    `The rendered field name "${collisionKey}" is produced by multiple schema fields and cannot be emitted safely.`,
    path,
    "field",
    {
      renderedName: collisionKey,
      sourceNames,
    },
  );
}

function normalizeRenderedFieldCollisionKey(renderedName: string): string {
  if (!isQuotedPropertyKey(renderedName)) {
    return renderedName;
  }

  try {
    const parsed = JSON.parse(renderedName);

    return typeof parsed === "string" ? parsed : renderedName;
  } catch {
    return renderedName;
  }
}

function createValidationFailure(
  code: TypeScriptGenerateFailureResult["code"],
  message: string,
  path: string[],
  nodeKind?: SchemaDiagnosticNodeKind,
  evidence?: Record<string, unknown>,
): TypeScriptGenerateFailureResult {
  const diagnostic: SchemaDiagnostic = {
    severity: "error",
    code,
    message,
    path,
    source: "generator-typescript",
  };

  if (nodeKind !== undefined) {
    diagnostic.nodeKind = nodeKind;
  }

  if (evidence !== undefined) {
    diagnostic.evidence = evidence;
  }

  return {
    ok: false,
    code,
    message,
    diagnostics: [diagnostic],
  };
}

function renderTypeName(
  name: IdentifierName,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return options.namingStrategy.renderTypeName(name);
}

function renderFieldName(
  name: IdentifierName,
  options: ResolvedTypeScriptGeneratorOptions,
): string {
  return options.namingStrategy.renderFieldName(name);
}

function isValidTypeName(value: string): boolean {
  return (
    isTypeScriptIdentifier(value) &&
    !(TYPESCRIPT_RESERVED_WORDS as readonly string[]).includes(value)
  );
}

function isValidFieldName(value: string): boolean {
  return isTypeScriptIdentifier(value) || isQuotedPropertyKey(value);
}

function isRenderableRecordKeyNode(node: SchemaNode): boolean {
  return node.kind === "scalar" && node.scalar === "string";
}

function isTypeScriptIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function isQuotedPropertyKey(value: string): boolean {
  return /^"(?:\\.|[^"\\])*"$/.test(value);
}
