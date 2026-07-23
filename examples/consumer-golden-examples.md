# Consumer Golden Examples

This document collects a smaller curated set of examples for downstream consumer surfaces.

The canonical machine-readable source for this set now lives in [fixtures/consumer-golden-examples.ts](fixtures/consumer-golden-examples.ts).
This Markdown file should be treated as the human-readable companion view, not the primary source that downstream apps parse.

Use it when you need:

- default sample content for a Web app, CLI, or docs page
- a compact confidence set for downstream smoke coverage
- honest examples that show both current strengths and current caveats

These examples are intentionally product-facing rather than exhaustive.
They complement the route-specific examples in this folder.

## 1. Simple JSON Object To TypeScript

- Title: `UserProfile`
- Source format: `json`
- Target format: `typescript`

Input:

```json
{
  "name": "Ada",
  "age": 32,
  "active": true
}
```

Expected output:

```ts
export interface UserProfile {
  name: string;
  age: number;
  active: boolean;
}
```

Expected diagnostic or caveat codes:

- none

Why keep it:

- this is the cleanest first-run example for downstream product surfaces

## 2. Optional And Nullable JSON Evidence

- Title: `UserList`
- Source format: `json`
- Target format: `typescript`

Input:

```json
[
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
]
```

Expected output:

```ts
export type UserList = Array<{
  id: number;
  name?: string | null;
}>;
```

Expected diagnostic or caveat codes:

- none

Why keep it:

- it demonstrates field optionality and nullability without introducing schema syntax first

## 3. JSON Mixed-Type Union Inference

- Title: `MixedFieldValues`
- Source format: `json`
- Target format: `typescript`

Input:

```json
[
  {
    "value": 1
  },
  {
    "value": "x"
  },
  {
    "value": null
  }
]
```

Expected output:

```ts
export type MixedFieldValues = Array<{
  value: string | number | null;
}>;
```

Expected diagnostic or caveat codes:

- none

Why keep it:

- it is a strong default sample when a consumer wants to showcase configurable inference rather than only happy-path objects

Important option:

```ts
{
  inference: {
    mixedTypeMode: "union";
  }
}
```

## 4. JSON Schema Reusable Definitions

- Title: `ResponseDocument`
- Source format: `json-schema`
- Target format: `typescript`

Input:

```json
{
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
}
```

Expected output:

```ts
export interface User {
  id: number;
}

export type Response = User[];

export type ResponseDocument = Response;
```

Expected diagnostic or caveat codes:

- none

Why keep it:

- it shows the current local `$defs` and `$ref` reuse boundary clearly

## 5. JSON Schema Record-Like Object

- Title: `FeatureFlags`
- Source format: `json-schema`
- Target format: `typescript`

Input:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FeatureFlags",
  "type": "object",
  "additionalProperties": {
    "type": "boolean"
  }
}
```

Expected output:

```ts
export type FeatureFlags = Record<string, boolean>;
```

Expected diagnostic or caveat codes:

- none

Why keep it:

- it demonstrates a useful supported JSON Schema subset without over-claiming mixed object-map support

## 6. JSON Schema Integer Widening

- Title: `User`
- Source format: `json-schema`
- Target format: `typescript`

Input:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "active": { "type": "boolean" }
  },
  "required": ["id", "active"]
}
```

Expected output:

```ts
export interface User {
  id: number;
  active: boolean;
}
```

Expected diagnostic or caveat codes:

- `integer-widened-to-number`

Why keep it:

- it is the clearest single example of a successful conversion with an honest target caveat

## 7. TypeScript To JSON Schema With Reachable Definitions

- Title: `ResponseDocument`
- Source format: `typescript`
- Target format: `json-schema`

Input:

```ts
type Status = "open" | "closed";
type Audit = { at: string; actor: string };
type User = { id: number; status: Status; audit: Audit };
type Response = { users: User[] };
type Unused = { debug: boolean };
```

Expected output:

```json
{
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
}
```

Expected diagnostic or caveat codes:

- none

Why keep it:

- it gives downstream consumers a realistic TypeScript-authored input with reusable declarations and reachable-definition pruning

Important options:

```ts
{
  entry: "Response",
  name: "ResponseDocument"
}
```

## 8. Report Analysis Example With Richer Context

- Title: `ExampleDocument`
- Source format: `json-schema`
- Target format: `typescript`

Input:

```ts
convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: JSON.stringify({
    title: "ExampleDocument",
    $defs: {
      Count: { type: "integer" },
      FallbackValue: true,
      FlexibleValue: {
        anyOf: [{ const: "open" }, { $ref: "#/$defs/FallbackValue" }],
      },
    },
    type: "object",
    properties: {
      id: { $ref: "#/$defs/Count" },
      value: { $ref: "#/$defs/FlexibleValue" },
    },
    required: ["id", "value"],
  }),
});
```

Expected output:

```ts
export type Count = number;

export type FallbackValue = unknown;

export type FlexibleValue = "open" | FallbackValue;

export interface ExampleDocument {
  id: Count;
  value: FlexibleValue;
}
```

Expected diagnostic or caveat codes:

- `integer-widened-to-number`
- `wide-unknown-type`
- `unknown-union-member-absorbs-union`

Why keep it:

- it is the best compact example for showing `semanticCaveats`, `capabilityRequirements`, and `lossHotspots` together

## Recommended Uses

Use these eight examples as:

- the initial sample library for downstream consumer surfaces
- the first smoke set in a downstream integration repo
- the baseline docs examples before adding broader exploratory samples

For route-specific depth, continue with:

- [json-to-typescript.md](json-to-typescript.md)
- [json-schema-to-typescript.md](json-schema-to-typescript.md)
- [json-to-json-schema.md](json-to-json-schema.md)
- [json-schema-to-json-schema.md](json-schema-to-json-schema.md)
- [typescript-to-json-schema.md](typescript-to-json-schema.md)
- [sdk-report-analysis.md](sdk-report-analysis.md)
