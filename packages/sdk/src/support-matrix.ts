import type {
  ConversionCapability,
  GeneratorCapabilities,
  ParserCapabilities,
} from "@schema-transformation-toolkit/core";
import type { ConversionFormat, ConversionRegistry } from "./types.js";
import { defaultConversionRegistry } from "./registry.js";

export type ConsumerSurfaceFormat = ConversionFormat;

export interface ParserSupportSummary {
  producesIr: ParserCapabilities["producesIr"];
  capabilities: ConversionCapability[];
}

export interface GeneratorSupportSummary {
  consumesIr: GeneratorCapabilities["consumesIr"];
  entryIr: NonNullable<GeneratorCapabilities["entryIr"]>;
  overlays: NonNullable<GeneratorCapabilities["overlays"]>;
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

const FORMAT_LIMITATIONS: Record<string, string[]> = {
  json: [
    "JSON inference is intentionally conservative and is not a universal schema inference engine.",
    "Mixed-type handling depends on parser inference options rather than one always-on widening rule.",
  ],
  "json-schema": [
    "JSON Schema support is limited to the current IR-aligned Draft 2020-12 subset.",
    "Validation-heavy and document-system features such as external references remain unsupported.",
    "Object-only allOf can be merged; references, non-object compositions, not, and conditional schemas remain outside the current JSON Schema parser subset.",
  ],
  typescript: [
    "TypeScript support is limited to schema-oriented declarations rather than the full language.",
    "Single-file parsing is the current boundary, so imported or cross-file type resolution is unsupported.",
    "Function types, conditional types, mapped types, and intersection types are outside the current supported subset.",
    "TypeScript generation widens integer semantics to number and does not preserve constraint families directly.",
  ],
  openapi: [
    "OpenAPI support is currently limited to extracting schemas from components.schemas rather than processing the full API document.",
    "OpenAPI generation emits only a canonical 3.1 schema document and does not recreate source metadata or API operations.",
    "Paths, operations, request and response bodies, parameters, headers, security, callbacks, and webhooks are outside the current parser boundary.",
    "Only local references to components.schemas are supported; external and URL-based references are unsupported.",
    "Object-only allOf compositions can be merged into shared IR; conflicting or non-object compositions remain unsupported.",
  ],
  zod: [
    "Zod source parsing is limited to statically analyzable Zod 4 schema expressions in a single source module.",
    "Static z.enum string arrays lower to shared literal unions; dynamic enum sources and nativeEnum remain unsupported.",
    "Portable metadata is limited to static describe and default values; arbitrary meta objects remain unsupported.",
    "Zod defaults preserve post-default required output shape and report input-presence caveats.",
    "Dynamic schema factories, refine/transform effects, extend/merge, and unsupported runtime validators are rejected.",
    "Zod output targets Zod 4 and assumes the consuming project installs zod.",
    "JavaScript output provides runtime schemas only; TypeScript output additionally emits z.infer types.",
    "Object openness without explicit IR evidence uses a strict-object target policy and reports a policy note.",
  ],
  yaml: [
    "YAML support is limited to a strict JSON-compatible single-document profile.",
    "Comments, formatting style, anchors, aliases, merge keys, custom tags, and non-string mapping keys are not supported or preserved.",
    "YAML generation consumes Value IR only; schema-only sources cannot generate a concrete YAML value.",
  ],
  csv: [
    "CSV support is limited to one header row and flat object rows with consistent columns.",
    "CSV cells are parsed as strings; automatic type inference, null tokens, nested values, and multiple tables are unsupported.",
    "CSV generation consumes Value IR only; empty arrays require explicit columns.",
  ],
  toml: [
    "TOML support is limited to values representable by the shared Value IR and the TOML v1 profile.",
    "TOML date/time values, non-finite numbers, and unsafe integers are unsupported rather than converted to strings.",
    "TOML generation consumes object-root Value IR only; schema-only sources cannot generate TOML.",
  ],
  rust: [
    "Rust support is limited to serializable data-model syntax rather than the full Rust language.",
    "Data-carrying enums, Serde attributes, tuples, aliases, and generics remain unsupported.",
    "Map containers are normalized to string-keyed records and Rust generation uses HashMap.",
  ],
  python: [
    "Python support is limited to modern dataclass type annotations and does not execute Python.",
    "Defaults, field(...), inheritance, user-defined generics, quoted forward references, and serialization behavior remain unsupported.",
    "String-keyed dict[str, T] fields and restricted map aliases are supported; typing.Dict and non-string keys remain unsupported.",
    "Constraint IR is not rendered as runtime validation; unsupported constraints are reported as semantic loss.",
  ],
  go: [
    "Go support is limited to single-file serializable data-model declarations rather than the full Go language.",
    "Imports, cross-file resolution, functions, methods, interfaces, generics, and embedded-field promotion remain unsupported.",
    "Go aliases are rejected because the shared IR preserves named types but not alias identity.",
    "Pointers are interpreted as nullable values and omitempty as optional field presence.",
    "Fixed-size arrays are widened to variable-length arrays with semantic loss.",
    "Constraint annotations are not emitted as Go runtime validation and are reported as semantic loss.",
  ],
  java: [
    "Java support is limited to single-file records, restricted structural classes, and unit-only enums rather than the full Java language.",
    "Exactly one public root record, class, or unit-only enum is required; additional declarations are package-private definitions.",
    "Structural classes contain only instance fields; interfaces, generic declarations, wildcards, annotations, data-carrying enums, JavaBeans, and non-string Map keys remain unsupported.",
    "Reference types are conservatively interpreted as nullable because Java declarations do not establish non-nullability.",
  ],
  kotlin: [
    "Kotlin support is limited to data classes, unit-only enums, and schema-facing List, Map<String, T>, and Set containers.",
    "User-defined generics, ordinary class parsing, mutable or concrete collection implementations, defaults, annotations, inheritance, and sealed hierarchies remain unsupported.",
    "Set is represented as an array with a unique-items constraint and may be generated as List when that constraint is unavailable.",
  ],
};

const FORMAT_EXPERIMENTAL_AREAS: Record<string, string[]> = {
  json: ["tuple-inference-modes", "record-inference-modes"],
  "json-schema": ["constraint-round-trip-through-shared-ir"],
  typescript: [
    "implicit-entry-selection",
    "enum-lowering-within-schema-subset",
  ],
  openapi: ["full-document-processing", "allOf-composition"],
  zod: ["javascript-output", "constraint-refinement-rendering"],
  yaml: ["broader YAML data-model support", "comment-and-style preservation"],
  csv: [
    "delimiter options",
    "headerless input",
    "explicit cell type inference",
  ],
  toml: ["date/time conversion", "broader TOML 1.1 features"],
  rust: [
    "data-carrying enums",
    "Serde representation semantics",
    "generic types",
  ],
  python: ["Literal and Enum"],
  go: [
    "typed const enums",
    "package and cross-file resolution",
    "generic types",
  ],
  java: [
    "Set<T>",
    "Jackson metadata",
    "Bean Validation",
    "generic types",
    "JavaBeans",
    "getter/setter inference",
  ],
  kotlin: [
    "sealed hierarchies",
    "serialization annotations",
    "custom generic declarations",
  ],
};

export function describeFormatSupport(
  format: ConsumerSurfaceFormat,
  registry: ConversionRegistry = defaultConversionRegistry,
): FormatSupportSummary {
  const parser = findParser(format, registry);
  const generator = findGenerator(format, registry);
  return {
    format,
    ...(parser ? { parser: toParserSupportSummary(parser.capabilities) } : {}),
    ...(generator
      ? { generator: toGeneratorSupportSummary(generator.capabilities) }
      : {}),
    sharedShapeKinds: [...SHARED_SHAPE_KINDS],
    constraintFamilies:
      format === "json" ||
      format === "yaml" ||
      format === "csv" ||
      format === "toml" ||
      format === "java"
        ? []
        : [...CONSTRAINT_FAMILIES],
    notableLimitations: [...(FORMAT_LIMITATIONS[format] ?? [])],
    experimentalAreas: [...(FORMAT_EXPERIMENTAL_AREAS[format] ?? [])],
  };
}

export function listFormatSupports(
  registry: ConversionRegistry = defaultConversionRegistry,
): FormatSupportSummary[] {
  const formats = new Set<string>();
  for (const descriptor of registry.listParsers())
    formats.add(descriptor.format);
  for (const descriptor of registry.listGenerators())
    formats.add(descriptor.format);
  return [...formats]
    .sort((left, right) => left.localeCompare(right))
    .map((format) => describeFormatSupport(format, registry));
}

/** Lists formats that can be selected as conversion sources. */
export function listSourceFormatSupports(
  registry: ConversionRegistry = defaultConversionRegistry,
): FormatSupportSummary[] {
  return listFormatSupports(registry).filter((summary) => summary.parser);
}

/** Lists formats that can be selected as conversion targets. */
export function listTargetFormatSupports(
  registry: ConversionRegistry = defaultConversionRegistry,
): FormatSupportSummary[] {
  return listFormatSupports(registry).filter((summary) => summary.generator);
}

function findParser(format: string, registry: ConversionRegistry) {
  return registry
    .listParsers()
    .find((descriptor) => descriptor.format === format);
}

function findGenerator(format: string, registry: ConversionRegistry) {
  return registry
    .listGenerators()
    .find((descriptor) => descriptor.format === format);
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
    entryIr: [
      ...(generatorCapabilities.entryIr ??
        generatorCapabilities.consumesIr.filter(
          (ir): ir is "value" | "shape" => ir !== "constraint",
        )),
    ],
    overlays: [
      ...(generatorCapabilities.overlays ??
        generatorCapabilities.consumesIr.filter(
          (ir): ir is "constraint" => ir === "constraint",
        )),
    ],
    capabilities: [...generatorCapabilities.supportsCapabilities],
  };
}
