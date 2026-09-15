import { describe, expect, it } from "vitest";
import {
  describeConversionRouteCapabilities,
  describeFormatSupport,
  listConversionRoutes,
  listFormatSupports,
  listSourceFormatSupports,
  listTargetFormatSupports,
  planConversion,
} from "../../packages/sdk/src/index.js";

describe("sdk support matrix", () => {
  it("describes OpenAPI as a shape and constraint source", () => {
    expect(describeFormatSupport("openapi")).toMatchObject({
      format: "openapi",
      parser: {
        producesIr: ["shape", "constraint"],
        capabilities: expect.arrayContaining([
          "shape-ir",
          "constraint-ir",
          "string-constraints",
          "numeric-constraints",
          "collection-constraints",
          "object-constraints",
        ]),
      },
      notableLimitations: [
        "OpenAPI support is currently limited to extracting schemas from components.schemas rather than processing the full API document.",
        "OpenAPI generation emits only a canonical 3.1 schema document and does not recreate source metadata or API operations.",
        "Paths, operations, request and response bodies, parameters, headers, security, callbacks, and webhooks are outside the current parser boundary.",
        "Only local references to components.schemas are supported; external and URL-based references are unsupported.",
        "Object-only allOf compositions can be merged into shared IR; conflicting or non-object compositions remain unsupported.",
      ],
      experimentalAreas: ["full-document-processing", "allOf-composition"],
    });
  });

  it("describes json as a Value IR source and target surface", () => {
    expect(describeFormatSupport("json")).toEqual({
      format: "json",
      parser: {
        producesIr: ["value", "shape"],
        capabilities: ["value-ir", "shape-ir"],
      },
      generator: {
        consumesIr: ["value"],
        entryIr: ["value"],
        overlays: [],
        capabilities: ["value-ir"],
      },
      sharedShapeKinds: [
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
      ],
      constraintFamilies: [],
      notableLimitations: [
        "JSON inference is intentionally conservative and is not a universal schema inference engine.",
        "Mixed-type handling depends on parser inference options rather than one always-on widening rule.",
      ],
      experimentalAreas: ["tuple-inference-modes", "record-inference-modes"],
    });
  });

  it("describes YAML without constraint capabilities", () => {
    expect(describeFormatSupport("yaml")).toMatchObject({
      format: "yaml",
      parser: {
        producesIr: ["value", "shape"],
        capabilities: ["value-ir", "shape-ir"],
      },
      generator: {
        consumesIr: ["value"],
        entryIr: ["value"],
        overlays: [],
        capabilities: ["value-ir"],
      },
      constraintFamilies: [],
    });
  });

  it("describes json-schema as both a source and target surface", () => {
    expect(describeFormatSupport("json-schema")).toEqual({
      format: "json-schema",
      parser: {
        producesIr: ["shape", "constraint"],
        capabilities: [
          "shape-ir",
          "constraint-ir",
          "string-constraints",
          "numeric-constraints",
          "collection-constraints",
          "object-constraints",
          "portable-annotations",
        ],
      },
      generator: {
        consumesIr: ["shape", "constraint"],
        entryIr: ["shape"],
        overlays: ["constraint"],
        capabilities: [
          "shape-ir",
          "constraint-ir",
          "string-constraints",
          "numeric-constraints",
          "collection-constraints",
          "object-constraints",
          "portable-annotations",
        ],
      },
      sharedShapeKinds: [
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
      ],
      constraintFamilies: [
        "string-constraints",
        "numeric-constraints",
        "collection-constraints",
        "object-constraints",
        "portable-annotations",
      ],
      notableLimitations: [
        "JSON Schema support is limited to the current IR-aligned Draft 2020-12 subset.",
        "Validation-heavy and document-system features such as external references remain unsupported.",
        "Object-only allOf can be merged; references, non-object compositions, not, and conditional schemas remain outside the current JSON Schema parser subset.",
      ],
      experimentalAreas: ["constraint-round-trip-through-shared-ir"],
    });
  });

  it("describes typescript as both a source and target surface", () => {
    expect(describeFormatSupport("typescript")).toEqual({
      format: "typescript",
      parser: {
        producesIr: ["shape"],
        capabilities: ["shape-ir"],
      },
      generator: {
        consumesIr: ["shape"],
        entryIr: ["shape"],
        overlays: [],
        capabilities: ["shape-ir"],
      },
      sharedShapeKinds: [
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
      ],
      constraintFamilies: [
        "string-constraints",
        "numeric-constraints",
        "collection-constraints",
        "object-constraints",
        "portable-annotations",
      ],
      notableLimitations: [
        "TypeScript support is limited to schema-oriented declarations rather than the full language.",
        "Single-file parsing is the current boundary, so imported or cross-file type resolution is unsupported.",
        "Function types, conditional types, mapped types, and intersection types are outside the current supported subset.",
        "TypeScript generation widens integer semantics to number and does not preserve constraint families directly.",
      ],
      experimentalAreas: [
        "implicit-entry-selection",
        "enum-lowering-within-schema-subset",
      ],
    });
  });

  it("does not advertise constraint families for Java", () => {
    expect(describeFormatSupport("java")).toMatchObject({
      parser: { producesIr: ["shape"], capabilities: ["shape-ir"] },
      generator: { consumesIr: ["shape"], capabilities: ["shape-ir"] },
      constraintFamilies: [],
    });
  });

  it("lists all current format supports", () => {
    expect(listFormatSupports().map((summary) => summary.format)).toEqual([
      "csharp",
      "csv",
      "go",
      "java",
      "json",
      "json-schema",
      "kotlin",
      "openapi",
      "python",
      "rust",
      "toml",
      "typescript",
      "yaml",
      "zod",
    ]);
  });

  it("keeps generator-only formats out of source format discovery", () => {
    expect(listSourceFormatSupports().map((summary) => summary.format)).toEqual(
      [
        "csharp",
        "csv",
        "go",
        "java",
        "json",
        "json-schema",
        "kotlin",
        "openapi",
        "python",
        "rust",
        "toml",
        "typescript",
        "yaml",
        "zod",
      ],
    );
    expect(listSourceFormatSupports().every((summary) => summary.parser)).toBe(
      true,
    );
    expect(listTargetFormatSupports().map((summary) => summary.format)).toEqual(
      [
        "csharp",
        "csv",
        "go",
        "java",
        "json",
        "json-schema",
        "kotlin",
        "openapi",
        "python",
        "rust",
        "toml",
        "typescript",
        "yaml",
        "zod",
      ],
    );
  });

  it("exposes the stable consumer-facing summary fields for format pickers and route copy", () => {
    const summary = describeFormatSupport("typescript");

    expect(summary).toMatchObject({
      format: "typescript",
      parser: {
        producesIr: ["shape"],
        capabilities: ["shape-ir"],
      },
      generator: {
        consumesIr: ["shape"],
        entryIr: ["shape"],
        overlays: [],
        capabilities: ["shape-ir"],
      },
    });
    expect(summary.sharedShapeKinds.length).toBeGreaterThan(0);
    expect(summary.constraintFamilies.length).toBeGreaterThan(0);
    expect(summary.notableLimitations.length).toBeGreaterThan(0);
    expect(summary.experimentalAreas.length).toBeGreaterThan(0);
  });

  it("exposes stable route-discovery surfaces for downstream consumers", () => {
    expect(listConversionRoutes()).toHaveLength(154);
    expect(planConversion("json-schema", "typescript")).toMatchObject({
      sourceFormat: "json-schema",
      targetFormat: "typescript",
      irSequence: ["shape"],
    });
    expect(
      describeConversionRouteCapabilities("json-schema", "typescript"),
    ).toMatchObject({
      supportsShapeIr: true,
      parserCapabilities: expect.arrayContaining(["shape-ir"]),
      generatorCapabilities: expect.arrayContaining(["shape-ir"]),
      preservedCapabilities: expect.arrayContaining(["shape-ir"]),
    });
  });
});
