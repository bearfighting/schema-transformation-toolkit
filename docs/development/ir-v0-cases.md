# Core IR Working Cases

This file is a test-oriented reference for the currently supported schema IR surface.

The goal is to keep concrete examples close to the semantics we actively support and validate.

## Current Scope

- primitive scalar nodes
- object and array nodes
- field presence semantics
- the separation between `optional` and `nullable`
- explicit `null`
- union
- tuple
- record or map

## Current Schema Sketch

The IR is no longer limited to the original minimal object-and-array-only shape.

Representative node kinds now include:

```ts
type SchemaNode =
  | SchemaScalarNode
  | SchemaLiteralNode
  | SchemaUnionNode
  | SchemaTupleNode
  | SchemaRecordNode
  | SchemaNullNode
  | SchemaUnknownNode
  | SchemaObjectNode
  | SchemaArrayNode;
```

The tests in this phase should still primarily assert expected IR semantics rather than target-language code, even when generator tests exist elsewhere.

## JSON Inference Convention

Current JSON inference falls into two groups:

1. Inferable input
   The parser can produce a stable schema IR structure.
2. Unsupported input
   The input is valid JSON, but it does not currently produce a stable schema under the active inference rules.

Important rules:

- arrays infer as homogeneous arrays when a shared element type exists
- arrays may infer as tuples when tuple inference is explicitly enabled
- object samples may infer as records when record inference is explicitly enabled and the conservative heuristic succeeds
- `integer` and `number` may merge into `number`
- object elements may merge into one object type by turning missing fields into `optional`
- explicit `null` is distinct from missing presence
- unsupported cases should fail explicitly

## Cases

### 1. scalar-string

Source Sample:

```json
"hello"
```

Expected Schema IR:

```ts
schemaDocument("ScalarString", schemaScalarNode("string"));
```

### 2. scalar-integer

Source Sample:

```json
42
```

Expected Schema IR:

```ts
schemaDocument("ScalarInteger", schemaScalarNode("integer"));
```

### 3. scalar-number

Source Sample:

```json
3.14
```

Expected Schema IR:

```ts
schemaDocument("ScalarNumber", schemaScalarNode("number"));
```

### 4. scalar-boolean

Source Sample:

```json
true
```

Expected Schema IR:

```ts
schemaDocument("ScalarBoolean", schemaScalarNode("boolean"));
```

### 5. simple-object

Source Sample:

```json
{
  "name": "Ada",
  "age": 32,
  "active": true
}
```

Expected Schema IR Sketch:

```ts
schemaDocument(
  "SimpleObject",
  schemaObjectNode([
    schemaFieldNode("name", schemaScalarNode("string")),
    schemaFieldNode("age", schemaScalarNode("integer")),
    schemaFieldNode("active", schemaScalarNode("boolean")),
  ]),
);
```

### 6. nested-object

Source Sample:

```json
{
  "user": {
    "name": "Ada",
    "age": 32
  }
}
```

Expected Schema IR Sketch:

```ts
schemaDocument(
  "NestedObject",
  schemaObjectNode([
    schemaFieldNode(
      "user",
      schemaObjectNode([
        schemaFieldNode("name", schemaScalarNode("string")),
        schemaFieldNode("age", schemaScalarNode("integer")),
      ]),
    ),
  ]),
);
```

### 7. array-of-string

Source Sample:

```json
["a", "b", "c"]
```

Expected Schema IR Sketch:

```ts
schemaDocument("ArrayOfString", schemaArrayNode(schemaScalarNode("string")));
```

### 8. array-of-object

Source Sample:

```json
[
  {
    "id": 1,
    "name": "Ada"
  },
  {
    "id": 2,
    "name": "Linus"
  }
]
```

Expected Schema IR Sketch:

```ts
schemaDocument(
  "ArrayOfObject",
  schemaArrayNode(
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer")),
      schemaFieldNode("name", schemaScalarNode("string")),
    ]),
  ),
);
```

