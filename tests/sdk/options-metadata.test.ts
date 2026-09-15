import { describe, expect, it } from "vitest";
import {
  DEFAULT_JSON_PARSE_OPTIONS,
  jsonParserOptionCatalog,
} from "../../packages/parsers/json/src/index.js";
import { DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS } from "../../packages/generators/json-schema/src/index.js";
import { DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS } from "../../packages/generators/typescript/src/index.js";
import {
  DEFAULT_JSON_SCHEMA_PARSE_OPTIONS,
  jsonSchemaParserOptionCatalog,
} from "../../packages/parsers/json-schema/src/index.js";
import {
  DEFAULT_TYPESCRIPT_PARSE_OPTIONS,
  typeScriptParserOptionCatalog,
} from "../../packages/parsers/typescript/src/index.js";
import {
  conversionOptionCatalogsSchema,
  describeConversionOptions,
  describeGeneratorOptions,
  describeParserOptions,
  listOptionCatalogs,
  optionCatalogSchema,
} from "../../packages/sdk/src/index.js";

describe("SDK option metadata", () => {
  it("exposes a catalog for every supported parser and generator", () => {
    expect(
      listOptionCatalogs().map(({ format, role }) => `${role}:${format}`),
    ).toEqual([
      "parser:csharp",
      "parser:csv",
      "parser:go",
      "parser:java",
      "parser:json",
      "parser:json-schema",
      "parser:kotlin",
      "parser:openapi",
      "parser:python",
      "parser:rust",
      "parser:toml",
      "parser:typescript",
      "parser:yaml",
      "parser:zod",
      "generator:csharp",
      "generator:csv",
      "generator:go",
      "generator:java",
      "generator:json",
      "generator:json-schema",
      "generator:kotlin",
      "generator:openapi",
      "generator:python",
      "generator:rust",
      "generator:toml",
      "generator:typescript",
      "generator:yaml",
      "generator:zod",
    ]);
  });

  it("has complete, runtime-valid metadata entries", () => {
    for (const catalog of listOptionCatalogs()) {
      expect(optionCatalogSchema.safeParse(catalog).success).toBe(true);

      for (const option of catalog.options) {
        expect(option.key).not.toBe("");
        expect(option.description).not.toBe("");
        expect(option.semanticEffect).not.toBe("");
        expect(option.diagnosticEffect).not.toBe("");
        expect(option.examples.length).toBeGreaterThan(0);

        for (const value of option.valueDescriptions ?? []) {
          expect(value.description).not.toBe("");
          expect(value.example).toBeDefined();
        }
      }
    }
  });

  it("keeps documented defaults aligned with option resolvers", () => {
    const json = describeParserOptions("json");
    expect(
      json.options.find((option) => option.key === "schema.numericMode")
        ?.defaultValue,
    ).toBe(DEFAULT_JSON_PARSE_OPTIONS.schema.numericMode);
    expect(
      json.options.find((option) => option.key === "schema.mixedTypeMode")
        ?.defaultValue,
    ).toBe(DEFAULT_JSON_PARSE_OPTIONS.schema.mixedTypeMode);

    const jsonSchema = describeParserOptions("json-schema");
    expect(
      jsonSchema.options.find((option) => option.key === "strictness")
        ?.defaultValue,
    ).toBe(DEFAULT_JSON_SCHEMA_PARSE_OPTIONS.strictness);

    const typescriptParser = describeParserOptions("typescript");
    expect(
      typescriptParser.options.find((option) => option.key === "entry")
        ?.defaultValue,
    ).toBe(null);
    expect(
      typescriptParser.options.find((option) => option.key === "strictness")
        ?.defaultValue,
    ).toBe(DEFAULT_TYPESCRIPT_PARSE_OPTIONS.strictness);

    const typescript = describeGeneratorOptions("typescript");
    expect(
      typescript.options.find((option) => option.key === "rootObjectMode")
        ?.defaultValue,
    ).toBe(DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.rootObjectMode);
    expect(
      typescript.options.find((option) => option.key === "arrayStyle")
        ?.defaultValue,
    ).toBe(DEFAULT_TYPESCRIPT_GENERATOR_OPTIONS.arrayStyle);

    const jsonSchemaGenerator = describeGeneratorOptions("json-schema");
    expect(
      jsonSchemaGenerator.options.find(
        (option) => option.key === "includeSchemaUri",
      )?.defaultValue,
    ).toBe(DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.includeSchemaUri);
    expect(
      jsonSchemaGenerator.options.find(
        (option) => option.key === "unionComposition",
      )?.defaultValue,
    ).toBe(DEFAULT_JSON_SCHEMA_GENERATOR_OPTIONS.unionComposition);
  });

  it("returns route-scoped parser and generator catalogs", () => {
    const catalogs = describeConversionOptions("json", "typescript");

    expect(conversionOptionCatalogsSchema.safeParse(catalogs).success).toBe(
      true,
    );
    expect(catalogs.parser.format).toBe("json");
    expect(catalogs.parser.role).toBe("parser");
    expect(catalogs.generator.format).toBe("typescript");
    expect(catalogs.generator.role).toBe("generator");
    expect(catalogs.irPreference).toMatchObject({
      key: "irPreference",
      defaultValue: "auto",
      supported: true,
    });
    const legacyCatalogs = Object.fromEntries(
      Object.entries(catalogs).filter(([key]) => key !== "transformers"),
    );
    expect(
      conversionOptionCatalogsSchema.safeParse(legacyCatalogs).success,
    ).toBe(true);
  });

  it("does not expose unsupported source-location preservation as supported", () => {
    for (const catalog of [
      jsonParserOptionCatalog,
      jsonSchemaParserOptionCatalog,
      typeScriptParserOptionCatalog,
    ]) {
      const option = catalog.options.find(
        (candidate) => candidate.key === "diagnostics.preserveSourceInfo",
      );
      expect(option?.supported).toBe(false);
    }
  });
});
