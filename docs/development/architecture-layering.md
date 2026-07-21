# Architecture Layering

This document defines the repository's long-term architecture boundary for format families, IR routing, package roles, and planner behavior.

Use [ir-boundaries.md](ir-boundaries.md) for semantic meaning of each IR layer.
Use [ir-contract.md](ir-contract.md) for the current shared schema contract.

## Format Families

Supported sources and targets should be treated as belonging to one of three families:

- value formats: concrete serialized values such as JSON
- schema and validator definitions: schema documents that mix structure with validation or annotation semantics, such as JSON Schema
- serializable language type definitions: language-native DTO-style declarations such as the current TypeScript subset

The project only targets the serializable data-shape subset of language type systems.

## IR Routing Rule

The architectural rule is:

- value formats primarily target `Value IR`
- serializable type definitions primarily target `Shape IR`
- schema and validator definitions may target `Shape IR` plus `Constraint IR`

Likewise for generation:

- value generators should stay in the `Value IR` lane unless a separate inference step is involved
- type generators usually consume `Shape IR`
- richer schema generators may consume `Shape IR` plus `Constraint IR`

Avoid forcing value concerns or validator-specific concerns directly into `Shape IR`.

## Why Multiple IR Layers Exist

One IR is not enough for the repository's intended scope.

The split exists so that:

- serialized values do not distort reusable schema modeling
- shared structural meaning stays smaller than any one source format
- constraints and annotations do not bloat the core shape model
- route planning can reason explicitly about what each stage consumes and produces

## Current Package Pattern

The repository should keep converging on one simple package-entry pattern:

- `index.ts`: public exports only
- `api.ts`: package runtime entry points and configured defaults
- `options.ts`: option resolution and validation
- focused internal modules: implementation details such as `convert.ts`, `emit.ts`, `report.ts`, or `losses.ts`

The goal is clarity of public surface, not file-count uniformity.

## SDK Boundary

The SDK should remain a thin orchestration layer.
It should not become a second semantic home for format-specific logic.

The preferred internal split is:

- `types.ts`: public SDK option and result contracts
- `registry.ts`: parser and generator registration plus route summaries
- `source.ts`: source parsing and artifact production
- `generate.ts`: target generation dispatch
- `losses.ts`: route-level semantic-loss planning
- `report.ts`: report assembly
- `convert.ts`: orchestration only

If logic can live outside `convert.ts`, it should.

## Registry Responsibilities

The registry should stay small and do four jobs:

1. declare what each parser, generator, and future transformer consumes or produces
2. prevent invalid chains across IR layers
3. resolve a truthful route from source format to target format
4. provide one integration surface for SDK, CLI, and future service layers

The important modeling rule is not the exact type shape.
It is to keep parser, generator, and transformer roles explicit and IR dependencies visible.

## Runtime Planning Rule

For any requested conversion, the planner should answer:

1. can parser output satisfy generator input truthfully
2. if yes, what route preserves the most semantics with the least extra machinery

At minimum, the planner should track:

- source format
- target format
- parser output IR layers
- generator required IR layers
- optional preserved layers
- route-level capability and loss summaries

## Current Repository Rule

The repository already has a registry-backed planner and explicit `irSequence` metadata.
The current next step is not a new planning system.

It is to:

- keep the registry as the source of truth
- let docs describe rules rather than duplicate route tables
- let tests verify behavior rather than restate planner logic

## Maintenance Rules

- keep this file focused on family classification, routing, and package roles
- move semantic placement questions to [ir-boundaries.md](ir-boundaries.md)
- move result-contract questions to [capabilities-and-loss.md](capabilities-and-loss.md)
