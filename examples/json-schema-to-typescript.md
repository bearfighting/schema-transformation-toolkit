# JSON Schema To TypeScript Examples

These examples show the current behavior of the toolchain for:

- JSON Schema Draft 2020-12 parsing
- schema IR as the intermediate representation
- TypeScript generation

Unless otherwise noted, examples assume the current supported JSON Schema parser subset and default TypeScript generator behavior.

## 1. Simple Object

JSON Schema:

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

Generated TypeScript:

```ts
export interface User {
  id: number;
  active: boolean;
}
```

## 2. Optional And Nullable Fields

JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Profile",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": {
      "oneOf": [{ "type": "string" }, { "type": "null" }]
    }
  },
  "required": ["id"]
}
```

Generated TypeScript:

```ts
export interface Profile {
  id: number;
  name?: string | null;
}
```

The current parser normalizes both of these property forms back into field-level nullability in the shared IR:

- `type: ["string", "null"]`
- `oneOf: [{ "type": "string" }, { "type": "null" }]`

## 3. Reusable Definitions And Root References

JSON Schema:

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

Generated TypeScript:

```ts
export interface User {
  id: number;
}

export type Response = User[];

export type ResponseDocument = Response;
```

This shows the current document-local reuse boundary:

- `$defs` become reusable IR definitions
- `#/$defs/...` references become IR references
- the selected document root may itself be a reference

## 4. Tuple Schemas

JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CoordinatePair",
  "type": "array",
  "prefixItems": [{ "type": "integer" }, { "type": "string" }],
  "minItems": 1,
  "items": false
}
```

Generated TypeScript:

```ts
export type CoordinatePair = [number, string?];
```

The current parser only accepts the generator-aligned tuple structure:

- `type: "array"`
- `prefixItems`
- `items: false`
- optional `minItems`

## 5. Record-Like Objects

JSON Schema:

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

Generated TypeScript:

```ts
export type FeatureFlags = Record<string, boolean>;
```

The current parser treats this as a pure record shape.
Mixed fixed-field objects plus typed `additionalProperties` are still intentionally unsupported because the current IR has no direct mixed object-map abstraction.

## 6. Union Lowering

JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Result",
  "anyOf": [{ "const": "open" }, { "const": true }]
}
```

Generated TypeScript:

```ts
export type Result = "open" | true;
```

The current parser accepts both `oneOf` and `anyOf`, but lowers both into the shared IR union semantics.
That means the exact JSON Schema composition keyword is not preserved through the IR.

## 7. Wide `true` Schemas

JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UnknownValue"
}
```

Generated TypeScript:

```ts
export type UnknownValue = unknown;
```

A metadata-only root schema like this is semantically the same as a wide `true` schema in the current parser boundary.

## 8. `additionalProperties: true`

JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OpenDictionary",
  "type": "object",
  "additionalProperties": true
}
```

Generated TypeScript:

```ts
export type OpenDictionary = Record<string, unknown>;
```

The current parser lowers this into the existing record-plus-unknown semantics.
That keeps the result inside the current IR without inventing a dedicated "open map" node.

## 9. Nested `true` Schemas

JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PartialShape",
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": true
    }
  },
  "required": ["tags"]
}
```

Generated TypeScript:

```ts
export interface PartialShape {
  tags: unknown[];
}
```

Nested `true` schemas are currently lowered into ordinary shared `unknown` semantics.
That is the same boundary the JSON parser and JSON Schema generator already use for wide unresolved element types.

## Notes On Current Unsupported Cases

The current JSON Schema parser still fails explicitly for important non-representable cases such as:

- `false` schemas
- `additionalProperties: false`
- mixed fixed fields plus typed `additionalProperties`
- external `$ref`
- `allOf`
- broader or non-simple `type: [...]` unions such as `["string", "number"]`
- constraint and annotation keywords that the current IR cannot preserve

Those boundaries are intentional.
The first parser version is trying to import the largest current IR-aligned subset, not the full JSON Schema specification.
