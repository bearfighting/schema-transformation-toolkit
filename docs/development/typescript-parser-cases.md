# TypeScript Parser Cases

This file defines the first supported TypeScript parser subset as concrete success and failure cases.

The goal is not to parse the whole TypeScript type system.
The goal is to validate the shared schema IR against a second source language with a narrow, data-shape-oriented subset.

This file is the concrete case catalog, not a repository status page or execution checklist.

- repository-level prioritization lives in [progress.md](progress.md)
- TypeScript-parser task tracking lives in [typescript-parser-checklist.md](typescript-parser-checklist.md)
- preprocess and module-boundary intent lives in [typescript-parser-preprocess.md](typescript-parser-preprocess.md)

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

## Boundary Classification

The current unsupported surface should be read in two buckets:

- not yet supported but still plausible future parser work: conservative multi-file entry handling, import-aware resolution, selected utility types beyond `Record`, interface heritage, and carefully chosen type-system forms such as `intersection`, `conditional`, or `mapped` types if they prove to fit the shared schema subset cleanly
- intentionally outside the current project boundary unless shared IR goals change materially: classes as schema entries, value-level module statements, method-like object members, computed property names, and general syntax forms that do not describe portable data-shape semantics directly

This split exists to keep parser work focused on entry handling, preprocess clarity, and richer single-file support before broader type-system ambition.

## Entry Assumption

The current parser should parse one selected entry declaration at a time.

Entry selection may happen in these ways:

- explicitly through `options.entry`
- implicitly when the file contains exactly one supported top-level declaration
- implicitly when the file contains exactly one exported supported top-level declaration
- implicitly when exported supported declarations still collapse to exactly one root declaration
- implicitly when the local supported declaration graph has exactly one root declaration
- implicitly when a custom `...Document` name matches exactly one otherwise ambiguous root candidate

Examples:

- `type User = { ... }`
- `interface User { ... }`

The parser should stay conservative when root discovery is ambiguous.
It should not guess a root declaration automatically when multiple supported top-level declarations remain independent or when the local declaration graph has no unique root.
When that ambiguity happens, `missing-typescript-entry` diagnostics should preserve `rootCandidates`, `exportedRootCandidates`, and `implicitEntryAmbiguityReason` in evidence so callers can inspect what the parser considered, including cycle-only cases where no declaration root exists.
Document-name tie-breaking should remain narrow: it may resolve ambiguity only when the derived preferred entry matches exactly one existing local or exported root candidate, and it should not weaken the original ambiguity classification when no such match exists.
When the parser does select an entry implicitly, successful results should emit a `typescript-implicit-entry-selected` semantic note with the corresponding selection rule in evidence.

Top-level statements that do not change reachable schema meaning may still be ignored.

## Current Near-Term Slice

The most valuable near-term parser slice is still conservative single-file entry improvement rather than broader type-system coverage.

That means:

- extend automatic root discovery only where the declaration graph still yields one unique, explainable candidate
- keep implicit-entry ambiguity evidence stable and inspectable
- improve preprocess-facing diagnostics and reporting before crossing into multi-file resolution
- treat broader type-system support as follow-on work after those boundaries stay clear

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

### 3. Ignorable Top-Level Module Statements

Source:

```ts
import "./polyfills";
export {};
interface User {
  id: number;
}
```

Expected schema IR shape:

- side-effect imports and empty export markers do not block parsing on their own
- the only supported local declaration may still be selected as the entry
- these statements are treated as preprocess-level noise rather than schema meaning

Variants that should remain ignorable when they do not determine the chosen entry:

```ts
export { ExternalUser } from "./models";
interface User {
  id: number;
}
```

```ts
export * from "./models";
interface User {
  id: number;
}
```

Expected schema IR shape for these variants:

- re-export and export-all forwarding should not override a uniquely explainable local declaration
- the parser should keep treating those module-boundary statements as noise when local entry selection is already conservative and complete

When local entry selection is still ambiguous, those forwarding forms should also remain noise rather than hidden tie-breakers:

- they should not upgrade multiple local root candidates into an implicit entry choice
- the parser should keep reporting the original local ambiguity until an explicit or conservatively derived entry is available

### 4. Exported Entry Discovery With Local Helpers

Source:

```ts
type InternalUser = {
  id: number;
};

export type UserList = InternalUser[];
```

