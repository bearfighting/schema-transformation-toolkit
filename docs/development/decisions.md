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

### IR Expansion Evidence Rule

- the shared IR should not expand just because one source format has richer native semantics
- before adding a new shared IR concept, we should first ask whether the pressure is:
  - a reusable serialized-shape concept likely to matter across multiple schema surfaces
  - a format-local concern that should remain in parser or generator behavior
  - a gray area that needs more parser or generator evidence before we decide
- when the answer is still unclear, prefer documenting semantic loss and continuing to expand parser or generator coverage before changing `core`

### Multi-Layer Architecture Direction

- the long-term architecture should distinguish value-format concerns, shared serializable-shape concerns, and richer constraint or validator concerns
- the current `core` schema package is the `Shape IR`, not the final home for every future source or target semantic
- future `Value IR` and `Constraint IR` layers should be allowed to grow separately instead of forcing every concern into one shared schema model

### Typed Capability Registration

- parser, transformer, and generator capabilities should eventually be registered through typed code-level metadata rather than only by documentation convention
- capability registration should declare which input or output format a component handles and which IR layer it consumes or produces
- application-level conversion entry points should rely on that registration model to validate and route conversion chains

## How To Add A Decision

Record a decision here when it affects:

- project scope
- IR semantics
- parser or generator boundaries
- support or non-support for an important feature class
