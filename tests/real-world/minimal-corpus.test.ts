import { describe, expect, it } from "vitest";
import { generateJsonSchema } from "@aio/generator-json-schema";
import { generateTypeScript } from "@aio/generator-typescript";
import { minimalRealWorldCorpus } from "../fixtures/real-world/minimal-corpus.js";
import { expectValidGeneratedJsonSchema } from "../helpers/json-schema-structure.js";
import { parseRealWorldCorpusCase } from "../helpers/real-world-corpus.js";
import { expectValidIr } from "../helpers/schema-equivalence.js";
import { expectValidTypeScriptSyntax } from "../helpers/typescript-syntax.js";

describe("real-world minimal corpus", () => {
  for (const corpusCase of minimalRealWorldCorpus) {
    it(`parses ${corpusCase.id} into valid IR and regenerates valid targets`, () => {
      const parsed = parseRealWorldCorpusCase(corpusCase);

      expect(parsed.document.name.source).toBe(corpusCase.expectedDocumentName);
      expectValidIr(parsed.document);

      const typeScriptOutput = generateTypeScript(parsed.document);
      expectValidTypeScriptSyntax(typeScriptOutput, `${corpusCase.id}.ts`);

      const jsonSchemaOutput = generateJsonSchema(parsed.document, {
        ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
      });
      expectValidGeneratedJsonSchema(jsonSchemaOutput);
    });
  }

  it("keeps the json-schema corpus constraints and annotations renderable through the generator", () => {
    const schemaCase = minimalRealWorldCorpus.find(
      (corpusCase) => corpusCase.id === "json-schema.openapi-user-response",
    );

    if (!schemaCase) {
      throw new Error("Expected the OpenAPI-style corpus case to exist.");
    }

    const parsed = parseRealWorldCorpusCase(schemaCase);

    expect(parsed.constraints).toBeDefined();

    const output = generateJsonSchema(parsed.document, {
      ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
    });

    expect(output).toMatchObject({
      $ref: "#/$defs/UserResponse",
      $defs: {
        User: {
          description: "API user",
          properties: {
            id: {
              minLength: 1,
            },
          },
          additionalProperties: false,
        },
      },
    });
    expectValidGeneratedJsonSchema(output);
  });

  it("keeps the pagination corpus numeric and collection constraints renderable through the generator", () => {
    const schemaCase = minimalRealWorldCorpus.find(
      (corpusCase) => corpusCase.id === "json-schema.pagination-response",
    );

    if (!schemaCase) {
      throw new Error("Expected the pagination corpus case to exist.");
    }

    const parsed = parseRealWorldCorpusCase(schemaCase);

    expect(parsed.constraints).toBeDefined();

    const output = generateJsonSchema(parsed.document, {
      ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
    });

    expect(output).toMatchObject({
      $ref: "#/$defs/PaginationResponse",
      $defs: {
        PageInfo: {
          properties: {
            total: {
              minimum: 0,
            },
          },
        },
        PaginationResponse: {
          properties: {
            items: {
              minItems: 1,
            },
          },
        },
      },
    });
    expectValidGeneratedJsonSchema(output);
  });

  it("keeps the loose bundle corpus widening structure renderable through the generator", () => {
    const schemaCase = minimalRealWorldCorpus.find(
      (corpusCase) => corpusCase.id === "json-schema.loose-bundle-document",
    );

    if (!schemaCase) {
      throw new Error("Expected the loose bundle corpus case to exist.");
    }

    const parsed = parseRealWorldCorpusCase(schemaCase);
    const output = generateJsonSchema(parsed.document, {
      ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
    });

    expect(output).toMatchObject({
      title: "LooseBundleDocument",
      $defs: {
        LooseMetadata: {
          type: "object",
          additionalProperties: true,
        },
        Attachment: {
          properties: {
            payload: true,
            labels: {
              type: "array",
              items: true,
            },
            metadata: {
              $ref: "#/$defs/LooseMetadata",
            },
          },
        },
        AuditEntry: {
          properties: {
            attachment: {
              $ref: "#/$defs/Attachment",
            },
          },
        },
      },
      properties: {
        entries: {
          type: "array",
          items: {
            $ref: "#/$defs/AuditEntry",
          },
        },
        snapshot: {
          $ref: "#/$defs/LooseMetadata",
        },
      },
    });
    expectValidGeneratedJsonSchema(output);
  });

  it("keeps the OpenAPI-components-style corpus renderable through the generator", () => {
    const schemaCase = minimalRealWorldCorpus.find(
      (corpusCase) => corpusCase.id === "json-schema.openapi-components-bundle",
    );

    if (!schemaCase) {
      throw new Error("Expected the OpenAPI components corpus case to exist.");
    }

    const parsed = parseRealWorldCorpusCase(schemaCase);

    expect(parsed.constraints).toBeDefined();

    const output = generateJsonSchema(parsed.document, {
      ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
    });

    expect(output).toMatchObject({
      $ref: "#/$defs/ApiResponse",
      $defs: {
        User: {
          description: "API user resource",
          properties: {
            id: {
              minLength: 1,
            },
          },
          additionalProperties: false,
        },
        PageInfo: {
          properties: {
            total: {
              minimum: 0,
            },
          },
        },
        PaginatedUsers: {
          properties: {
            items: {
              minItems: 1,
              items: {
                $ref: "#/$defs/User",
              },
            },
            pageInfo: {
              $ref: "#/$defs/PageInfo",
            },
          },
        },
        ApiResponse: {
          oneOf: [
            {
              properties: {
                data: {
                  $ref: "#/$defs/PaginatedUsers",
                },
              },
            },
            {
              properties: {
                error: {
                  $ref: "#/$defs/ErrorDetail",
                },
              },
            },
          ],
        },
      },
    });
    expectValidGeneratedJsonSchema(output);
  });

  it("keeps the dashboard TypeScript corpus renderable across tuple, record, union, and readonly normalization", () => {
    const schemaCase = minimalRealWorldCorpus.find(
      (corpusCase) => corpusCase.id === "typescript.dashboard-config",
    );

    if (!schemaCase) {
      throw new Error(
        "Expected the dashboard TypeScript corpus case to exist.",
      );
    }

    const parsed = parseRealWorldCorpusCase(schemaCase);
    const typeScriptOutput = generateTypeScript(parsed.document);
    const jsonSchemaOutput = generateJsonSchema(parsed.document, {
      ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
    });

    expect(typeScriptOutput).toContain("export type WidgetLayout = [");
    expect(typeScriptOutput).toContain(
      'export type ThemeName = "light" | "dark";',
    );
    expect(typeScriptOutput).toContain("widgets: Record<string, Widget>;");
    expect(typeScriptOutput).toContain(
      "selected: [string, WidgetKind | null];",
    );
    expectValidTypeScriptSyntax(
      typeScriptOutput,
      "typescript.dashboard-config.ts",
    );

    expect(jsonSchemaOutput).toMatchObject({
      $ref: "#/$defs/DashboardConfig",
      $defs: {
        WidgetLayout: {
          type: "array",
          prefixItems: [
            { type: "number" },
            { type: "number" },
            { type: "number" },
            { type: "number" },
          ],
          minItems: 2,
          items: false,
        },
        Widget: {
          properties: {
            layout: {
              $ref: "#/$defs/WidgetLayout",
            },
            config: {
              oneOf: [
                {
                  $ref: "#/$defs/ChartSeries",
                },
                {
                  type: "object",
                },
              ],
            },
          },
        },
        DashboardConfig: {
          properties: {
            widgets: {
              type: "object",
              additionalProperties: {
                $ref: "#/$defs/Widget",
              },
            },
            selected: {
              type: "array",
              prefixItems: [
                {
                  type: "string",
                },
                {
                  oneOf: [{ $ref: "#/$defs/WidgetKind" }, { type: "null" }],
                },
              ],
              minItems: 2,
              items: false,
            },
          },
        },
      },
    });
    expectValidGeneratedJsonSchema(jsonSchemaOutput);
  });

  it("keeps the workspace config JSON corpus renderable across nested maps and option clusters", () => {
    const schemaCase = minimalRealWorldCorpus.find(
      (corpusCase) => corpusCase.id === "json.workspace-pipeline-config",
    );

    if (!schemaCase) {
      throw new Error("Expected the workspace config corpus case to exist.");
    }

    const parsed = parseRealWorldCorpusCase(schemaCase);
    const typeScriptOutput = generateTypeScript(parsed.document);
    const jsonSchemaOutput = generateJsonSchema(parsed.document, {
      ...(parsed.constraints ? { constraints: parsed.constraints } : {}),
    });

    expect(typeScriptOutput).toContain(
      "export interface WorkspacePipelineConfig",
    );
    expect(typeScriptOutput).toContain("environments: {");
    expect(typeScriptOutput).toContain("dev: {");
    expect(typeScriptOutput).toContain("ci: {");
    expect(typeScriptOutput).toContain("notifications: {");
    expect(typeScriptOutput).toContain("slack: {");
    expect(typeScriptOutput).toContain("email: {");
    expectValidTypeScriptSyntax(
      typeScriptOutput,
      "json.workspace-pipeline-config.ts",
    );

    expect(jsonSchemaOutput).toMatchObject({
      title: "WorkspacePipelineConfig",
      type: "object",
      properties: {
        workspace: {
          type: "object",
          properties: {
            root: {
              type: "string",
            },
            telemetry: {
              type: "boolean",
            },
          },
        },
        environments: {
          type: "object",
          properties: {
            dev: {
              type: "object",
            },
            ci: {
              type: "object",
            },
          },
        },
        tasks: {
          type: "object",
          properties: {
            build: {
              type: "object",
            },
            test: {
              type: "object",
            },
          },
        },
        notifications: {
          type: "object",
          properties: {
            slack: {
              type: "object",
            },
            email: {
              type: "object",
            },
          },
        },
      },
    });
    expectValidGeneratedJsonSchema(jsonSchemaOutput);
  });
});
