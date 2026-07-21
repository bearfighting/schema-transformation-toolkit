# TypeScript Parser Cases

This file defines the current support boundary for the TypeScript parser.

It is intentionally compact.
Use it to answer:

- what the parser supports today
- what it accepts through normalization
- what it rejects explicitly
- which unsupported areas are plausible future work versus intentional non-goals

Repository-level prioritization lives in [progress.md](progress.md).
Module-boundary and preprocess intent lives in [typescript-parser-preprocess.md](typescript-parser-preprocess.md).

## Boundary

The parser is intentionally a schema-oriented, single-file TypeScript subset.
It is not trying to model the whole TypeScript type system.

The current unsupported surface should be read in two buckets:

- plausible future work: conservative multi-file entry handling, import-aware resolution, selected utility types beyond `Record`, interface heritage, and carefully chosen broader type constructs if they still map cleanly to shared schema semantics
- current non-goals: classes as schema entries, value-level module behavior, method-like object members, computed property names, and general type-system computation

## Entry Contract

The parser expects one selected entry declaration.

Entry selection may happen:

- explicitly through `options.entry`
- implicitly when there is exactly one supported top-level declaration
- implicitly when there is exactly one supported exported declaration
- implicitly when the exported declaration graph has exactly one root
- implicitly when the local declaration graph has exactly one root
- conservatively through a `...Document` name tie-break when it matches exactly one ambiguous root candidate

The parser must stay conservative when root discovery is ambiguous.
It should not guess.

When ambiguity remains, `missing-typescript-entry` diagnostics should preserve:

- `rootCandidates`
- `exportedRootCandidates`
- `implicitEntryAmbiguityReason`

When the parser selects an entry implicitly, success should emit `typescript-implicit-entry-selected`.

## Supported Directly

The current parser accepts these source shapes directly:

- `type` aliases
- `interface` declarations
- supported `enum` declarations
- object type literals
- scalar keywords: `string`, `number`, `boolean`
- `null`
- optional properties
- unions
- literal unions
- arrays through `T[]` and `Array<T>`
- `ReadonlyArray<T>`
- tuples without rest elements
- `Record<string, T>`
- local named references
- single-file reachable reusable definitions

It also tolerates preprocess-level noise when it does not determine schema meaning:

- side-effect imports
- empty export markers
- re-export or export-all forwarding that does not affect a uniquely explainable local entry

## Accepted With Normalization

These cases succeed, but the original TypeScript surface form is not preserved exactly:

- `interface` and equivalent object `type` aliases lower into the same shared object semantics
- `readonly` field, array, and tuple syntax lowers into the same shared shape as writable forms
- enums lower into literal or literal-union semantics
- earlier supported enum-member references lower into their resolved literal values

The parser preserves data-shape truth, not declaration-form fidelity.

## Explicit Failures

The parser should fail explicitly instead of approximating these cases loosely.

### Entry And Module Boundary Failures

- missing explicit entry when no conservative implicit entry exists
- requested entry name does not exist
- entry exists only as a re-export
- entry would require `export *` resolution
- top-level module forms that block current single-file entry handling
- imported type references
- namespace-imported type references
- unsupported external references

### Unsupported Type-System Forms

- `interface extends`
- `intersection`
- `conditional`
- `mapped`
- function types
- utility-type computation outside current `Record<string, T>` support
- unsupported declaration kinds such as class entries

### Unsupported Type-Reference Shapes

- malformed `Array` or `ReadonlyArray` references
- non-string record keys such as `Record<number, T>`
- unsupported built-in or utility references

### Unsupported Member And Tuple Shapes

- tuple rest elements
- readonly tuple rest elements
- method-like object members
- computed property names
- missing property type annotations
- nested unsupported field syntax that would otherwise be silently widened

## Stable Behavior Examples

Use these as the representative contract:

- `type User = { id: number; name?: string | null }` succeeds
- `type Users = User[]` succeeds
- `type Pair = [number, string]` succeeds
- `type Status = "open" | "closed"` succeeds
- `enum Level { Low = 1, SameLow = Low, High = 3 }` succeeds
- `type Scores = Record<string, number>` succeeds
- `type Scores = Record<number, number>` fails
- `type User = Base & { id: number }` fails
- `type Handler = (value: string) => void` fails
- `import type { User } from "./models"; type Current = User;` fails

## Maintenance Rules

- keep this file at the level of boundary and representative examples
- do not turn it back into a numbered test catalog
- if parser behavior changes, update the support bucket or representative example rather than adding long prose