Expected schema IR shape:

- the only exported supported declaration may be selected as the entry
- non-exported local helper declarations may still be kept as reachable definitions
- entry discovery should stay conservative and should not guess when multiple exported supported declarations exist

### 5. Unique Local Declaration Root Discovery

Source:

```ts
type Identifier = number;
type User = { id: Identifier };
type UserList = User[];
```

Expected schema IR shape:

- the parser may select `UserList` as the implicit entry
- helper declarations may remain local and non-exported
- automatic entry discovery stays valid because exactly one supported declaration is not referenced by any other supported local declaration

### 6. Unique Exported Declaration Root Discovery

Source:

```ts
type InternalToken = string;
export type User = { token: InternalToken };
export type UserList = User[];
```

Expected schema IR shape:

- the parser may select `UserList` as the implicit entry
- exported helper declarations may still participate in the same local declaration chain
- unrelated local non-exported helpers do not prevent entry discovery when the exported declaration graph still has exactly one root

### 7. Unique Local Root After Exported Cycle

Source:

```ts
export type User = Account;
export type Account = User;
type Directory = User[];
```

Expected schema IR shape:

- exported declarations alone do not yield a unique exported root because they only reference each other
- the parser may still select `Directory` as the implicit entry when the full local declaration graph has exactly one root
- this should remain a `single-root` decision rather than an exported-root decision

### 8. Document-Name Tie-Break For Exported Root Ambiguity

Source:

```ts
export type User = { id: number };
export type Account = { name: string };
```

Expected schema IR shape:

- multiple exported supported roots still remain ambiguous without an explicit or derived preference
- a custom document name such as `UserDocument` may still select `User` conservatively
- this should remain a `document-name-match` decision rather than a broader exported-root heuristic

### 9. Optional Property

Source:

```ts
type User = {
  name?: string;
};
```

Expected schema IR shape:

- `name` maps to `required: false`
- optional presence remains distinct from `null`

### 10. Nullable Property Via Union

Source:

```ts
type User = {
  name: string | null;
};
```

Expected schema IR shape:

- `name` maps to a non-optional field
- field nullability is preserved distinctly from optionality

### 11. Array Type

Source:

```ts
type UserList = User[];
```

Expected schema IR shape:

- array maps to `SchemaArrayNode`
- element type may be a reference

### 12. Generic Array Type

Source:

```ts
type UserList = Array<User>;
```

Expected schema IR shape:

- same semantic result as `User[]`

### 13. Tuple Type

Source:

```ts
type Pair = [number, string];
```

Expected schema IR shape:

- tuple maps to `SchemaTupleNode`
- tuple positions stay ordered and required by default

### 14. Union Type

Source:

```ts
type Value = string | number;
```

Expected schema IR shape:

- union maps to `SchemaUnionNode`

### 15. Literal Union

Source:

```ts
type Status = "open" | "closed";
```

Expected schema IR shape:

- each literal maps to a literal node
- the result remains a union, not a widened string

### 16. Null Root

Source:

```ts
type OnlyNull = null;
```

Expected schema IR shape:

- root definition type is `SchemaNullNode`

### 13. Record Utility

Source:

```ts
type Messages = Record<string, string>;
```

Expected schema IR shape:

- maps to `SchemaRecordNode`
- record key remains the scalar type `string`

### 14. Named Reference Reuse

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

### 15. Enum Declaration

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

### 16. Enum Member References

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

### 17. Readonly Syntax

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

### 18. Interface Versus Type Alias Shape Equivalence

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

### 19. Readonly Field Normalization

Source:

```ts
interface User {
  readonly id: number;
}
```

Expected schema IR shape:

- readonly lowers into the same shared field semantics as a writable field
- parser success preserves data-shape truth, not mutability syntax

### 20. Enum Declaration Lowering

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

### 21. Enum Member Reference Resolution

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

## Maintenance Rule

- keep this file focused on representative success and failure examples
- do not repeat repository-level status or near-term work prioritization here
- prefer adding or adjusting cases when parser behavior changes, rather than expanding prose elsewhere

### Entry Contract Failures

#### 22. Missing Explicit Entry

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
- multiple exported supported declarations should remain ambiguous rather than being guessed automatically

#### 23. Missing Entry Declaration

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

#### 24. Unsupported Enum Member Initializer

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

