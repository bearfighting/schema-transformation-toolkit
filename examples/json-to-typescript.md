# JSON To TypeScript Examples

These examples show the current behavior of the toolchain for:

- JSON parsing and schema inference
- schema IR as the intermediate representation
- TypeScript generation

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

Generated TypeScript:

```ts
export interface UserProfile {
  name: string;
  age: number;
  active: boolean;
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

Generated TypeScript:

```ts
export type UserList = Array<{
  id: number;
  name?: string | null;
}>;
```

## 3. Nested Objects

JSON:

```json
{
  "user": {
    "id": 1,
    "profile": {
      "display-name": "Ada"
    }
  }
}
```

Generated TypeScript:

```ts
export interface NestedUser {
  user: {
    id: number;
    profile: {
      displayName: string;
    };
  };
}
```

## 4. Empty Array Evidence

JSON:

```json
{
  "tags": []
}
```

Generated TypeScript:

```ts
export interface PartialShape {
  tags: unknown[];
}
```

## 5. Mixed Values As Union

Parser option:

```ts
{
  inference: {
    mixedTypeMode: "union"
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
  },
  {
    "value": null
  }
]
```

Generated TypeScript:

```ts
export type MixedFieldValues = Array<{
  value: string | number | null;
}>;
```

## 6. Heterogeneous Arrays As Tuples

Parser option:

```ts
{
  inference: {
    tupleInferenceMode: "heterogeneous-only"
  }
}
```

JSON:

```json
{
  "pair": [
    1,
    "north"
  ]
}
```

Generated TypeScript:

```ts
export interface CoordinatePair {
  pair: [number, string];
}
```

## 7. Optional Tuple Positions

Parser option:

```ts
{
  inference: {
    tupleInferenceMode: "heterogeneous-only"
  }
}
```

JSON:

```json
[
  [
    1,
    "east"
  ],
  [
    2
  ]
]
```

Generated TypeScript:

```ts
export type OptionalTupleArray = Array<[number, string?]>;
```

## 8. Tuple Position Union

Parser option:

```ts
{
  inference: {
    tupleInferenceMode: "heterogeneous-only"
  }
}
```

JSON:

```json
[
  [
    1,
    "east"
  ],
  [
    2,
    true
  ],
  [
    3,
    null
  ]
]
```

Generated TypeScript:

```ts
export type TupleUnionMembers = Array<[number, string | boolean | null]>;
```

## 9. Dynamic-Key Objects As Record

Parser option:

```ts
{
  inference: {
    recordInferenceMode: "shared-value-type"
  }
}
```

JSON:

```json
[
  {
    "en": "Hello",
    "fr": "Bonjour"
  },
  {
    "de": "Hallo",
    "es": "Hola"
  }
]
```

Generated TypeScript:

```ts
export type TranslationTable = Array<Record<string, string>>;
```

## 10. Nested Record Values

Parser option:

```ts
{
  inference: {
    recordInferenceMode: "shared-value-type"
  }
}
```

JSON:

```json
[
  {
    "users": {
      "a": {
        "id": 1
      },
      "b": {
        "id": 2
      }
    }
  },
  {
    "users": {
      "c": {
        "id": 3
      }
    }
  }
]
```

Generated TypeScript:

```ts
export type RecordFieldShape = Array<{
  users: Record<string, {
    id: number;
  }>;
}>;
```

## Notes

- object field names are normalized by the TypeScript generator naming strategy
- `null` and optional presence are different semantics
- tuple and record inference are opt-in and conservative
- literal nodes exist in the IR, but ordinary JSON scalar inference still widens by default
