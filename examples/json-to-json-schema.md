# JSON To JSON Schema Examples

These examples show the current behavior of the toolchain for:

- JSON parsing and schema inference
- schema IR as the intermediate representation
- JSON Schema Draft 2020-12 generation

Unless otherwise noted, examples assume default parser and generator behavior.

## 1. Simple Object

JSON:

```json
{
  "name": "Ada",
  "age": 32,
  "active": true
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UserProfile",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer" },
    "active": { "type": "boolean" }
  },
  "required": ["name", "age", "active"]
}
```

## 2. Optional And Nullable Fields

JSON:

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

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UserList",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "name": {
        "oneOf": [{ "type": "string" }, { "type": "null" }]
      }
    },
    "required": ["id"]
  }
}
```

## 3. Heterogeneous Arrays As Tuples

Parser option:

```ts
{
  inference: {
    tupleInferenceMode: "heterogeneous-only";
  }
}
```

JSON:

```json
{
  "pair": [1, "north"]
}
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CoordinatePair",
  "type": "object",
  "properties": {
    "pair": {
      "type": "array",
      "prefixItems": [{ "type": "integer" }, { "type": "string" }],
      "minItems": 2,
      "items": false
    }
  },
  "required": ["pair"]
}
```

## 4. Dynamic Key Objects As Records

Parser option:

```ts
{
  inference: {
    recordInferenceMode: "shared-value-type";
  }
}
```

JSON:

```json
{
  "en": true,
  "fr": false
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

## 5. Mixed Values As Union

Parser option:

```ts
{
  inference: {
    mixedTypeMode: "union";
  }
}
```

JSON:

```json
[
  {
    "value": 1
  },
  {
    "value": "x"
  }
]
```

Generated JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MixedValueUnion",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "value": {
        "oneOf": [{ "type": "integer" }, { "type": "string" }]
      }
    },
    "required": ["value"]
  }
}
```

## 6. Unknown Semantics

JSON:

```json
{
  "tags": []
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

The wide `true` schema is intentional:

- the IR still preserves why the element type became `unknown`
- the JSON Schema generator stays standards-compliant instead of inventing custom metadata
- diagnostics remain the right place to explain unresolved semantics

For a root-level `unknown`, the generator emits the widest schema as a metadata-only document such as:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UnknownValue"
}
```
