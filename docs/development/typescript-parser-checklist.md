# TypeScript Parser Checklist

This file is the implementation checklist for the first TypeScript parser.

It is intentionally narrow.
The goal is to validate the current schema IR with one additional source language, not to build a full TypeScript compiler front-end.

## Current Goal

Build a TypeScript schema-subset parser that can turn one explicit named declaration into a valid `SchemaDocument`.

## Result Contract

This parser should follow the repository-wide capability and semantic-loss contract.

That means:

- return success without diagnostics when TypeScript source maps directly into current shared shape semantics
- return success with diagnostics when the parser intentionally normalizes syntax while remaining truthful
- return failure when accepting the source would silently approximate unsupported TypeScript meaning too aggressively

For the current parser subset, most accepted cases are either direct support or syntax normalization.
The v0 boundary should stay strict about unsupported type-system features rather than pretending they are serializable data-shape semantics.

## Current Implemented Subset

Supported today:

- explicit named entry declarations
- `type` aliases, `interface` declarations, and `enum` declarations
- object type literals
- scalar keywords: `string`, `number`, `boolean`
- `null`
- readonly properties and readonly array or tuple syntax when they do not add new IR semantics
- optional properties
- field-level nullable unions
- general unions
- `T[]` and `Array<T>`
- `ReadonlyArray<T>`
- tuples without rest elements
- scalar literal types and literal unions
- enum member references to earlier members when they resolve to supported literal values
- `Record<string, T>`
- reachable top-level named references only
- shared validation through `tryValidateSchemaDocument`

Current supported-with-normalization behavior:

- `interface` and `type` declarations both lower into the same shared shape semantics
- readonly properties lower into ordinary field semantics when readonly adds no new shared meaning
- readonly arrays and readonly tuples lower into ordinary array and tuple semantics
- enum declarations lower into literal or literal-union schema definitions when members stay in the supported literal subset
- earlier-member enum references normalize into their resolved literal outcomes when resolution stays inside the parser's narrow local enum rules

Unsupported today, with explicit parser failures:

- missing explicit entry names
- missing entry declarations
- tuple rest elements
- external or unresolved type references
- utility types outside `Record`
- non-string `Record` keys
- conditional, mapped, function, and intersection types
- unsupported object type members
- unsupported property names
- generic unsupported syntax kinds
- enum initializers outside literal, implicit-numeric, or earlier-member-reference forms
- computed enum evaluation is intentionally out of scope
- readonly syntax still respects the existing tuple-rest and malformed array-reference failure boundaries

Current supported-with-semantic-loss behavior should remain intentionally narrow:

- the parser preserves shared data-shape truth, not full TypeScript declaration form
- declaration-form distinctions that do not survive into shared shape semantics should be treated as accepted normalization, not as lossless round-trip guarantees
- full TypeScript syntax fidelity is explicitly out of scope for this parser

## Phase 0: Documentation And Scope

- [x] keep [typescript-parser-cases.md](typescript-parser-cases.md) aligned with actual parser support
- [x] confirm the exact first supported subset before implementation starts
- [x] keep unsupported features explicit in docs and tests

## Phase 1: Parser Contract

- [x] create `packages/parsers/typescript`
- [x] add a package README that states the supported subset and failure model
- [x] mirror the parser contract shape used by `@aio/parser-json`
- [x] decide the canonical root API names before writing most tests

Suggested root exports:

- `typeScriptParser`
- `inferTypeScriptDocument`
- `inferTypeScriptDocumentWithOptions`
- `tryInferTypeScriptDocument`
- `tryInferTypeScriptDocumentWithOptions`
- `resolveTypeScriptParseOptions`
- `prepareTypeScriptParseOptions`
- `configureTypeScriptParser`

## Phase 2: Entry Strategy

- [x] require one explicit entry declaration name for the current parser subset
- [x] support `type Foo = ...` as an entry
- [x] support `interface Foo { ... }` as an entry
- [x] support `enum Foo { ... }` as an entry when members can map to literals
- [x] emit the entry as a definition plus a root reference
- [x] keep inline anonymous object types inline unless they are top-level named declarations

## Phase 3: Core Conversion

- [x] parse scalar keyword types: `string`, `number`, `boolean`
- [x] parse `null`
- [x] parse object members into `SchemaObjectNode`
- [x] map optional properties to `required: false`
- [x] preserve `null` separately from optionality
- [x] parse unions into `SchemaUnionNode`
- [x] parse arrays from both `T[]` and `Array<T>`
- [x] parse tuples into `SchemaTupleNode`
- [x] parse scalar literal types into `SchemaLiteralNode`
- [x] parse enum declarations into literal or literal-union schema definitions
- [x] support earlier-member enum references when they resolve to supported literal values
- [x] accept readonly syntax when it does not add new shared IR semantics
- [x] parse `Record<string, T>` into `SchemaRecordNode`
- [x] parse named references between top-level declarations

