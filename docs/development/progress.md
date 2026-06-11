# Progress

## Current Phase

The workspace is in an early IR-first phase.

The main goal is to stabilize the boundaries between:

- parser responsibilities
- IR responsibilities
- generator responsibilities

## Completed So Far

- established `@aio/core` as the shared contract and IR package
- separated parser and generator packages from the core package
- implemented JSON parsing for the currently supported IR subset
- implemented TypeScript generation for the currently supported IR subset
- added parser and generator package documentation
- added integration tests for `json -> ir -> typescript`
- added CI with lint, typecheck, test, and build checks
- aligned CI runtime to Node 24

## Current Working Principles

- parser, IR, and generator should be independent in design, not just packaging
- unsupported cases should fail explicitly
- the IR should preserve stable semantic facts, not target-language preferences
- package dependencies should remain directional through `@aio/core`

## Likely Next Work

- extend IR to preserve more currently-rejected but meaningful cases
- document implemented vs planned parser options more clearly over time
- expand TypeScript generator configuration carefully without leaking TS-specific choices into IR
- add more validation and failure coverage around edge cases

## Open Risks

- extending IR too quickly may bake in assumptions from JSON before other inputs arrive
- parser options and generator options can become hard to reason about if defaults are not normalized centrally
- naming and keyword escaping likely need a more formal cross-language strategy as more generators are added
- unsupported cases such as top-level `null`, empty arrays, and mixed structures need a clear IR roadmap before broad parser expansion
