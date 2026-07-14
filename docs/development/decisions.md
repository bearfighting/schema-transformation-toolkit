# Design Decisions

## Current Decisions

### IR Boundary

- the schema IR models serializable data shapes, not full language type systems
- TypeScript is an important validation language, but it does not define the IR

### Null And Optional

- `null` and optional presence are separate semantics
- `SchemaNullNode` represents an explicit `null` type
- field or tuple optionality represents missing presence, not `null`

### Tuple Semantics

- tuple and array are different schema concepts
- tuple inference happens in parser and IR semantics, not as a generator-only rendering choice
- tuple positions may carry union types
- tuple positions may be optional

### Record Semantics

- record and object are different schema concepts
- record inference is opt-in and conservative
- current record keys are constrained to `string`

### Reference Semantics

- reusable definitions are document-local
- references point to `definition.name.source`
- `core` validates definition uniqueness and reference existence

### TypeScript Enum Boundary

- the TypeScript parser may support enum declarations only when members resolve without general expression evaluation
- supported enum member forms are:
  - literal initializers
  - implicit numeric progression
  - references to earlier enum members
- arithmetic, bitwise, string-concatenation, or other computed enum evaluation is intentionally out of scope for the current parser subset

### Unknown Semantics

- `unknown` stays one IR node kind
- explanation should live in `reason` and optional `evidence`, not in many pseudo-unknown node kinds

### Diagnostic Shape

- structured diagnostics are part of the shared contract surface
- diagnostic `code` should be stable and machine-consumable
- diagnostic `path` should represent logical data or IR location, not source-syntax spans
- source-syntax locations should remain parser-specific diagnostic evidence in v0 rather than new shared top-level `SchemaDiagnostic` fields
- if source locations later prove shared across multiple producers, promote them from parser evidence into the shared contract deliberately rather than by accident

### Core Internal Structure

- public factories should stay thin and orchestration-oriented
- identifier normalization, equivalence, validation, and normalization rules should live in focused internal modules
- parser and generator packages should reuse shared core semantics instead of re-implementing them when practical

### Failure Model

- unsupported cases should fail explicitly instead of being guessed silently
- parser limitations should stay in parsers unless they need to become IR concepts

## How To Add A Decision

Record a decision here when it affects:

- project scope
- IR semantics
- parser or generator boundaries
- support or non-support for an important feature class
