# Progress

## Current Phase

The workspace is in an IR-hardening phase.

The main goal is to make the current schema IR clear, testable, and reusable before broadening to more languages or more advanced schema features.

## Completed

- established `@aio/core` as the shared contract and schema IR package
- separated parser and generator packages from the core package
- implemented JSON parsing for the current schema IR subset
- implemented TypeScript generation for the current schema IR subset
- added integration tests for `json -> ir -> typescript`
- documented parser and generator capabilities and configuration
- added CI with lint, typecheck, test, and build checks
- aligned CI runtime to Node 24
- added explicit support for `null`
- added schema literal nodes
- added schema union nodes
- added schema tuple nodes with optional tuple positions
- added schema record nodes with conservative opt-in JSON inference
- clarified project direction around serializable data-shape semantics

## Current Supported Schema Capabilities

- scalar
- object
- array
- tuple
- record or map
- union
- `null`
- optional presence
- enum-like literal nodes in IR and generator

## Current Focus

- keep parser, IR, and generator boundaries explicit
- improve development documentation and decision traceability
- use a constrained TypeScript schema-subset parser as a future validation step for IR design

## Next Milestones

1. document-level references or reusable definitions
2. richer unknown semantics
3. discriminated-union-friendly normalization guarantees
4. TypeScript schema-subset parser planning and skeleton

## Open Risks

- extending IR too quickly may still bake in assumptions from JSON before other inputs arrive
- record and object inference boundaries must stay conservative and explicit
- references and reuse may become increasingly important as generated output grows
- parser and generator options can become hard to reason about if defaults and capability boundaries are not kept clear