#### 25. Implicit Enum Value After Non-Numeric Member

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

#### 26. Interface Extends Clause

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

#### 27. Conditional Type

Source:

```ts
type Value<T> = T extends string ? string : number;
```

Expected result:

- parser failure
- failure code should be stable and specific to conditional types
- failure should explain that conditional types are outside the supported schema subset

#### 28. Mapped Type

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

#### 29. Function Type

Source:

```ts
type Handler = (value: string) => void;
```

Expected result:

- parser failure
- failure code should be stable and specific to function types
- function types are outside the supported schema subset

#### 30. Intersection Type

Source:

```ts
type User = Base & {
  id: number;
};
```

Expected result:

- parser failure for v0 unless a later explicit decision expands the IR
- failure code should be stable and specific to intersection types

#### 31. Generic Unsupported Syntax Kind

Source:

```ts
type Token = symbol;
```

Expected result:

- parser failure
- failure code should fall back to `unsupported-typescript-syntax`
- definition-level diagnostics should point to `["definitions", "Token"]`

### Type Reference Failures

#### 32. Unsupported Named Entry Declaration Kind

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

#### 33. Re-Exported Entry

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

Variant that should behave the same way:

```ts
export * as Models from "./models";
```

Requested entry:

- `Models`

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-reexported-entry`
- diagnostic evidence should preserve the forwarded module specifier and namespace-export text

#### 34. Export-All Forwarded Entry

Source:

```ts
export * from "./models";
```

Requested entry:

- `User`

Expected result:

- parser failure
- failure code should be `unsupported-typescript-export-all-entry`
- the failure should explain that current single-file parsing cannot resolve whether the requested entry is forwarded through export-all statements
- diagnostic evidence should preserve the forwarded module specifier and export-forwarding text

#### 35. Blocking Top-Level Module Statement

Source:

```ts
export default {};
```

Requested entry:

- `User`

Expected result:

- parser failure
- failure code should be `unsupported-typescript-top-level-module-statement`
- the failure should explain that module-level forms such as export assignments or ambient module blocks are outside the current single-file schema subset when entry resolution depends on them
- diagnostic evidence should preserve the statement kind and original source text

Variants that should follow the same preprocess boundary:

```ts
export = createSchema;
declare module "pkg" {}
```

#### 36. Malformed ReadonlyArray Type Reference

Source:

```ts
type Values = ReadonlyArray;
```

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-type-reference`
- readonly array syntax should preserve the same array-shape contract as `Array<T>`

#### 37. Non-String Record Key

Source:

```ts
type Scores = Record<number, string>;
```

Expected result:

- parser failure
- failure code should be stable and specific to non-string record keys
- current schema IR record keys are intentionally constrained to string

#### 38. Type-Level Utility Outside Record

Source:

```ts
type UserPreview = Pick<User, "id">;
```

Expected result:

- parser failure
- utility-type computation is outside the supported subset

#### 39. Imported Type Reference

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

#### 40. Namespace-Imported Type Reference

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

#### 41. Malformed Built-In Type Reference

Source:

```ts
type Values = Array;
```

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-type-reference`
- diagnostics should preserve the malformed built-in text in evidence

#### 42. Unsupported External Type Reference

Source:

```ts
type User = ExternalUser;
```

Expected result:

- parser failure
- failure code should be stable and specific to unsupported type references

### Tuple Failures

#### 43. Readonly Tuple Rest Element

Source:

```ts
type Pair = readonly [number, ...string[]];
```

Expected result:

- parser failure
- failure code should remain `unsupported-typescript-tuple-rest-element`
- readonly tuple syntax should not weaken the current tuple-rest boundary

#### 44. Tuple Rest Element

Source:

```ts
type Pair = [number, ...string[]];
```

Expected result:

- parser failure
- failure code should be stable and specific to tuple rest elements

### Type Member And Field Failures

#### 45. Unsupported Object Type Member

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

#### 46. Computed Property Name

Source:

```ts
type User = {
  [name]: string;
};
```

Expected result:

- parser failure
- failure code should be stable and specific to unsupported property-name forms

#### 47. Missing Property Type Annotation

Source:

```ts
type User = {
  name;
};
```

Expected result:

- parser failure
- failure code should be stable and specific to missing property type annotations

#### 48. Nested Unsupported Field Syntax

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
