import { describe, expect, it } from "vitest";
import {
  ConversionRouteError,
  defaultConversionRegistry,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  resolveConversionRouteDecision,
  routeStages,
  routeUsesIr,
} from "../../packages/sdk/src/registry.js";
import { BUILTIN_FORMAT_CATALOG } from "../../packages/sdk/src/builtin-formats.js";
import type { ConversionRegistry } from "../../packages/sdk/src/types.js";

describe("sdk registry", () => {
  it("lists every supported source and target combination", () => {
    const expectedRoutes = [
      planConversion("json", "json"),
      planConversion("json", "csv"),
      planConversion("json", "toml"),
      planConversion("json", "json-schema"),
      planConversion("json", "typescript"),
      planConversion("json", "zod"),
      planConversion("json", "yaml"),
      planConversion("json", "openapi"),
      planConversion("json", "rust"),
      planConversion("csv", "json"),
      planConversion("csv", "csv"),
      planConversion("csv", "json-schema"),
      planConversion("csv", "typescript"),
      planConversion("csv", "zod"),
      planConversion("csv", "yaml"),
      planConversion("csv", "openapi"),
      planConversion("csv", "rust"),
      planConversion("toml", "json"),
      planConversion("toml", "toml"),
      planConversion("toml", "json-schema"),
      planConversion("toml", "typescript"),
      planConversion("toml", "zod"),
      planConversion("toml", "yaml"),
      planConversion("toml", "openapi"),
      planConversion("toml", "rust"),
      planConversion("json-schema", "json-schema"),
      planConversion("json-schema", "typescript"),
      planConversion("json-schema", "zod"),
      planConversion("json-schema", "openapi"),
      planConversion("json-schema", "rust"),
      planConversion("typescript", "json-schema"),
      planConversion("typescript", "typescript"),
      planConversion("typescript", "zod"),
      planConversion("typescript", "openapi"),
      planConversion("typescript", "rust"),
      planConversion("openapi", "json-schema"),
      planConversion("openapi", "typescript"),
      planConversion("openapi", "zod"),
      planConversion("openapi", "openapi"),
      planConversion("openapi", "rust"),
      planConversion("zod", "json-schema"),
      planConversion("zod", "typescript"),
      planConversion("zod", "zod"),
      planConversion("zod", "openapi"),
      planConversion("zod", "rust"),
      planConversion("rust", "json-schema"),
      planConversion("rust", "openapi"),
      planConversion("rust", "rust"),
      planConversion("rust", "typescript"),
      planConversion("rust", "zod"),
      planConversion("yaml", "json"),
      planConversion("yaml", "csv"),
      planConversion("yaml", "toml"),
      planConversion("yaml", "json-schema"),
      planConversion("yaml", "typescript"),
      planConversion("yaml", "zod"),
      planConversion("yaml", "yaml"),
      planConversion("yaml", "openapi"),
      planConversion("yaml", "rust"),
    ];
    for (const source of [
      "json",
      "csv",
      "toml",
      "json-schema",
      "typescript",
      "openapi",
      "zod",
      "rust",
      "yaml",
    ]) {
      expectedRoutes.push(planConversion(source, "python"));
      expectedRoutes.push(planConversion(source, "go"));
    }
    for (const target of [
      "go",
      "json-schema",
      "openapi",
      "python",
      "rust",
      "typescript",
      "zod",
    ]) {
      expectedRoutes.push(planConversion("python", target));
    }
    for (const target of [
      "go",
      "json-schema",
      "openapi",
      "python",
      "rust",
      "typescript",
      "zod",
    ]) {
      expectedRoutes.push(planConversion("go", target));
    }
    for (const source of [
      "json",
      "csv",
      "toml",
      "json-schema",
      "typescript",
      "openapi",
      "zod",
      "rust",
      "yaml",
      "python",
      "go",
    ]) {
      expectedRoutes.push(planConversion(source, "java"));
    }
    for (const target of [
      "java",
      "go",
      "json-schema",
      "openapi",
      "python",
      "rust",
      "typescript",
      "zod",
    ]) {
      expectedRoutes.push(planConversion("java", target));
    }
    for (const source of [
      "csv",
      "go",
      "java",
      "json",
      "json-schema",
      "openapi",
      "python",
      "rust",
      "toml",
      "typescript",
      "yaml",
      "zod",
    ]) {
      expectedRoutes.push(planConversion(source, "kotlin"));
    }
    for (const target of [
      "go",
      "java",
      "json-schema",
      "kotlin",
      "openapi",
      "python",
      "rust",
      "typescript",
      "zod",
    ]) {
      expectedRoutes.push(planConversion("kotlin", target));
    }
    for (const source of [
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
    ]) {
      expectedRoutes.push(planConversion(source, "csharp"));
    }
    for (const target of [
      "csharp",
      "go",
      "java",
      "json-schema",
      "kotlin",
      "openapi",
      "python",
      "rust",
      "typescript",
      "zod",
    ]) {
      expectedRoutes.push(planConversion("csharp", target));
    }
    expect(listConversionRoutes()).toEqual(expectedRoutes.sort(compareRoutes));
  });

  it("derives root-shape incompatibility without format-pair rules", () => {
    expect(() => planConversion("csv", "toml")).toThrow(
      /Unsupported conversion route/,
    );
    expect(() => planConversion("toml", "csv")).toThrow(
      /Unsupported conversion route/,
    );
    expect(() => planConversion("json", "toml")).not.toThrow();
  });

  it("tracks IR usage and stage exposure from planned routes", () => {
    const route = planConversion("json", "json-schema");

    expect(routeUsesIr(route, "value")).toBe(true);
    expect(routeUsesIr(route, "constraint")).toBe(false);
    expect(routeStages(route)).toEqual(route.stages);
  });

  it("plans a Value IR-only json to json route", () => {
    expect(planConversion("json", "json")).toEqual({
      sourceFormat: "json",
      targetFormat: "json",
      irSequence: ["value"],
      stages: [
        { kind: "parse-source", from: "json", to: "json-value", ir: "value" },
        {
          kind: "lower-to-value",
          from: "json-value",
          to: "value",
          ir: "value",
        },
        { kind: "generate-target", from: "value", to: "json", ir: "value" },
      ],
    });
  });

  it("returns the same route decision consumed by conversion", () => {
    expect(resolveConversionRouteDecision("json", "json")).toMatchObject({
      selectedIr: "value",
      requestedIr: "auto",
      fallback: false,
      requiresShapeInference: false,
      requiresConstraintInference: false,
      generatorInputIr: "value",
      route: { irSequence: ["value"] },
    });

    expect(
      resolveConversionRouteDecision("json-schema", "json-schema"),
    ).toMatchObject({
      selectedIr: "shape",
      fallback: true,
      requiresShapeInference: false,
      requiresConstraintInference: false,
      generatorInputIr: "shape",
      route: { irSequence: ["shape", "constraint"] },
    });
  });

  it("honors explicit IR preferences when planning routes", () => {
    expect(planConversion("json", "json", "value").irSequence).toEqual([
      "value",
    ]);
    expect(planConversion("json", "typescript", "shape").irSequence).toEqual([
      "value",
      "shape",
    ]);
    expect(() => planConversion("json", "json", "shape")).toThrow(
      'IR preference "shape"',
    );
    expect(() => planConversion("json", "typescript", "value")).toThrow(
      'IR preference "value"',
    );
  });

  it("keeps unsupported routes distinct from unavailable preferences", () => {
    expect(() => planConversion("json", "json", "shape")).toThrow(
      expect.objectContaining<Partial<ConversionRouteError>>({
        code: "unsupported-ir-preference",
      }),
    );
    expect(() => planConversion("missing", "json", "value")).toThrow(
      expect.objectContaining<Partial<ConversionRouteError>>({
        code: "unsupported-route",
      }),
    );
    expect(() => planConversion("csv", "toml")).toThrow(
      expect.objectContaining<Partial<ConversionRouteError>>({
        code: "unsupported-route",
      }),
    );
    expect(() => planConversion("toml", "csv")).toThrow(
      expect.objectContaining<Partial<ConversionRouteError>>({
        code: "unsupported-route",
      }),
    );
  });

  it("keeps the builtin catalog aligned with registered descriptors", () => {
    const parserFormats = new Set(
      defaultConversionRegistry
        .listParsers()
        .map((descriptor) => descriptor.format),
    );
    const generatorFormats = new Set(
      defaultConversionRegistry
        .listGenerators()
        .map((descriptor) => descriptor.format),
    );

    for (const [format, roles] of Object.entries(BUILTIN_FORMAT_CATALOG)) {
      expect(parserFormats.has(format)).toBe(roles.source);
      expect(generatorFormats.has(format)).toBe(roles.target);
    }
  });

  it("supports legacy registries without direct descriptor lookup", () => {
    const legacyRegistry: ConversionRegistry = {
      registerParser: () => undefined,
      registerGenerator: () => undefined,
      listParsers: () => defaultConversionRegistry.listParsers(),
      listGenerators: () => defaultConversionRegistry.listGenerators(),
    };

    expect(planConversion("json", "json", legacyRegistry).irSequence).toEqual([
      "value",
    ]);
  });

  it("reports constraint support only when both parser and generator declare it", () => {
    expect(planConversion("json-schema", "json-schema").irSequence).toEqual([
      "shape",
      "constraint",
    ]);

    expect(
      describeConversionRouteCapabilities("json-schema", "json-schema"),
    ).toMatchObject({
      supportsShapeIr: true,
      supportsValueIr: false,
      supportsConstraintIr: true,
      preservedCapabilities: [
        "shape-ir",
        "constraint-ir",
        "string-constraints",
        "numeric-constraints",
        "collection-constraints",
        "object-constraints",
        "portable-annotations",
      ],
    });

    expect(
      describeConversionRouteCapabilities("json-schema", "typescript"),
    ).toMatchObject({
      supportsValueIr: false,
      supportsShapeIr: true,
      supportsConstraintIr: false,
      preservedCapabilities: ["shape-ir"],
    });
  });
});

function compareRoutes(
  left: ReturnType<typeof planConversion>,
  right: ReturnType<typeof planConversion>,
): number {
  return (
    left.sourceFormat.localeCompare(right.sourceFormat) ||
    left.targetFormat.localeCompare(right.targetFormat) ||
    left.irSequence.join("\0").localeCompare(right.irSequence.join("\0")) ||
    JSON.stringify(left.stages).localeCompare(JSON.stringify(right.stages))
  );
}
