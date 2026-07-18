import type {
  ConversionRoute,
  ConversionRouteCapabilities,
  GeneratorCapabilities,
  IrKind,
  ParserCapabilities,
  PipelineStage,
} from "@aio/core";
import { jsonSchemaGeneratorCapabilities } from "@aio/generator-json-schema";
import { typeScriptGeneratorCapabilities } from "@aio/generator-typescript";
import { jsonParserCapabilities } from "@aio/parser-json";
import { jsonSchemaParserCapabilities } from "@aio/parser-json-schema";
import { typeScriptParserCapabilities } from "@aio/parser-typescript";
import type {
  ConversionSourceFormat,
  ConversionTargetFormat,
} from "./types.js";

const PARSER_REGISTRY: Record<ConversionSourceFormat, ParserCapabilities> = {
  json: jsonParserCapabilities,
  "json-schema": jsonSchemaParserCapabilities,
  typescript: typeScriptParserCapabilities,
};

const GENERATOR_REGISTRY: Record<
  ConversionTargetFormat,
  GeneratorCapabilities
> = {
  "json-schema": jsonSchemaGeneratorCapabilities,
  typescript: typeScriptGeneratorCapabilities,
};

export function listConversionRoutes(): ConversionRoute[] {
  const sources: ConversionSourceFormat[] = [
    "json",
    "json-schema",
    "typescript",
  ];
  const targets: ConversionTargetFormat[] = ["json-schema", "typescript"];

  return sources.flatMap((sourceFormat) =>
    targets.map((targetFormat) => planConversion(sourceFormat, targetFormat)),
  );
}

export function planConversion(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRoute {
  const parserCapabilities = resolveParserCapabilities(sourceFormat);
  const generatorCapabilities = resolveGeneratorCapabilities(targetFormat);
  const route = buildConversionRoute(
    sourceFormat,
    targetFormat,
    parserCapabilities,
    generatorCapabilities,
  );

  if (route === undefined) {
    throw new Error(
      `Unsupported conversion route: ${sourceFormat} -> ${targetFormat}`,
    );
  }

  return route;
}

export function describeConversionRouteCapabilities(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
): ConversionRouteCapabilities {
  const parserCapabilities = resolveParserCapabilities(sourceFormat);
  const generatorCapabilities = resolveGeneratorCapabilities(targetFormat);
  const preservedCapabilities = parserCapabilities.capabilities.filter(
    (capability) =>
      generatorCapabilities.supportsCapabilities.includes(capability),
  );
  const potentiallyLostCapabilities = parserCapabilities.capabilities.filter(
    (capability) =>
      !generatorCapabilities.supportsCapabilities.includes(capability),
  );

  return {
    supportsValueIr: parserCapabilities.producesIr.includes("value"),
    supportsShapeIr:
      parserCapabilities.producesIr.includes("shape") &&
      generatorCapabilities.consumesIr.includes("shape"),
    supportsConstraintIr:
      parserCapabilities.producesIr.includes("constraint") &&
      generatorCapabilities.consumesIr.includes("constraint"),
    parserCapabilities: parserCapabilities.capabilities,
    generatorCapabilities: generatorCapabilities.supportsCapabilities,
    preservedCapabilities,
    potentiallyLostCapabilities,
  };
}

export function routeUsesIr(route: ConversionRoute, irKind: IrKind): boolean {
  return route.irSequence.includes(irKind);
}

export function routeStages(route: ConversionRoute): PipelineStage[] {
  return route.stages;
}

export function resolveParserCapabilities(
  sourceFormat: ConversionSourceFormat,
): ParserCapabilities {
  return PARSER_REGISTRY[sourceFormat];
}

export function resolveGeneratorCapabilities(
  targetFormat: ConversionTargetFormat,
): GeneratorCapabilities {
  return GENERATOR_REGISTRY[targetFormat];
}

function buildConversionRoute(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: GeneratorCapabilities,
): ConversionRoute | undefined {
  if (!parserCapabilities.producesIr.includes("shape")) {
    return undefined;
  }

  if (!generatorCapabilities.consumesIr.includes("shape")) {
    return undefined;
  }

  const irSequence: IrKind[] = [];

  if (
    sourceFormat === "json" &&
    parserCapabilities.producesIr.includes("value")
  ) {
    irSequence.push("value");
  }

  irSequence.push("shape");

  if (
    parserCapabilities.producesIr.includes("constraint") &&
    generatorCapabilities.consumesIr.includes("constraint")
  ) {
    irSequence.push("constraint");
  }

  return {
    sourceFormat,
    targetFormat,
    irSequence,
    stages: buildPipelineStages(
      sourceFormat,
      targetFormat,
      parserCapabilities,
      generatorCapabilities,
    ),
  };
}

function buildPipelineStages(
  sourceFormat: ConversionSourceFormat,
  targetFormat: ConversionTargetFormat,
  parserCapabilities: ParserCapabilities,
  generatorCapabilities: GeneratorCapabilities,
): PipelineStage[] {
  if (sourceFormat === "json") {
    return [
      { kind: "parse-source", from: "json", to: "json-value" },
      { kind: "lower-to-value", from: "json-value", to: "value", ir: "value" },
      { kind: "infer-shape", from: "value", to: "shape", ir: "shape" },
      ...(parserCapabilities.producesIr.includes("constraint") &&
      generatorCapabilities.consumesIr.includes("constraint")
        ? [
            {
              kind: "derive-constraints" as const,
              from: "shape",
              to: "constraint",
              ir: "constraint" as const,
            },
          ]
        : []),
      { kind: "generate-target", from: "shape", to: targetFormat },
    ];
  }

  return [
    { kind: "parse-source", from: sourceFormat, to: "shape", ir: "shape" },
    { kind: "generate-target", from: "shape", to: targetFormat },
  ];
}
