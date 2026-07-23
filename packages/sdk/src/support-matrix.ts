import type {
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
} from "@aio/core";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";
import {
  resolveGeneratorCapabilities,
  resolveParserCapabilities,
} from "./registry.js";

export type ConsumerSurfaceFormat =
  ConversionSourceFormat | ConversionTargetFormat;

export interface ParserSupportSummary {
  producesIr: ParserCapabilities["producesIr"];
  capabilities: ConversionCapability[];
}

export interface GeneratorSupportSummary {
  consumesIr: GeneratorCapabilities["consumesIr"];
  capabilities: ConversionCapability[];
}

export interface FormatSupportSummary {
  format: ConsumerSurfaceFormat;
  parser?: ParserSupportSummary;
  generator?: GeneratorSupportSummary;
  sharedShapeKinds: string[];
  constraintFamilies: string[];
  notableLimitations: string[];
  experimentalAreas: string[];
}

const SHARED_SHAPE_KINDS = [
  "scalar",
  "literal",
  "object",
  "array",
  "tuple",
  "record",
  "union",
  "local-reference",
  "null",
  "optional-presence",
  "unknown",
] as const;

const CONSTRAINT_FAMILIES = [
  "string-constraints",
  "numeric-constraints",
  "collection-constraints",
  "object-constraints",
  "portable-annotations",
] as const;

const FORMAT_LIMITATIONS: Record<ConsumerSurfaceFormat, string[]> = {
  json: [
    "JSON inference is intentionally conservative and is not a universal schema inference engine.",
    "Mixed-type handling depends on parser inference options rather than one always-on widening rule.",
  ],
  "json-schema": [
    "JSON Schema support is limited to the current IR-aligned Draft 2020-12 subset.",
    "Validation-heavy and document-system features such as external references remain unsupported.",
    "Mixed fixed-field objects plus typed additionalProperties are not currently supported as one shared shape.",
  ],
  typescript: [
    "TypeScript support is limited to schema-oriented declarations rather than the full language.",
    "Single-file parsing is the current boundary, so imported or cross-file type resolution is unsupported.",
    "Function types, conditional types, mapped types, and intersection types are outside the current supported subset.",
    "TypeScript generation widens integer semantics to number and does not preserve constraint families directly.",
  ],
};

const FORMAT_EXPERIMENTAL_AREAS: Record<ConsumerSurfaceFormat, string[]> = {
  json: ["tuple-inference-modes", "record-inference-modes"],
  "json-schema": ["constraint-round-trip-through-shared-ir"],
  typescript: [
    "implicit-entry-selection",
    "enum-lowering-within-schema-subset",
  ],
};

export function describeFormatSupport(
  format: ConsumerSurfaceFormat,
): FormatSupportSummary {
  const parser = isSourceFormat(format)
    ? toParserSupportSummary(resolveParserCapabilities(format))
    : undefined;
  const generator = isTargetFormat(format)
    ? toGeneratorSupportSummary(resolveGeneratorCapabilities(format))
    : undefined;

  return {
    format,
    ...(parser ? { parser } : {}),
    ...(generator ? { generator } : {}),
    sharedShapeKinds: [...SHARED_SHAPE_KINDS],
    constraintFamilies: format === "json" ? [] : [...CONSTRAINT_FAMILIES],
    notableLimitations: [...FORMAT_LIMITATIONS[format]],
    experimentalAreas: [...FORMAT_EXPERIMENTAL_AREAS[format]],
  };
}

export function listFormatSupports(): FormatSupportSummary[] {
  const formats: ConsumerSurfaceFormat[] = [
    "json",
    "json-schema",
    "typescript",
  ];

  return formats.map(describeFormatSupport);
}

function toParserSupportSummary(
  parserCapabilities: ParserCapabilities,
): ParserSupportSummary {
  return {
    producesIr: [...parserCapabilities.producesIr],
    capabilities: [...parserCapabilities.capabilities],
  };
}

function toGeneratorSupportSummary(
  generatorCapabilities: GeneratorCapabilities,
): GeneratorSupportSummary {
  return {
    consumesIr: [...generatorCapabilities.consumesIr],
    capabilities: [...generatorCapabilities.supportsCapabilities],
  };
}

function isSourceFormat(
  format: ConsumerSurfaceFormat,
): format is ConversionSourceFormat {
  return (
    format === "json" || format === "json-schema" || format === "typescript"
  );
}

function isTargetFormat(
  format: ConsumerSurfaceFormat,
): format is ConversionTargetFormat {
  return format === "json-schema" || format === "typescript";
}
