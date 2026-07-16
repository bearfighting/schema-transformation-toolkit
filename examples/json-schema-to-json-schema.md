# JSON Schema To JSON Schema Examples

These examples show the current behavior of the toolchain for:

- JSON Schema Draft 2020-12 parsing
- schema IR as the intermediate representation
- JSON Schema Draft 2020-12 generation

Unless otherwise noted, examples assume the current supported JSON Schema parser subset and default JSON Schema generator behavior.

## 1. Simple Object Round-Trip

Input JSON Schema:

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

Generated JSON Schema:

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

This is the easiest current success path:

- fixed object fields
- required tracking
- scalar types only

## 2. Optional And Nullable Fields

Input JSON Schema:

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

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Profile",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": ["string", "null"] }
  },
  "required": ["id"]
}
```

The current parser normalizes field-level nullable structure through the shared IR and the generator now emits the compact nullable form again.

## 3. Reusable Definitions And Root References

Input JSON Schema:

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

Generated JSON Schema:

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

This is the current maximum reusable-definition round-trip that stays fully inside the existing IR:

- document-local `$defs`
- document-local `#/$defs/...` references
- root-level `$ref`

## 4. Tuple Schemas

Input JSON Schema:

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

Generated JSON Schema:

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

The current parser only accepts the generator-aligned tuple form, so this round-trip stays exact when the input already follows that structure.

## 5. Record-Like Objects

Input JSON Schema:

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

Generated JSON Schema:

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

This works because the input is a pure record shape.
The current parser still does not accept mixed fixed fields plus typed `additionalProperties`.

## 6. Union Lowering

Input JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Result",
  "anyOf": [{ "const": "open" }, { "const": true }]
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Result",
  "oneOf": [{ "const": "open" }, { "const": true }]
}
```

This is an important current semantic boundary:

- the parser accepts both `anyOf` and `oneOf`
- the shared IR only stores `union`
- the generator defaults to `oneOf`

So this round-trip is semantically aligned with the current IR, but not source-faithful to the original composition keyword.

## 7. Wide `true` Schemas

Input JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UnknownValue"
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UnknownValue"
}
```

A metadata-only root document like this is treated as the wide schema under the current parser boundary.

Inside nested positions, a wide schema still renders structurally as `true`, for example:

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

## 8. `additionalProperties: true`

Input JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OpenDictionary",
  "type": "object",
  "additionalProperties": true
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OpenDictionary",
  "type": "object",
  "additionalProperties": true
}
```

The current parser lowers this into a record with `unknown` values, and the generator renders that `unknown` value back as the wide JSON Schema.

## 9. Nested `true` Schemas

Input JSON Schema:

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

Generated JSON Schema:

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

This is a good example of the current "wide nested schema" story:

- the parser lowers nested `true` into `unknown`
- the generator renders `unknown` back to `true`
- diagnostics are still the place where the toolchain explains why that widening happened

## Notes On Current Non-Round-Trippable Cases

The current parser intentionally fails instead of pretending to round-trip these cases:

- `false` schemas
- `additionalProperties: false`
- mixed fixed-field objects plus typed `additionalProperties`
- external `$ref`
- `allOf`
- broader or non-simple `type: [...]` unions such as `["string", "number"]`
- validation constraints and annotations the current IR cannot preserve

This is deliberate.
The first parser version is optimized for the largest IR-aligned JSON Schema subset, not for full JSON Schema fidelity.

In other words:

- supported inputs participate in semantic round-trip testing
- unsupported validation and document-system features are explicit non-goals, not accidental gaps
