export interface RealWorldCorpusCase {
  id: string;
  description: string;
  sourceFormat: "json" | "json-schema" | "typescript";
  input: string;
  expectedDocumentName: string;
  entry?: string;
}

export const minimalRealWorldCorpus: RealWorldCorpusCase[] = [
  {
    id: "json.package-manifest",
    description:
      "A package.json-style manifest with nested objects, arrays, and boolean flags.",
    sourceFormat: "json",
    input: JSON.stringify({
      name: "sample-package",
      version: "1.0.0",
      private: true,
      scripts: {
        build: "tsup",
        test: "vitest run",
      },
      keywords: ["schema", "converter"],
      repository: {
        type: "git",
        url: "https://example.com/repo.git",
      },
    }),
    expectedDocumentName: "PackageManifest",
  },
  {
    id: "typescript.paginated-response",
    description:
      "A paginated API response shape with nested reusable definitions and optional metadata.",
    sourceFormat: "typescript",
    input: [
      'type Status = "active" | "disabled";',
      "type User = { id: number; email: string; status: Status };",
      "type Pagination = { cursor?: string | null; hasMore: boolean };",
      "type UserPage = { items: User[]; pagination: Pagination };",
    ].join("\n"),
    expectedDocumentName: "UserPageDocument",
    entry: "UserPage",
  },
  {
    id: "json-schema.openapi-user-response",
    description:
      "An OpenAPI-style response schema with $defs, constraints, and reusable references.",
    sourceFormat: "json-schema",
    input: JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "UserResponseDocument",
      $defs: {
        User: {
          type: "object",
          description: "API user",
          properties: {
            id: {
              type: "string",
              minLength: 1,
            },
            email: {
              type: "string",
            },
          },
          required: ["id", "email"],
          additionalProperties: false,
        },
        UserResponse: {
          type: "object",
          properties: {
            data: {
              $ref: "#/$defs/User",
            },
            requestId: {
              type: "string",
            },
          },
          required: ["data"],
        },
      },
      $ref: "#/$defs/UserResponse",
    }),
    expectedDocumentName: "UserResponseDocument",
  },
  {
    id: "json.tsconfig-like",
    description:
      "A tsconfig-style JSON document with nested compiler options and include/exclude arrays.",
    sourceFormat: "json",
    input: JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "ES2022",
        module: "NodeNext",
      },
      include: ["src/**/*.ts", "tests/**/*.ts"],
      exclude: ["dist", "coverage"],
    }),
    expectedDocumentName: "TsconfigLike",
  },
  {
    id: "json.workspace-pipeline-config",
    description:
      "A workspace pipeline config with nested option clusters, record maps, nullable fields, and array-heavy task definitions.",
    sourceFormat: "json",
    input: JSON.stringify({
      version: "2",
      workspace: {
        root: ".",
        cacheDir: ".cache/build",
        telemetry: false,
      },
      environments: {
        dev: {
          concurrency: 2,
          output: ["dist/dev"],
          envFile: ".env.development",
        },
        ci: {
          concurrency: 6,
          output: ["dist/ci", "coverage"],
          envFile: null,
        },
      },
      tasks: {
        build: {
          command: "pnpm build",
          deps: ["lint", "test"],
          outputs: ["dist"],
        },
        test: {
          command: "pnpm vitest run",
          deps: [],
          outputs: ["coverage"],
        },
      },
      notifications: {
        slack: {
          enabled: true,
          channels: ["#builds", "#alerts"],
        },
        email: {
          enabled: false,
          recipients: [],
        },
      },
    }),
    expectedDocumentName: "WorkspacePipelineConfig",
  },
  {
    id: "typescript.audit-feed",
    description:
      "A reusable-definition API feed shape with nested references and optional pagination cursor.",
    sourceFormat: "typescript",
    input: [
      'type Status = "created" | "deleted";',
      "type Actor = { id: number; email: string };",
      "type AuditEntry = { at: string; actor: Actor; status: Status };",
      "type AuditFeed = { entries: AuditEntry[]; nextCursor?: string | null };",
    ].join("\n"),
    expectedDocumentName: "AuditFeedDocument",
    entry: "AuditFeed",
  },
  {
    id: "typescript.dashboard-config",
    description:
      "A dashboard-style TypeScript shape with readonly fields, reusable definitions, nested tuples, record maps, unions, and nullable metadata.",
    sourceFormat: "typescript",
    input: [
      'type WidgetKind = "chart" | "table";',
      'type ThemeName = "light" | "dark";',
      "type WidgetLayout = readonly [number, number, number?, number?];",
      "type ChartSeries = { readonly label: string; readonly points: number[] };",
      "type TableColumn = { readonly key: string; readonly title: string };",
      "type Widget = {",
      "  readonly id: string;",
      "  readonly kind: WidgetKind;",
      "  readonly layout: WidgetLayout;",
      "  readonly config: ChartSeries | { readonly columns: readonly TableColumn[] };",
      "  readonly tags?: readonly string[] | null;",
      "};",
      "type DashboardConfig = {",
      "  readonly theme: ThemeName;",
      "  readonly widgets: Record<string, Widget>;",
      "  readonly selected: readonly [string, WidgetKind | null];",
      "};",
    ].join("\n"),
    expectedDocumentName: "DashboardConfigDocument",
    entry: "DashboardConfig",
  },
  {
    id: "json-schema.pagination-response",
    description:
      "An API-style response schema with reusable refs plus numeric and collection constraints.",
    sourceFormat: "json-schema",
    input: JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "PaginationResponseDocument",
      $defs: {
        PageInfo: {
          type: "object",
          properties: {
            total: {
              type: "integer",
              minimum: 0,
            },
            hasMore: {
              type: "boolean",
            },
          },
          required: ["total", "hasMore"],
        },
        PaginationResponse: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 1,
            },
            pageInfo: {
              $ref: "#/$defs/PageInfo",
            },
          },
          required: ["items", "pageInfo"],
        },
      },
      $ref: "#/$defs/PaginationResponse",
    }),
    expectedDocumentName: "PaginationResponseDocument",
  },
  {
    id: "json-schema.loose-bundle-document",
    description:
      "A multi-layer JSON Schema bundle with nested $defs, open maps, nested true schemas, and reusable refs.",
    sourceFormat: "json-schema",
    input: JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "LooseBundleDocument",
      $defs: {
        LooseMetadata: {
          type: "object",
          additionalProperties: true,
        },
        Attachment: {
          type: "object",
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
          required: ["payload", "labels", "metadata"],
        },
        AuditEntry: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            attachment: {
              $ref: "#/$defs/Attachment",
            },
          },
          required: ["id", "attachment"],
        },
      },
      type: "object",
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
      required: ["entries", "snapshot"],
    }),
    expectedDocumentName: "LooseBundleDocument",
  },
  {
    id: "json-schema.openapi-components-bundle",
    description:
      "An OpenAPI-components-style schema bundle with reusable entities, paginated data, error payloads, and mixed constraints.",
    sourceFormat: "json-schema",
    input: JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "ApiResponseDocument",
      $defs: {
        ErrorDetail: {
          type: "object",
          properties: {
            code: {
              type: "string",
              minLength: 3,
            },
            message: {
              type: "string",
            },
          },
          required: ["code", "message"],
        },
        User: {
          type: "object",
          description: "API user resource",
          properties: {
            id: {
              type: "string",
              minLength: 1,
            },
            email: {
              type: "string",
            },
            status: {
              oneOf: [{ const: "active" }, { const: "disabled" }],
            },
          },
          required: ["id", "email", "status"],
          additionalProperties: false,
        },
        PageInfo: {
          type: "object",
          properties: {
            total: {
              type: "integer",
              minimum: 0,
            },
            hasMore: {
              type: "boolean",
            },
            nextCursor: {
              type: ["string", "null"],
            },
          },
          required: ["total", "hasMore"],
        },
        PaginatedUsers: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                $ref: "#/$defs/User",
              },
              minItems: 1,
            },
            pageInfo: {
              $ref: "#/$defs/PageInfo",
            },
          },
          required: ["items", "pageInfo"],
        },
        ApiResponse: {
          oneOf: [
            {
              type: "object",
              properties: {
                data: {
                  $ref: "#/$defs/PaginatedUsers",
                },
              },
              required: ["data"],
            },
            {
              type: "object",
              properties: {
                error: {
                  $ref: "#/$defs/ErrorDetail",
                },
              },
              required: ["error"],
            },
          ],
        },
      },
      $ref: "#/$defs/ApiResponse",
    }),
    expectedDocumentName: "ApiResponseDocument",
  },
];
