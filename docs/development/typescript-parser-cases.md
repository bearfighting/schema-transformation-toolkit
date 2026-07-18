# TypeScript Parser Cases

This file defines the first supported TypeScript parser subset as concrete success and failure cases.

The goal is not to parse the whole TypeScript type system.
The goal is to validate the shared schema IR against a second source language with a narrow, data-shape-oriented subset.

## Purpose

These cases should answer:

- which TypeScript constructs are in scope for the current parser subset
- which constructs must map directly into current schema IR semantics
- which constructs are accepted through normalization into shared shape semantics
- which constructs must fail explicitly instead of being approximated

## Result Contract

These cases should be interpreted under the repository-wide capability and semantic-loss contract.

That means:

- direct shared-shape mappings should succeed without semantic-loss diagnostics
- syntax-level normalization into the same shared shape meaning may succeed with diagnostics when that distinction is important to surface
- unsupported TypeScript type-system constructs should fail explicitly rather than being widened into misleading schema shapes

## Entry Assumption

The first parser version should parse one explicit entry declaration at a time.

Examples:

- `type User = { ... }`
- `interface User { ... }`

The first version should not guess a root declaration from a whole file automatically.

## Supported Success Cases

### 1. Simple Object Type Alias

Source:

```ts
type User = {
  id: number;
  name: string;
};
```

Expected schema IR shape:

- document root is a reference to `User`
- `User` is emitted as one definition
- object fields map to required schema fields

### 2. Interface Declaration

Source:

```ts
interface User {
  id: number;
  active: boolean;
}
```

Expected schema IR shape:

- interface is treated as a named reusable definition
- root references `User`

### 3. Optional Property

Source:

```ts
type User = {
  name?: string;
};
```

Expected schema IR shape:

- `name` maps to `required: false`
- optional presence remains distinct from `null`

### 4. Nullable Property Via Union

Source:

```ts
type User = {
  name: string | null;
};
```

Expected schema IR shape:

- `name` maps to a non-optional field
- field nullability is preserved distinctly from optionality

### 5. Array Type

Source:

```ts
type UserList = User[];
```

Expected schema IR shape:

- array maps to `SchemaArrayNode`
- element type may be a reference

### 6. Generic Array Type

Source:

```ts
type UserList = Array<User>;
```

Expected schema IR shape:

- same semantic result as `User[]`

### 7. Tuple Type

Source:

```ts
type Pair = [number, string];
```

Expected schema IR shape:

- tuple maps to `SchemaTupleNode`
- tuple positions stay ordered and required by default

### 8. Union Type

Source:

```ts
type Value = string | number;
```

Expected schema IR shape:

- union maps to `SchemaUnionNode`

### 9. Literal Union

Source:

```ts
type Status = "open" | "closed";
```

Expected schema IR shape:

- each literal maps to a literal node
- the result remains a union, not a widened string

### 10. Null Root

Source:

```ts
type OnlyNull = null;
```

Expected schema IR shape:

- root definition type is `SchemaNullNode`

### 11. Record Utility

Source:

```ts
type Messages = Record<string, string>;
```

Expected schema IR shape:

- maps to `SchemaRecordNode`
- record key remains the scalar type `string`

### 12. Named Reference Reuse

Source:

```ts
type User = {
  id: number;
};

type UserList = User[];
```

Expected schema IR shape:

- `User` becomes a reusable definition
- `UserList` references `User`

### 13. Enum Declaration

Source:

```ts
enum Status {
  Open = "open",
  Closed = "closed",
}
```

Expected schema IR shape:

- enum declarations map to literal or literal-union definitions
- root references the enum definition when it is the selected entry
- reachable enum references behave like other named reusable definitions

### 14. Enum Member References

Source:

```ts
enum Level {
  Low = 1,
  SameLow = Low,
  AlsoLow = Level.Low,
  High = 3,
}
```

Expected schema IR shape:

- references to earlier enum members are supported when they resolve to supported literal values
- duplicated literal outcomes may normalize away in the resulting union
- the parser should not require the TypeScript type checker for this narrow enum-reference support
- supported reference forms are currently the bare earlier member name and `EnumName.Member`
- general computed enum evaluation is intentionally out of scope

### 15. Readonly Syntax

Source:

```ts
interface User {
  readonly id: number;
  readonly tags: readonly string[];
  readonly pair: readonly [number, string?];
}
```

Expected schema IR shape:

