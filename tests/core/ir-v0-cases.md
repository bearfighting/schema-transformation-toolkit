# Core IR v0 Test Cases

These cases define the first-pass scope for the schema AST/IR. The goal is to cover:

- primitive scalar nodes
- object and array nodes
- field presence semantics
- the separation between `optional` and `nullable`

## In Scope

- `string`
- `integer`
- `number`
- `boolean`
- `object`
- `array`
- `required`
- `optional`
- `nullable`

## Out of Scope For v0

- `enum`
- `union`
- `reference`
- `map`
- `tuple`
- inheritance or composition

## Minimal AST v0

The first-pass AST shape is intentionally small:

```ts
type ScalarKind = "string" | "integer" | "number" | "boolean";

interface ScalarTypeNode {
  kind: "scalar";
  scalar: ScalarKind;
}

interface FieldNode {
  kind: "field";
  name: string;
  required: boolean;
  nullable: boolean;
  type: TypeNode;
}

interface ObjectTypeNode {
  kind: "object";
  fields: FieldNode[];
}

interface ArrayTypeNode {
  kind: "array";
  elementType: TypeNode;
}

type TypeNode = ScalarTypeNode | ObjectTypeNode | ArrayTypeNode;

interface SchemaDocument {
  version: "0.1";
  kind: "document";
  name: string;
  root: TypeNode;
}
```

The tests in this phase should primarily assert `Expected AST`, not target-language code.

## JSON Inference Convention

For AST v0, valid JSON input falls into two groups:

1. Inferable input
   The parser can produce a stable AST node structure.
2. Non-inferable input
   The input is still valid JSON, but it does not produce a stable schema under AST v0.

This is especially important for arrays.

- Arrays must have a common inferable element type
- `integer` and `number` may merge into `number`
- Object elements may merge into one object type by turning missing fields into `optional`
- Explicit `null` may contribute `nullable`
- If array elements do not share a common inferable structure, the input is valid JSON but AST v0 must reject schema inference

## Cases

### 1. scalar-string

Source Sample:

```json
"hello"
```

Expected AST:

```ts
schemaDocument("ScalarString", scalarType("string"));
```

### 2. scalar-integer

Source Sample:

```json
42
```

Expected AST:

```ts
schemaDocument("ScalarInteger", scalarType("integer"));
```

### 3. scalar-number

Source Sample:

```json
3.14
```

Expected AST:

```ts
schemaDocument("ScalarNumber", scalarType("number"));
```

### 4. scalar-boolean

Source Sample:

```json
true
```

Expected AST:

```ts
schemaDocument("ScalarBoolean", scalarType("boolean"));
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

Expected AST Sketch:

```ts
schemaDocument(
  "SimpleObject",
  objectType([
    fieldNode("name", scalarType("string")),
    fieldNode("age", scalarType("integer")),
    fieldNode("active", scalarType("boolean")),
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

Expected AST Sketch:

```ts
schemaDocument(
  "NestedObject",
  objectType([
    fieldNode(
      "user",
      objectType([
        fieldNode("name", scalarType("string")),
        fieldNode("age", scalarType("integer")),
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

Expected AST Sketch:

```ts
schemaDocument("ArrayOfString", arrayType(scalarType("string")));
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

Expected AST Sketch:

```ts
schemaDocument(
  "ArrayOfObject",
  arrayType(
    objectType([
      fieldNode("id", scalarType("integer")),
      fieldNode("name", scalarType("string")),
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

Expected AST Sketch:

```ts
schemaDocument(
  "ObjectFieldOptional",
  arrayType(
    objectType([
      fieldNode("id", scalarType("integer")),
      fieldNode("name", scalarType("string"), { required: false }),
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

Expected AST Sketch:

```ts
schemaDocument(
  "ObjectFieldNullable",
  arrayType(
    objectType([
      fieldNode("id", scalarType("integer")),
      fieldNode("name", scalarType("string"), { nullable: true }),
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

Expected AST Sketch:

```ts
schemaDocument(
  "ObjectFieldOptionalAndNullable",
  arrayType(
    objectType([
      fieldNode("id", scalarType("integer")),
      fieldNode("name", scalarType("string"), {
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

Expected AST Sketch:

```ts
schemaDocument(
  "NestedOptionalField",
  arrayType(
    objectType([
      fieldNode(
        "user",
        objectType([
          fieldNode("id", scalarType("integer")),
          fieldNode("name", scalarType("string"), { required: false }),
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

Expected AST Note:

- explicit `null` must be tracked as nullable evidence
- missing and `null` must not collapse into one signal
- final inference strategy for a lone `null` sample can stay provisional in v0

### 14. mixed-scalar-array-is-valid-but-not-inferable

Source Sample:

```json
[1, "a"]
```

Expected AST Note:

- this is valid JSON
- this does not produce a stable schema in AST v0
- parser result should be `unsupported-mixed-types`

### 15. mixed-object-scalar-array-is-valid-but-not-inferable

Source Sample:

```json
[{ "id": 1 }, "a"]
```

Expected AST Note:

- this is valid JSON
- object and scalar elements do not share a common inferable type
- parser result should be `unsupported-mixed-types`

### 16. empty-array-is-valid-but-not-inferable

Source Sample:

```json
[]
```

Expected AST Note:

- this is valid JSON
- there is no element type evidence
- parser result should be a valid AST containing `array<unknown>`

### 17. standalone-null-is-valid-but-not-inferable

Source Sample:

```json
null
```

Expected AST Note:

- this is valid JSON
- a standalone `null` is preserved as unresolved semantics in AST v0
- parser result should be a valid AST containing `unknown | null`

## AST and Inference Rules Locked By These Cases

1. Missing field means `optional`.
2. Explicit `null` means `nullable`.
3. `optional` and `nullable` are independent flags.
4. `integer` and `number` stay separate.
5. A field is only `required` when it appears in every relevant sample.
6. The v0 AST only needs `scalar`, `object`, `array`, `field`, and `document`.
7. Valid JSON is not guaranteed to be inferable into a schema.
8. Arrays must have a common inferable element type.
