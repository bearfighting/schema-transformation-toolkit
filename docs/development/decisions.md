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

### Failure Model

- unsupported cases should fail explicitly instead of being guessed silently
- parser limitations should stay in parsers unless they need to become IR concepts

## How To Add A Decision

Record a decision here when it affects:

- project scope
- IR semantics
- parser or generator boundaries
- support or non-support for an important feature class
