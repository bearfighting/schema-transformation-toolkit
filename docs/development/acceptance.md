# Acceptance Criteria

## Feature Completion Standard

A feature is ready to land when all of the following are true:

- the schema semantics are clearly defined
- the IR shape is explicit where needed
- tests cover the intended success cases
- tests cover meaningful edge cases or unsupported cases
- parser and generator behavior stay aligned with the IR
- docs are updated where the public or development contract changed
- validation is green

## By Layer

### Core

- types are defined
- factories and guards exist when needed
- invariants are enforced where practical
- core tests cover the new node or semantic rule

### Parser

- supported cases infer correctly
- accepted normalization or semantic-loss cases are documented and tested when success remains truthful
- unsupported cases fail explicitly
- options are documented and validated
- parser tests cover success and failure boundaries

### Generator

- supported IR shapes render correctly
- target-side semantic loss or widening cases are documented and tested when generation still succeeds
- generator tests cover representative output
- output stays semantically aligned with IR rules

### Integration

- at least one end-to-end test covers the new capability when it spans multiple packages

## Done Means

At minimum:

- `pnpm test` passes
- `pnpm typecheck` passes

When relevant:

- `pnpm lint` passes
- `pnpm build` passes