## Phase 4: Validation And Failures

- [x] validate the produced document with `tryValidateSchemaDocument`
- [x] convert unsupported syntax into structured parser failures
- [x] define stable failure codes for unsupported TypeScript subset cases
- [x] include diagnostic paths when a stable logical location is available

## Phase 5: Tests

- [x] add parser unit tests that follow [typescript-parser-cases.md](typescript-parser-cases.md)
- [x] add explicit unsupported-case tests
- [x] add integration tests for `typescript -> schema ir -> typescript`
- [x] add a root export contract test for the new parser package
- [x] split success-path coverage and failure-matrix coverage into dedicated parser test files
- [x] group failure tests by parser surface so error-code and diagnostic-path expectations stay explicit

## Phase 6: First Slice

- [x] implement the minimal declaration round-trip:

```ts
type User = {
  id: number;
  name?: string | null;
};
```

- [x] verify the parsed IR shape directly
- [x] verify `tryValidateSchemaDocument` succeeds
- [x] verify the existing TypeScript generator renders semantically aligned output

## Next Worthwhile Work

### Must

- [ ] add parser-facing source span or line-column diagnostics on top of the current logical `path` diagnostics
- [x] decide and document the intended support strategy for `enum`, `readonly` properties, and readonly array or tuple syntax before implementing them
- [ ] keep the supported success subset, explicit failure matrix, and package docs aligned as new cases land
- [ ] apply the capability-and-loss documentation pattern explicitly in the parser package README once the next supported slice lands

### Source Span Diagnostics Breakdown

#### Step 1: Decide The Diagnostic Shape

- [x] decide whether source locations should live in `SchemaDiagnostic` top-level fields or remain parser-specific evidence for v0
- [x] keep the current logical `path` model as the primary semantic location even after source spans are added
- [x] define one canonical source-location shape for parser diagnostics, covering at least line, column, and text span

Chosen direction for v0:

- keep `SchemaDiagnostic` top-level shape unchanged for now
- add source locations inside parser-specific `diagnostic.evidence.sourceLocation`
- keep `path` as the primary logical location and treat source locations as complementary syntax-origin information
- use one canonical source-location shape with `start`, `end`, and `length`

#### Step 2: Add Parser-Level Capture

- [x] capture source locations for entry lookup failures where the source file is available but the declaration contract fails
- [x] capture source locations for unsupported type nodes and unsupported type members
- [x] capture source locations for nested field-level failures without losing the current logical field `path`

#### Step 3: Lock The Contract With Tests

- [x] add targeted parser tests that assert both logical `path` and source-location evidence on representative failures
- [x] cover at least one definition-level failure, one field-level failure, one type-reference failure, and one tuple failure
- [x] keep the current failure-matrix organization while extending assertions for source-location evidence

#### Step 4: Document The Surface

- [x] update the parser README once the chosen source-location shape is real
- [x] document whether source locations are parser-only evidence or part of the shared diagnostic contract
- [x] explain the intended distinction between logical IR paths and syntax-origin locations

### Should

- [x] expand representative unsupported-node diagnostics so they preserve both logical `path` information and useful source evidence
- [ ] continue broadening that richer evidence coverage to future unsupported parser surfaces such as declaration-level pre-processing or multi-file boundaries
- [ ] decide which currently unsupported features are "not yet supported" versus intentionally outside the project boundary

### Can Wait

- [x] make preprocess an explicit code-level step rather than only an architectural/documentation boundary
- [x] move interface-heritage blocking checks for the reachable local declaration graph into preprocess
- [ ] automatic root declaration discovery from a full file
- [ ] import-aware parsing across multiple files
- [x] add explicit parser diagnostics for direct imported type references, namespace-imported type references, and re-export-only entries in the current single-file subset
- [ ] decide whether broader export-forwarding forms such as `export * from` should get equally explicit diagnostics or remain entry lookup misses for now
- [ ] decide whether unsupported top-level module statements should be ignored, pre-processed away, or reported explicitly when they affect entry resolution
- [ ] checker-driven semantic resolution
- [ ] source span metadata in the shared IR itself rather than only parser diagnostics

## Longer-Term Backlog

- [ ] support for `intersection`
- [ ] support for conditional or mapped types
- [ ] support for utility types beyond `Record`
- [ ] import or export aware parsing across multiple files
- [ ] shared IR-level source span metadata
