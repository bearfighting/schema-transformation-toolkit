export type ConsumerExampleSourceFormat = "json" | "json-schema" | "typescript";

export type ConsumerExampleTargetFormat = "json-schema" | "typescript";

export type ConsumerExampleCategory = "basic" | "lossy" | "unsupported";

export interface ConsumerExample {
  id: string;
  title: string;
  sourceFormat: ConsumerExampleSourceFormat;
  targetFormat: ConsumerExampleTargetFormat;
  input: string;
  expectedOutput?: string;
  expectedDiagnosticCodes: string[];
  category: ConsumerExampleCategory;
  summary: string;
  optionsSnippet?: string;
}

export const consumerGoldenExamples = [
  {
    id: "json-user-profile",
    title: "UserProfile",
    sourceFormat: "json",
    targetFormat: "typescript",
    input: `{
  "name": "Ada",
  "age": 32,
  "active": true
}`,
    expectedOutput: `export interface UserProfile {
  name: string;
  age: number;
  active: boolean;
}`,
    expectedDiagnosticCodes: [],
    category: "basic",
    summary: "Clean first-run example for downstream product surfaces.",
  },
  {
    id: "json-user-list-nullable",
    title: "UserList",
    sourceFormat: "json",
    targetFormat: "typescript",
    input: `[
  {
    "id": 1,
    "name": "Ada"
  },
  {
    "id": 2,
    "name": null
  },
  {
    "id": 3
  }
]`,
    expectedOutput: `export type UserList = Array<{
  id: number;
  name?: string | null;
}>;`,
    expectedDiagnosticCodes: [],
    category: "basic",
    summary:
      "Shows field optionality and nullability without introducing schema syntax first.",
  },
  {
    id: "json-mixed-type-union",
    title: "MixedFieldValues",
    sourceFormat: "json",
    targetFormat: "typescript",
    input: `[
  {
    "value": 1
  },
  {
    "value": "x"
  },
  {
    "value": null
  }
]`,
    expectedOutput: `export type MixedFieldValues = Array<{
  value: string | number | null;
}>;`,
    expectedDiagnosticCodes: [],
    category: "basic",
    summary:
      "Useful default sample when a consumer wants to showcase configurable inference.",
    optionsSnippet: `{
  inference: {
    mixedTypeMode: "union";
  }
}`,
  },
  {
    id: "json-schema-response-document",
    title: "ResponseDocument",
    sourceFormat: "json-schema",
    targetFormat: "typescript",
    input: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ResponseDocument",
  "$defs": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "number" }
      },
      "required": ["id"]
    },
    "Response": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/User"
      }
    }
  },
  "$ref": "#/$defs/Response"
}`,
    expectedOutput: `export interface User {
  id: number;
}

export type Response = User[];

export type ResponseDocument = Response;`,
    expectedDiagnosticCodes: [],
    category: "basic",
    summary: "Shows the current local $defs and $ref reuse boundary clearly.",
  },
  {
    id: "json-schema-feature-flags",
    title: "FeatureFlags",
    sourceFormat: "json-schema",
    targetFormat: "typescript",
    input: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FeatureFlags",
  "type": "object",
  "additionalProperties": {
    "type": "boolean"
  }
}`,
    expectedOutput: `export type FeatureFlags = Record<string, boolean>;`,
    expectedDiagnosticCodes: [],
    category: "basic",
    summary:
      "Demonstrates a useful supported JSON Schema subset without over-claiming mixed object-map support.",
  },
  {
    id: "json-schema-integer-widening",
    title: "User",
    sourceFormat: "json-schema",
    targetFormat: "typescript",
    input: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "active": { "type": "boolean" }
  },
  "required": ["id", "active"]
}`,
    expectedOutput: `export interface User {
  id: number;
  active: boolean;
}`,
    expectedDiagnosticCodes: ["integer-widened-to-number"],
    category: "lossy",
    summary:
      "Clear successful conversion example with an honest target caveat.",
  },
  {
    id: "typescript-reachable-definitions",
    title: "ResponseDocument",
    sourceFormat: "typescript",
    targetFormat: "json-schema",
    input: `type Status = "open" | "closed";
type Audit = { at: string; actor: string };
type User = { id: number; status: Status; audit: Audit };
type Response = { users: User[] };
type Unused = { debug: boolean };`,
    expectedOutput: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ResponseDocument",
  "$defs": {
    "Status": {
      "oneOf": [{ "const": "open" }, { "const": "closed" }]
    },
    "Audit": {
      "type": "object",
      "properties": {
        "at": { "type": "string" },
        "actor": { "type": "string" }
      },
      "required": ["at", "actor"]
    },
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "number" },
        "status": { "$ref": "#/$defs/Status" },
        "audit": { "$ref": "#/$defs/Audit" }
      },
      "required": ["id", "status", "audit"]
    },
    "Response": {
      "type": "object",
      "properties": {
        "users": {
          "type": "array",
          "items": { "$ref": "#/$defs/User" }
        }
      },
      "required": ["users"]
    }
  },
  "$ref": "#/$defs/Response"
}`,
    expectedDiagnosticCodes: [],
    category: "basic",
    summary:
      "Realistic TypeScript-authored input with reusable declarations and reachable-definition pruning.",
    optionsSnippet: `{
  entry: "Response",
  name: "ResponseDocument"
}`,
  },
  {
    id: "report-analysis-richer-context",
    title: "ExampleDocument",
    sourceFormat: "json-schema",
    targetFormat: "typescript",
    input: `convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: JSON.stringify({
    title: "ExampleDocument",
    $defs: {
      Count: { type: "integer" },
      FallbackValue: true,
      FlexibleValue: {
        anyOf: [{ const: "open" }, { $ref: "#/$defs/FallbackValue" }]
      }
    },
    type: "object",
    properties: {
      id: { $ref: "#/$defs/Count" },
      value: { $ref: "#/$defs/FlexibleValue" }
    },
    required: ["id", "value"]
  })
});`,
    expectedOutput: `export type Count = number;

export type FallbackValue = unknown;

export type FlexibleValue = "open" | FallbackValue;

export interface ExampleDocument {
  id: Count;
  value: FlexibleValue;
}`,
    expectedDiagnosticCodes: [
      "integer-widened-to-number",
      "wide-unknown-type",
      "unknown-union-member-absorbs-union",
    ],
    category: "lossy",
    summary:
      "Compact example for showing semanticCaveats, capabilityRequirements, and lossHotspots together.",
  },
] as const satisfies readonly ConsumerExample[];

export function listConsumerGoldenExamples(): ConsumerExample[] {
  return consumerGoldenExamples.map((example) => ({
    ...example,
    expectedDiagnosticCodes: [...example.expectedDiagnosticCodes],
  }));
}
