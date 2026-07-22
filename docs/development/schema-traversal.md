# Schema IR Traversal Design

This document defines the first implemented shared `Shape IR` traversal helper and the design constraints that should continue to govern it.

It is meant to guide follow-on iteration now that the first refactor has landed.
It should stay smaller than a framework spec and more concrete than a vague direction note.

## Implementation Status

The first traversal extraction is now implemented in `@aio/core`.

The current helper is already used by:

- `packages/core/src/schema/validation.ts`
- `packages/generators/typescript/src/diagnostics.ts`
- `packages/generators/typescript/src/validate.ts`
- `packages/generators/json-schema/src/diagnostics.ts`
- `packages/generators/json-schema/src/validate.ts`

The remaining purpose of this document is to preserve the intent and boundaries of that helper as future work builds on it.

## Original Goal

The first implementation goal was:

- extract a lightweight shared traversal layer for `SchemaDocument` and `SchemaNode`
- remove repeated recursion mechanics from analysis-style consumers
- preserve current diagnostic, semantic-note, and validation behavior while doing so
- leave room for later `Shape IR` evolution without freezing a too-broad public contract

This is not a plan to introduce a heavy visitor framework.

## Why It Was Worth Doing

The repository already has enough passing tests to protect a structural refactor:

- shared semantic fixtures
- generator contract tests
- cross-parser equivalence smoke
- route integration smoke
- real-world corpus coverage

At the time of extraction, repeated traversal logic was already showing up in multiple places:

- `packages/generators/typescript/src/diagnostics.ts`
- `packages/generators/typescript/src/validate.ts`
- `packages/generators/json-schema/src/diagnostics.ts`
- `packages/generators/json-schema/src/validate.ts`
- `packages/core/src/schema/validation.ts`

The main duplication is not target semantics.
It is repeated mechanics:

- recurse through the same node kinds
- carry stable logical paths
- resolve local references when needed
- avoid accidental infinite recursion
- keep path and reference behavior consistent across passes

## Scope Of The First Refactor

The first traversal extraction was intentionally limited to analysis-style consumers.

That means:

- diagnostics collection
- semantic-note collection
- renderability validation
- schema document integrity checks
- small future read-only inspections such as counting or indexing passes

It intentionally did not first target:

- emitters
- formatting-sensitive rendering
- parser internals
- a full transform or rewrite framework

## Current Repeated Patterns

The current diagnostics and validation passes repeatedly implement the same descent rules:

- `array -> elementType`
- `tuple -> elements[index].type`
- `record -> key` and `value`
- `object -> fields[index].type`
- `union -> members[index]`
- `reference -> optional local definition lookup`

They also try to carry the same logical path semantics, but the current code is not fully aligned.

At extraction time we already had a path mismatch:

- generator passes usually use tuple or union member paths like `["root", "0"]`
- core schema validation still uses `["root", "elements", "0"]` and `["root", "members", "0"]`

That mismatch was small enough to fix during extraction and dangerous enough that it should not be copied into a shared helper accidentally.

## Design Principles

The traversal layer should follow these rules:

1. keep traversal mechanics shared, keep semantics local
2. normalize the logical path contract explicitly instead of inheriting accidental differences
3. make reference expansion explicit rather than automatic
4. stay read-only in the first version
5. prefer small callback-based helpers over class hierarchies
6. support partial adoption one consumer at a time
7. design for `Shape IR` first, not for all future IR layers at once
8. keep the first implementation small enough that later iteration is cheap

## API Boundary

The first helper should live in `@aio/core`, but it should not be treated as a permanently frozen top-level SDK contract on day one.

The boundary should be:

- shared enough that parser, generator, and core analysis code can use it
- narrow enough that `Shape IR v0` can still evolve
- documented enough that path and reference behavior stay intentional

Practical guidance:

- export the helper from the schema layer in `@aio/core`
- treat the first version as a focused shared core utility, not as a broad framework promise
- avoid coupling `sdk` route or report abstractions directly to traversal internals

## First-Pass API Shape

The first useful abstraction should separate:

- one helper that owns document setup and traversal state
- one visitor contract for read-only node inspection
- one explicit reference-resolution policy

Recommended surface:

```ts
walkSchemaDocument(document, visitor, options?)
walkSchemaNode(node, context, visitor)
```

The exact names were allowed to change during implementation, but the responsibilities should stay distinct:

- `walkSchemaDocument(...)` builds definition lookup, enters root and definitions, and manages traversal state
- `walkSchemaNode(...)` handles mechanical descent from a known node context
- `options` control reference handling and traversal entry behavior

The first version was expected to support:

- document root traversal
- definition traversal
- stable logical path propagation
- access to document-level definition lookup
- optional local reference resolution
- cycle-safe traversal state
- pre-order callbacks

It does not need post-order hooks, mutation hooks, or rewrite semantics.

## Context Shape

The callback context should be small and explicit.
It should expose only data that repeated consumers are already reconstructing.

```ts
interface SchemaWalkContext {
  document: SchemaDocument;
  node: SchemaNode;
  path: string[];
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  parent?: SchemaNode;
  containingDefinition?: SchemaDefinition;
  via?:
    | { kind: "root" }
    | { kind: "definition"; definitionName: string }
    | { kind: "elementType" }
    | { kind: "tupleElement"; index: number }
    | { kind: "recordKey" }
    | { kind: "recordValue" }
    | { kind: "field"; fieldName: string }
    | { kind: "unionMember"; index: number }
    | { kind: "referenceResolution"; referenceName: string };
}
```

