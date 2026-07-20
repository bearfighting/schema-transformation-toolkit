# Schema IR Traversal Design

## Purpose

This document records the current design direction for shared `Shape IR` traversal helpers.

It exists to answer four practical questions:

- how `SchemaDocument` and `SchemaNode` are traversed today
- why repeated traversal code is starting to become a maintenance cost
- whether the project should adopt a heavy visitor pattern right now
- what the smallest useful shared traversal abstraction should be

This is a near-term implementation guide, not a commitment to a large framework.

## Current Reality

Today most `Shape IR` consumers traverse the tree by hand.

That is true in at least three places:

- generator emitters
- generator validators
- generator diagnostics or semantic-note collectors

Examples in the current repository:

- `packages/generators/typescript/src/emit.ts`
- `packages/generators/typescript/src/validate.ts`
- `packages/generators/typescript/src/diagnostics.ts`
- `packages/generators/json-schema/src/emit.ts`
- `packages/generators/json-schema/src/diagnostics.ts`

The common repeated work is:

- recurse through `array.elementType`
- recurse through `tuple.elements`
- recurse through `record.key` and `record.value`
- recurse through `object.fields`
- recurse through `union.members`
- carry a stable path
- optionally resolve references through local definitions

The target-specific work is still different, but the traversal mechanics are increasingly duplicated.

## Why This Needs A Shared Layer

The repository is no longer in a phase where only one generator or one analysis pass touches the IR.

We now have multiple consumers that all need:

- stable path propagation
- definition lookup
- recursive descent over the same node graph
- a place to add future traversal-wide guardrails such as recursion limits or cycle handling

If every new pass keeps re-implementing traversal, three costs grow over time:

1. correctness drift
2. path-shape drift
3. duplicated maintenance when `SchemaNode` evolves

This has already started to show up as repeated “walk the same node kinds again” logic in emit, validate, and diagnostics code.

## Why Not A Heavy Visitor Pattern Yet

A classic object-oriented visitor would likely be too heavy for the current codebase.

Reasons:

- `SchemaNode` is a plain discriminated union, not a method-owning class hierarchy
- emit logic is strongly target-specific and often clearer when written directly
- forcing every consumer through a large interface too early would increase indirection before the repository actually needs it
- today the main pain is repeated traversal mechanics, not lack of polymorphism

So the goal should not be “introduce a full visitor framework.”

The goal should be:

- share traversal mechanics
- keep target-specific logic local
- make future refactors easier

## Recommended Near-Term Abstraction

The recommended next step is a lightweight traversal helper in `@aio/core`, not a full visitor framework.

The likely shape is:

- `walkSchemaDocument(document, visitor, options?)`
- `walkSchemaNode(node, context, visitor)`

Where traversal context can include:

- `path`
- `parent`
- `definitionLookup`
- `rootDocumentName`
- optional traversal state for cycle detection

The visitor callback should receive enough context to let callers decide whether they are:

- collecting diagnostics
- collecting semantic notes
- validating a boundary
- counting or indexing nodes
- building route or capability summaries

## What Should Use It First

The first consumers should be analysis-style passes, not emitters.

Best early candidates:

- `packages/generators/typescript/src/diagnostics.ts`
- `packages/generators/typescript/src/validate.ts`
- `packages/generators/json-schema/src/diagnostics.ts`

These passes already want:

- stable recursion
- stable path production
- consistent reference handling
- low ceremony

They do not need target-specific rendering control over whitespace, precedence, or output assembly.

That makes them the lowest-risk first migration set.

## What Should Not Be Migrated First

Emitter code should not be the first migration target.

In the current repository, emitter logic still benefits from direct local recursion because it mixes:

- traversal
- formatting
- precedence handling
- target-specific syntax decisions

That means the first traversal helper should support emitters later if useful, but it should not be justified primarily by emitter refactoring.

## Reference Handling Rule

The traversal helper should not silently expand references by default in all modes.

Instead it should make reference behavior explicit, for example:

- visit reference node only
- optionally resolve local definition for analysis
- optionally prevent repeated expansion through cycle guards

That matters because different passes need different truth:

- emit may want the reference as reference
- diagnostics may want both the reference site and the resolved semantic
- validation may want to confirm the reference resolves at all before deeper checks

## Path Stability Rule

One reason to centralize traversal is to stabilize path construction.

The helper should preserve current repository conventions such as:

- `["root"]`
- `["root", "elementType"]`
- `["definitions", "Name"]`
- `["root", "fieldName"]`
- `["root", "1"]` for union or tuple member indexes

Future consumers should not have to rediscover these conventions independently.

## Recommended Work Plan

The near-term implementation sequence should be:

1. add a minimal shared traversal helper in `@aio/core`
2. migrate TypeScript generator diagnostics to it
3. migrate TypeScript generator validation to it
4. migrate JSON Schema generator diagnostics to it
5. evaluate whether the abstraction remains small and helpful
6. only then consider whether selected emit paths benefit from partial reuse

## Non-Goals

This design should not currently aim to:

- replace every recursive helper in one pass
- introduce class-based AST nodes
- force parser internals to use the same traversal abstraction immediately
- hide target-specific logic behind a generic rendering interface
- build a speculative framework for future formats before current consumers benefit

## Current Decision

The current repository should move toward:

- shared lightweight traversal helpers
- shared path and reference conventions
- first use in diagnostics and validation

It should not yet move toward:

- a heavy classic visitor pattern
- mandatory emitter migration
- a broad AST framework rewrite