- readonly modifiers do not add new shared IR semantics in v0
- readonly properties map to ordinary fields
- readonly arrays and tuples map to ordinary array and tuple nodes
- readonly syntax does not weaken existing unsupported boundaries such as tuple rest elements or malformed array-reference forms

## Supported With Normalization

These cases are still successful parser outcomes, but the source form should be understood as lowering into shared shape semantics rather than being preserved faithfully as TypeScript syntax.

### 16. Interface Versus Type Alias Shape Equivalence

Source:

```ts
interface User {
  id: number;
}
```

And:

```ts
type User = {
  id: number;
};
```

Expected schema IR shape:

- both forms lower into equivalent shared object-definition semantics
- parser success does not preserve the declaration-form distinction in shared IR

### 17. Readonly Field Normalization

Source:

```ts
interface User {
  readonly id: number;
}
```

Expected schema IR shape:

- readonly lowers into the same shared field semantics as a writable field
- parser success preserves data-shape truth, not mutability syntax

### 18. Enum Declaration Lowering

Source:

```ts
enum Status {
  Open = "open",
  Closed = "closed",
}
```

Expected schema IR shape:

- enum declarations lower into literal or literal-union semantics
- parser success does not preserve the distinction between an enum declaration and an equivalent literal union type alias

### 19. Enum Member Reference Resolution

Source:

```ts
enum Level {
  Low = 1,
  SameLow = Low,
  High = 3,
}
```

Expected schema IR shape:

- earlier-member references normalize into the resolved literal values
- duplicate literal outcomes may normalize away under shared union equivalence rules

## Explicit Failure Matrix

These cases should fail with structured parser diagnostics rather than being approximated loosely.
The matrix is grouped by the parser surface that should report the failure, so tests can lock both the stable error code and the expected diagnostic path granularity.

### Entry Contract Failures

#### 20. Missing Explicit Entry

Source:

```ts
type User = {
  id: number;
};
```

Expected result:

- parser failure
- failure code should be `missing-typescript-entry`
- diagnostic path should point to `["entry"]`

#### 21. Missing Entry Declaration

Source:

```ts
type User = {
  id: number;
};
```

Requested entry:

- `Account`

Expected result:

- parser failure
- failure code should be `missing-typescript-entry-declaration`
- diagnostic path should point to `["entry", "Account"]`

### Definition-Level Unsupported Syntax

#### 22. Unsupported Enum Member Initializer

Source:

```ts
enum Status {
  Open = "open",
  Closed = OPEN_STATUS,
}
```

Expected result:

- parser failure
- failure code should be `unsupported-typescript-enum-member-initializer`
- enum initializers outside literal, implicit-numeric, or earlier-member-reference forms should fail explicitly
- arithmetic, bitwise, concatenated, or other computed enum expressions should not be evaluated by the parser

#### 23. Implicit Enum Value After Non-Numeric Member

Source:

```ts
enum Status {
  Open = "open",
  Closed,
}
```

Expected result:

- parser failure
- failure code should be `unsupported-typescript-enum-member-initializer`
- implicit enum values should only work at the start of an enum or after numeric-valued members

#### 20. Interface Extends Clause

Source:

```ts
interface User extends Base {
  id: number;
}

interface Base {
  name: string;
}
```

Expected result:

- parser failure
- failure code should be `unsupported-typescript-interface-heritage`
- the parser should not silently drop inherited fields
- diagnostic evidence should preserve the explicit `extends` clause text

#### 21. Conditional Type

Source:

```ts
type Value<T> = T extends string ? string : number;
```

Expected result:

- parser failure
- failure code should be stable and specific to conditional types
- failure should explain that conditional types are outside the supported schema subset

#### 22. Mapped Type

Source:

```ts
type Box<T> = {
  [K in keyof T]: T[K];
};
```

Expected result:

- parser failure
- failure code should be stable and specific to mapped types
- mapped types are outside the supported schema subset

#### 23. Function Type

Source:

```ts
type Handler = (value: string) => void;
```

Expected result:

- parser failure
- failure code should be stable and specific to function types
- function types are outside the supported schema subset

#### 24. Intersection Type

Source:

```ts
type User = Base & {
  id: number;
};
```

Expected result:

- parser failure for v0 unless a later explicit decision expands the IR
- failure code should be stable and specific to intersection types

#### 25. Generic Unsupported Syntax Kind

Source:

```ts
type Token = symbol;
```

Expected result:

