# TypeScript Parser Preprocess Boundary

This note defines the intended boundary between:

- TypeScript source-file pre-processing
- the current single-file schema-subset parser
- future multi-file or module-aware resolution

The goal is to keep current unsupported module syntax explicit without baking today's single-file limitations into the long-term parser architecture.

This file is a boundary note, not a status page or execution checklist.

- repository-level prioritization lives in [progress.md](progress.md)
- TypeScript-parser task tracking lives in [typescript-parser-checklist.md](typescript-parser-checklist.md)
- concrete support and failure examples live in [typescript-parser-cases.md](typescript-parser-cases.md)

## Why This Boundary Exists

The current TypeScript parser is intentionally single-file and schema-oriented.

That means several TypeScript constructs fall into two very different categories:

- syntax that is only noise for the current parser and can eventually be filtered or normalized before conversion
- syntax that implies cross-file or module-graph resolution and therefore cannot be handled by the current parser core

If these concerns stay mixed inside the conversion layer, future expansion becomes harder:

- current single-file diagnostics start looking like permanent product boundaries
- parser code starts carrying module-system branching that does not belong to schema conversion itself
- future multi-file support has to unpick earlier "unsupported" assumptions from the wrong layer

The preprocess boundary keeps that separation clean.

## Intended Three-Layer Shape

### 1. Preprocess

Responsibilities:

- parse the source file into a TypeScript AST
- collect local top-level declarations relevant to the schema subset
- collect module-related statements and references that affect interpretation
- scan the reachable local declaration graph for shape-level blockers that should fail before ordinary conversion
- classify whether the input can proceed through the current single-file parser
- produce explicit preprocess-boundary diagnostics when it cannot

This layer should understand:

- `import`
- `export`
- `export ... from`
- namespace imports
- entry lookup across local declarations versus re-exports
- declaration-level syntax that changes meaning before schema conversion begins, such as interface heritage
- reachable local declaration dependencies well enough to detect preprocess-boundary blockers before conversion

This layer should not be responsible for:

- mapping supported schema subset syntax into shared IR nodes
- validating shared IR invariants
- rendering any generator output

### 2. Single-File Parser

Responsibilities:

- consume the prepared local declaration set
- convert supported schema-oriented declarations into shared schema IR
- emit conversion diagnostics for unsupported schema-subset constructs inside declarations

This layer should remain focused on:

- object, array, tuple, union, literal, enum, record, and reference conversion
- logical diagnostic `path` placement
- schema-subset unsupported syntax inside otherwise local declarations

This layer should not become the home for:

- cross-file module resolution
- import graph traversal
- export forwarding resolution
- package or project configuration lookup

### 3. Future Resolver

If the project later supports multi-file TypeScript parsing, the next layer should sit before or alongside preprocess:

- resolve imported declarations across files
- build a declaration graph
- hand preprocess or parser a prepared reachable declaration set

That future work should upgrade current preprocess failures into resolvable inputs rather than requiring a parser rewrite.

## Current Preprocess-Boundary Cases

The current implementation already has several failures that should be understood as preprocess-boundary diagnostics, even if they are still produced from nearby parser code today.

These include:

- `unsupported-typescript-entry-declaration-kind`
- `unsupported-typescript-top-level-module-statement`
- `unsupported-typescript-interface-heritage`
- `unsupported-typescript-imported-type-reference`
- `unsupported-typescript-namespace-import-reference`
- `unsupported-typescript-reexported-entry`

Their shared meaning is:

- the parser can read the syntax
- the failure happens before ordinary schema-subset conversion is meaningfully possible in the current architecture
- the limitation is about input preparation or module resolution, not about the long-term expressiveness of the schema IR

## Current Single-File Policy

For the current project phase, the intended policy is:

- allow local supported declarations
- allow `export` modifiers on supported local declarations
- ignore side-effect imports and empty export markers when they do not affect the reachable local declaration set
- reject entry resolution that depends on re-exports
- reject blocking top-level module statements such as `export default`, `export =`, or ambient `declare module` blocks when they determine module meaning before schema conversion
- reject type references that depend on imported bindings
- reject namespace-qualified imported references
- reject declaration shapes that require semantic merging or inheritance before conversion

This policy is intentionally conservative.
It optimizes for stable and explainable behavior, not maximum TypeScript coverage.

## Implicit Entry Taxonomy

The preprocess layer now uses one small internal taxonomy for implicit entry decisions.
This is meant to keep root-discovery expansion explainable as rules evolve.

Selection reasons answer "why was an entry chosen?":

- `single-declaration`: exactly one supported declaration exists
- `single-exported-declaration`: multiple declarations exist, but only one exported supported declaration exists
- `single-exported-root`: exported declarations collapse to one root in the exported dependency graph
- `single-root`: exported declarations do not disambiguate, but the local dependency graph collapses to one root
- `document-name-match`: ambiguity remains until a custom `...Document` name matches exactly one root candidate

Ambiguity reasons answer "why was no implicit entry chosen?":

- `multiple-exported-root-candidates`: exported declarations still expose more than one plausible public root
- `multiple-local-root-candidates`: exported declarations do not disambiguate, and the local declaration graph still exposes multiple plausible roots
- `cyclic-root-candidates`: no declaration root exists because declarations only resolve through cycles or complete consumption

Design rule:

- selection reasons should be ordered from strongest source evidence to weakest acceptable conservative tie-break
- ambiguity reasons should describe structural causes, not parser implementation accidents

## What Preprocess May Eventually Normalize

Some syntax may later be handled entirely inside preprocess without expanding the schema IR:

- removing irrelevant `export` modifiers from otherwise local declarations
- ignoring imports that are unused by the selected reachable declaration set
- classifying top-level statements into relevant, ignorable, and blocking groups
- normalizing entry selection over a larger prepared declaration set, including conservative exported-entry discovery

These are good preprocess candidates because they do not require new schema meaning.

## What Still Requires Real Future Work

Some cases should not be mistaken for simple pre-processing:

- following `import` and `export ... from` across files
- resolving namespace imports into real declarations
- supporting inheritance or semantic composition such as `extends`
- resolving project-level module specifiers or path aliases
- integrating with the TypeScript checker

These are larger resolver or semantic-expansion tasks.

## Near-Term Refactor Direction

The next refactor in this area should aim to:

1. make preprocess an explicit concept in code, not only in diagnostics
2. move module-boundary classification into a dedicated preparation step
3. keep the single-file conversion layer focused on schema-subset declaration conversion
4. preserve the current diagnostic codes unless a clearer preprocess-specific naming pass is worth the churn

The code does not need a large rewrite immediately.
The important part is to preserve the architectural direction now, so future multi-file support remains additive rather than disruptive.

## Maintenance Rule

- keep this file focused on layer boundaries and architectural intent
- put task ordering and near-term implementation tracking in the checklist
- put concrete supported and unsupported examples in the cases document
