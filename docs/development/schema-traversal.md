# Schema IR Traversal Design

This document defines the near-term design for shared `Shape IR` traversal helpers.

It is meant to guide the next refactor directly.
It should stay smaller than a framework spec and more concrete than a vague direction note.

## Goal

The current goal is:

- extract a lightweight shared traversal layer for `SchemaDocument` and `SchemaNode`
- remove repeated recursion mechanics from analysis-style consumers
- preserve current diagnostic, semantic-note, and validation behavior while doing so

This is not a plan to introduce a heavy visitor framework.

## Why Now

The repository already has enough passing tests to protect a structural refactor:

- shared semantic fixtures
- generator contract tests
- cross-parser equivalence smoke
- route integration smoke
- real-world corpus coverage

At the same time, repeated traversal logic is now showing up in multiple places:

- `packages/generators/typescript/src/diagnostics.ts`
- `packages/generators/typescript/src/validate.ts`
- `packages/generators/json-schema/src/diagnostics.ts`
- `packages/generators/json-schema/src/validate.ts`

The main duplication is not target semantics.
It is repeated mechanics:

- recurse through the same node kinds
- carry stable logical paths
- resolve local references when needed
- avoid accidental infinite recursion
- keep path and reference behavior consistent across passes

## Scope Of The First Refactor

The first traversal extraction should only target analysis-style consumers.

That means:

- diagnostics collection
- semantic-note collection
- renderability validation
- small future read-only inspections such as counting or indexing passes

It should not first target:

- emitters
- formatting-sensitive rendering
- parser internals
- a full transform or rewrite framework

## Current Repeated Patterns

The current generator diagnostics and validation passes repeatedly implement the same descent rules:

- `array -> elementType`
- `tuple -> elements[index].type`
- `record -> key` and `value`
- `object -> fields[index].type`
- `union -> members[index]`
- `reference -> optional local definition lookup`

They also share the same path-shape conventions:

- `["root"]`
- `["definitions", "<Name>"]`
- `["root", "elementType"]`
- `["root", "<fieldName>"]`
- `["root", "0"]`
- `["definitions", "<Name>", "value"]`

Those rules should stop being reimplemented ad hoc.

## Design Principles

The traversal layer should follow these rules:

1. keep traversal mechanics shared, keep semantics local
2. preserve current path conventions exactly unless a deliberate migration is approved
3. make reference expansion explicit rather than automatic
4. stay read-only in the first version
5. prefer small callback-based helpers over class hierarchies
6. support partial adoption one consumer at a time

## Recommended First-Pass API

The first useful abstraction should live in `@aio/core` and look roughly like this:

```ts
walkSchemaDocument(document, visitor, options?)
walkSchemaNode(node, context, visitor)
```

The exact names can still change, but the first version should support:

- document root traversal
- definition traversal
- stable logical path propagation
- access to document-level definition lookup
- optional local reference resolution
- cycle-safe traversal state

The callback context should be small and explicit, for example:

```ts
interface SchemaWalkContext {
  document: SchemaDocument;
  node: SchemaNode;
  path: string[];
  parent?: SchemaNode;
  definition?: SchemaDefinition;
  definitionLookup: ReadonlyMap<string, SchemaDefinition>;
  via?: {
    kind: "root" | "definition" | "elementType" | "tuple-element" | "record-key" | "record-value" | "field" | "union-member" | "reference-resolution";
    key?: string;
    index?: number;
    referenceName?: string;
  };
}
```

This does not need to be the public final type name.
It does need to capture the data current consumers keep rebuilding manually.

## Reference Policy

Reference behavior must be explicit.
Different passes need different truths.

The first version should support at least these modes:

- visit reference nodes only
- visit reference nodes and optionally inspect the resolved definition separately
- prevent repeated re-expansion through a cycle guard

The helper should not silently inline references by default.

That matters because:

- diagnostics may care about both the reference site and the resolved semantic
- validation may only need to confirm that a reference resolves
- future emitters may want to keep references as references

## Path Contract

One major reason to centralize traversal is to freeze path behavior.

The first traversal helper should preserve current logical path rules:

- root starts at `["root"]`
- definitions start at `["definitions", definition.name.source]`
- array descent appends `"elementType"`
- tuple and union descent appends the member index as a string
- object descent appends `field.name.source`
- record descent appends `"key"` or `"value"`

The refactor should not change these path shapes incidentally.
If a path convention ever changes later, it should be a deliberate contract change with test updates.

## What The First Helper Should Not Do

The first version should not try to:

- mutate or rewrite nodes
- build a full visitor interface with one method per node kind
- hide target-local policy decisions
- replace emitter recursion immediately
- generalize across `Value IR` and `Constraint IR` before `Shape IR` adoption proves useful

## First Migration Targets

The first migration set should be:

1. `packages/generators/typescript/src/diagnostics.ts`
2. `packages/generators/typescript/src/validate.ts`
3. `packages/generators/json-schema/src/diagnostics.ts`
4. `packages/generators/json-schema/src/validate.ts`

These are good early targets because they are:

- read-only
- path-sensitive
- reference-aware
- already duplicating similar recursion
- protected by existing contract tests

Emitter code can wait.

## Acceptance Criteria

The first traversal extraction is good enough when:

1. the four early consumers above no longer reimplement the full node descent manually
2. logical diagnostic paths remain stable
3. reference-resolution behavior remains explicit and testable
4. generator diagnostics and semantic notes do not drift
5. generator validation failure boundaries do not drift
6. the helper still feels small enough that a new analysis pass can adopt it without framework overhead

## Regression Harness

This refactor should be protected primarily by existing tests, not by adding a large new test family first.

The expected safety net is:

- shared semantic fixtures
- generator contract tests
- selected integration tests
- corpus tests
- `pnpm test`
- `pnpm exec tsc --noEmit`

The key question during rollout is not whether the helper looks elegant.
It is whether current truthfulness-sensitive diagnostics, semantic notes, and failures stay stable.

## Deferred Questions

These questions are intentionally deferred until the first helper lands:

- whether emitters should reuse part of the traversal layer
- whether `Value IR` should get a similar helper
- whether `Constraint IR` should use the same traversal API shape
- whether a later transform API should be built on top of the walker
- whether a heavier visitor pattern is ever justified

## Current Decision

The repository should now move toward:

- one lightweight shared traversal helper in `@aio/core`
- explicit path and reference conventions
- first adoption in diagnostics and validation
- test-protected mechanical extraction before any semantic broadening

It should not yet move toward:

- a broad AST framework rewrite
- immediate emitter migration
- speculative abstraction across every IR layer at once
