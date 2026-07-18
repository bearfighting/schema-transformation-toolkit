import { describe, expect, it } from "vitest";
import {
  describeConversionRouteCapabilities,
  listConversionRoutes,
  planConversion,
  routeStages,
  routeUsesIr,
} from "../../packages/sdk/src/registry.js";

describe("sdk registry", () => {
  it("lists every supported source and target combination", () => {
    expect(listConversionRoutes()).toEqual([
      planConversion("json", "json-schema"),
      planConversion("json", "typescript"),
      planConversion("json-schema", "json-schema"),
      planConversion("json-schema", "typescript"),
      planConversion("typescript", "json-schema"),
      planConversion("typescript", "typescript"),
    ]);
  });

  it("tracks IR usage and stage exposure from planned routes", () => {
    const route = planConversion("json", "json-schema");

    expect(routeUsesIr(route, "value")).toBe(true);
    expect(routeUsesIr(route, "constraint")).toBe(false);
    expect(routeStages(route)).toEqual(route.stages);
  });

  it("reports constraint support only when both parser and generator declare it", () => {
    expect(
      describeConversionRouteCapabilities("json-schema", "json-schema"),
    ).toMatchObject({
      supportsShapeIr: true,
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
      supportsShapeIr: true,
      supportsConstraintIr: false,
      preservedCapabilities: ["shape-ir"],
    });
  });
});