- parser failure
- failure code should fall back to `unsupported-typescript-syntax`
- definition-level diagnostics should point to `["definitions", "Token"]`

### Type Reference Failures

#### 26. Unsupported Named Entry Declaration Kind

Source:

```ts
class User implements Serializable {}
```

Requested entry:

- `User`

Expected result:

- parser failure
- failure code should be `unsupported-typescript-entry-declaration-kind`
- the failure should explain that a declaration with the requested name exists, but the declaration kind is outside the supported entry subset
- diagnostic evidence should preserve the declaration kind and declaration text

#### 27. Re-Exported Entry

Source:

```ts
export { User } from "./models";
```

Requested entry:

- `User`

Expected result:

- parser failure
- failure code should be `unsupported-typescript-reexported-entry`
- the failure should explain that the requested entry exists only as a re-export
- diagnostic evidence should preserve the module specifier and export-forwarding text

#### 28. Malformed ReadonlyArray Type Reference

Source:

```ts
type Values = ReadonlyArray;
```

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-type-reference`
- readonly array syntax should preserve the same array-shape contract as `Array<T>`

#### 29. Non-String Record Key

Source:

```ts
type Scores = Record<number, string>;
```

Expected result:

- parser failure
- failure code should be stable and specific to non-string record keys
- current schema IR record keys are intentionally constrained to string

#### 30. Type-Level Utility Outside Record

Source:

```ts
type UserPreview = Pick<User, "id">;
```

Expected result:

- parser failure
- utility-type computation is outside the supported subset

#### 31. Imported Type Reference

Source:

```ts
import type { ExternalUser } from "./models";

type User = ExternalUser;
```

Expected result:

- parser failure
- failure code should be `unsupported-typescript-imported-type-reference`
- the failure should explain that the parser would need cross-file resolution
- diagnostic evidence should preserve both the imported name and module specifier

#### 32. Namespace-Imported Type Reference

Source:

```ts
import * as Models from "./models";

type User = Models.ExternalUser;
```

Expected result:

- parser failure
- failure code should be `unsupported-typescript-namespace-import-reference`
- the failure should explain that namespace-imported references need cross-file resolution
- diagnostic evidence should preserve the namespace alias and full qualified reference

#### 33. Malformed Built-In Type Reference

Source:

```ts
type Values = Array;
```

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-type-reference`
- diagnostics should preserve the malformed built-in text in evidence

#### 34. Unsupported External Type Reference

Source:

```ts
type User = ExternalUser;
```

Expected result:

- parser failure
- failure code should be stable and specific to unsupported type references

### Tuple Failures

#### 35. Readonly Tuple Rest Element

Source:

```ts
type Pair = readonly [number, ...string[]];
```

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-tuple-rest-element`
- readonly tuple syntax should not weaken the current tuple-rest boundary

#### 36. Tuple Rest Element

Source:

```ts
type Pair = [number, ...string[]];
```

Expected result:

- parser failure
- failure code should be stable and specific to tuple rest elements

### Type Member And Field Failures

#### 37. Unsupported Object Type Member

Source:

```ts
type User = {
  format(value: string): string;
};
```

Expected result:

- parser failure
- failure code should be `unsupported-typescript-type-member`
- diagnostic node kind should identify a type member failure

#### 38. Computed Property Name

Source:

```ts
type User = {
  [name]: string;
};
```

Expected result:

- parser failure
- failure code should be stable and specific to unsupported property-name forms

#### 39. Missing Property Type Annotation

Source:

```ts
type User = {
  name;
};
```

Expected result:

- parser failure
- failure code should be stable and specific to missing property type annotations

#### 40. Nested Unsupported Field Syntax

Source:

```ts
type User = {
  token: symbol;
};
```

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-syntax`
- diagnostic path should point to `["definitions", "User", "token"]` rather than only the enclosing definition

## First End-To-End Slice

The first implementation slice should prove the full path for one minimal declaration:

```ts
type User = {
  id: number;
  name?: string | null;
};
```

Expected workflow:

1. parse the named declaration
2. emit one schema document with one reusable definition
3. validate with `tryValidateSchemaDocument`
4. render through the existing TypeScript generator
5. confirm semantic round-trip alignment

## Guardrails

- do not widen literal unions to broad scalar types unless the parser is explicitly configured to do so in the future
- do not invent schema semantics that are not already present in `core`
- do not silently flatten unsupported TypeScript features into approximate object types
- do not require the TypeScript type checker for the first parser slice if syntax-level parsing is enough