Notes:

- `path` is the primary contract for diagnostics and semantic notes
- `via` is metadata for consumers that need structured edge information without reparsing `path`
- `containingDefinition` is more useful than a generic `definition` field name because it states what the value means

## Visitor Contract

The first version intentionally prefers one small callback contract instead of a large per-kind visitor interface.

Recommended shape:

```ts
interface SchemaWalkVisitor {
  enter?(context: SchemaWalkContext): void;
}
```

This is intentionally minimal.
The early consumers only need read-only pre-order inspection.

The first version should not include:

- one method per node kind
- `exit` hooks
- traversal cancellation rules unless a concrete consumer needs them
- mutation return values

If early adoption later shows a real need for `exit` or short-circuiting, that can be added in a second pass without changing the core read-only model.

## Reference Policy

Reference behavior must be explicit.
Different passes need different truths.

The helper should not silently inline references by default.

That matters because:

- diagnostics may care about both the reference site and the resolved semantic
- validation may only need to confirm that a reference resolves
- future emitters may want to keep references as references

The current version supports a policy object conceptually equivalent to:

```ts
interface SchemaWalkOptions {
  references?: "preserve" | "follow";
}
```

Behavior:

- `"preserve"` visits reference nodes as reference nodes and does not descend into resolved definitions
- `"follow"` visits the reference node and then optionally visits the resolved definition through a separate `referenceResolution` edge

Cycle behavior:

- the walker must guard against repeated reference expansion cycles
- the guard should apply only to reference following, not to ordinary structural descent
- cycles should be prevented mechanically, not delegated to each consumer

The current version still does not need broader resolution policies such as cross-document references or user-supplied resolvers.

## Path Contract

One major reason to centralize traversal is to freeze path behavior.

The first traversal helper now defines one canonical logical path contract:

- root starts at `["root"]`
- definitions start at `["definitions", definition.name.source]`
- array descent appends `"elementType"`
- tuple descent appends the member index as a string
- union descent appends the member index as a string
- object descent appends `field.name.source`
- record descent appends `"key"` or `"value"`
- reference nodes keep the current path of the reference site
- reference following does not rewrite the original reference-site path silently

Examples:

- root array element type: `["root", "elementType"]`
- second tuple element under root: `["root", "1"]`
- third union member under a definition: `["definitions", "User", "2"]`
- record value under a definition: `["definitions", "Metadata", "value"]`

This included one deliberate cleanup:

- core schema validation migrated away from tuple or union path forms containing `"elements"` or `"members"`

The refactor should not change path shapes incidentally beyond that explicit normalization.

## Traversal Semantics

The first helper should traverse these edges only:

- document definitions
- document root
- array element type
- tuple element type
- record key
- record value
- object field type
- union member
- optionally resolved local reference target

The first helper should not:

- synthesize field nodes as traversal nodes unless the repository later decides field traversal is a first-class need
- traverse annotations or constraints from `Constraint IR`
- reinterpret target-local naming or rendering policy

The callback should always receive the current `SchemaNode`, not a synthetic wrapper.

## First Migration Targets

The first migration set was:

1. `packages/generators/typescript/src/diagnostics.ts`
2. `packages/generators/typescript/src/validate.ts`
3. `packages/generators/json-schema/src/diagnostics.ts`
4. `packages/generators/json-schema/src/validate.ts`
5. `packages/core/src/schema/validation.ts`

These are good early targets because they are:

- read-only
- path-sensitive
- reference-aware
- already duplicating similar recursion
- protected by existing contract tests

Emitter code can wait.

## Acceptance Outcome

The first traversal extraction was considered good enough when:

1. the early consumers above no longer reimplement the full node descent manually
2. logical diagnostic paths remain stable except for the deliberate tuple or union path normalization in core validation
3. reference-resolution behavior remains explicit and testable
4. generator diagnostics and semantic notes do not drift
5. generator validation failure boundaries do not drift
6. the helper still feels small enough that a new analysis pass can adopt it without framework overhead
7. the resulting API still looks specific to `Shape IR`, not prematurely generalized across all IR layers

## Regression Harness

This refactor should be protected primarily by existing tests, not by adding a large new test family first.

The expected safety net is:

- shared semantic fixtures
- generator contract tests
- selected integration tests
- corpus tests
- `pnpm test`
- `pnpm exec tsc --noEmit`

The focused walker test file now exists.
It validates:

- canonical path propagation
- reference preserve mode
- reference follow mode
- cycle-safe reference expansion

The key question during rollout was not whether the helper looked elegant.
It was whether current truthfulness-sensitive diagnostics, semantic notes, and failures stayed stable.

## Deferred Questions

These questions remain intentionally deferred after the first helper landed:

- whether emitters should reuse part of the traversal layer
- whether `Value IR` should get a similar helper
- whether `Constraint IR` should use the same traversal API shape
- whether a later transform API should be built on top of the walker
- whether `field` should become a first-class traversed entity
- whether `exit` hooks or short-circuiting add enough real value
- whether a heavier visitor pattern is ever justified

## Current Direction

The repository should now continue with:

- one lightweight shared traversal helper in `@aio/core`
- explicit path and reference conventions
- a `Shape IR`-specific API instead of a speculative multi-IR abstraction
- continued hardening through consumer adoption and focused traversal tests
- no semantic broadening unless pressure justifies it independently

It should not yet move toward:

- a broad AST framework rewrite
- immediate emitter migration
- a public API promise larger than current `Shape IR` needs
- speculative abstraction across every IR layer at once