### 9. object-field-optional

Source Sample:

```json
[
  {
    "id": 1,
    "name": "Ada"
  },
  {
    "id": 2
  }
]
```

Expected Schema IR Sketch:

```ts
schemaDocument(
  "ObjectFieldOptional",
  schemaArrayNode(
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer")),
      schemaFieldNode("name", schemaScalarNode("string"), { required: false }),
    ]),
  ),
);
```

### 10. object-field-nullable

Source Sample:

```json
[
  {
    "id": 1,
    "name": "Ada"
  },
  {
    "id": 2,
    "name": null
  }
]
```

Expected Schema IR Sketch:

```ts
schemaDocument(
  "ObjectFieldNullable",
  schemaArrayNode(
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer")),
      schemaFieldNode("name", schemaScalarNode("string"), { nullable: true }),
    ]),
  ),
);
```

### 11. object-field-optional-and-nullable

Source Sample:

```json
[
  {
    "id": 1,
    "name": "Ada"
  },
  {
    "id": 2
  },
  {
    "id": 3,
    "name": null
  }
]
```

Expected Schema IR Sketch:

```ts
schemaDocument(
  "ObjectFieldOptionalAndNullable",
  schemaArrayNode(
    schemaObjectNode([
      schemaFieldNode("id", schemaScalarNode("integer")),
      schemaFieldNode("name", schemaScalarNode("string"), {
        required: false,
        nullable: true,
      }),
    ]),
  ),
);
```

### 12. nested-optional-field

Source Sample:

```json
[
  {
    "user": {
      "id": 1,
      "name": "Ada"
    }
  },
  {
    "user": {
      "id": 2
    }
  }
]
```

Expected Schema IR Sketch:

```ts
schemaDocument(
  "NestedOptionalField",
  schemaArrayNode(
    schemaObjectNode([
      schemaFieldNode(
        "user",
        schemaObjectNode([
          schemaFieldNode("id", schemaScalarNode("integer")),
          schemaFieldNode("name", schemaScalarNode("string"), {
            required: false,
          }),
        ]),
      ),
    ]),
  ),
);
```

### 13. explicit-null-without-other-sample

Source Sample:

```json
{
  "name": null
}
```

Expected Schema IR Note:

- explicit `null` must be tracked as nullable evidence
- missing and `null` must not collapse into one signal
- final inference strategy for a lone `null` sample can stay provisional in v0

### 14. mixed-scalar-array-is-valid-but-not-inferable

Source Sample:

```json
[1, "a"]
```

Expected Schema IR Note:

- this is valid JSON
- this does not produce a stable schema in schema IR v0
- parser result should be `unsupported-mixed-types`

### 15. mixed-object-scalar-array-is-valid-but-not-inferable

Source Sample:

```json
[{ "id": 1 }, "a"]
```

Expected Schema IR Note:

- this is valid JSON
- object and scalar elements do not share a common inferable type
- parser result should be `unsupported-mixed-types`

### 16. empty-array-is-valid-but-not-inferable

Source Sample:

```json
[]
```

Expected Schema IR Note:

- this is valid JSON
- there is no element type evidence
- parser result should be a valid schema IR containing `array<unknown>`

### 17. standalone-null-is-valid-but-not-inferable

Source Sample:

```json
null
```

Expected Schema IR Note:

- this is valid JSON
- a standalone `null` is preserved as unresolved semantics in schema IR v0
- parser result should be a valid schema IR containing `unknown | null`

## Schema IR and Inference Rules Locked By These Cases

1. Missing field means `optional`.
2. Explicit `null` means `nullable`.
3. `optional` and `nullable` are independent flags.
4. `integer` and `number` stay separate.
5. A field is only `required` when it appears in every relevant sample.
6. The v0 schema IR only needs `scalar`, `object`, `array`, `field`, and `document`.
7. Valid JSON is not guaranteed to be inferable into a schema.
8. Arrays must have a common inferable element type.
