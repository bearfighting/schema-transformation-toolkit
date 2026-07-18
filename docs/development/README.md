# Development Docs

This directory is for project-internal documentation.

It should answer questions like:

- what decisions have already been made
- what the project explicitly supports
- what development workflow we follow
- how we decide a feature is complete
- what the current plan and progress are

Use these docs when you want to understand why the project behaves the way it does, what is intentionally unsupported, or what sequence of work the repository is currently optimized for.

## Index

### Core Guidance

- [scope.md](scope.md): project boundary and supported vs unsupported feature classes
- [architecture-layering.md](architecture-layering.md): source-target families, IR layering, and capability-aware orchestration direction
- [ir-boundaries.md](ir-boundaries.md): semantic boundary and pipeline rules for Value IR, Shape IR, and Constraint IR
- [capabilities-and-loss.md](capabilities-and-loss.md): conversion truthfulness, semantic loss, and capability-reporting contract
- [decisions.md](decisions.md): durable design decisions and guardrails
- [ir-contract.md](ir-contract.md): current shared shape contract, invariants, and diagnostic conventions

### Process

- [workflow.md](workflow.md): default implementation flow and testing order
- [acceptance.md](acceptance.md): definition of done and per-layer acceptance criteria

### Current Status

- [progress.md](progress.md): unified current-state summary, completed milestones, and remaining near-term work

### Active Reference

- [json-schema-shape-gap.md](json-schema-shape-gap.md): current JSON Schema semantic gap inventory against the shared IR
- [typescript-parser-preprocess.md](typescript-parser-preprocess.md): preprocess boundary for single-file parsing vs future module-aware resolution
- [typescript-parser-checklist.md](typescript-parser-checklist.md): current TypeScript parser expansion checklist
- [typescript-parser-cases.md](typescript-parser-cases.md): test-oriented support and failure cases for the current TypeScript parser subset

## Suggested Reading Order

- start with [scope.md](scope.md) if you want the project boundary first
- read [progress.md](progress.md) for the current implementation state and remaining near-term work
- read [architecture-layering.md](architecture-layering.md) when deciding which IR layer or capability kind a new source or target belongs to, or how orchestration should be planned
- read [ir-boundaries.md](ir-boundaries.md) when deciding whether a semantic belongs in Value IR, Shape IR, or Constraint IR
- read [capabilities-and-loss.md](capabilities-and-loss.md) when deciding whether a conversion should succeed silently, succeed with diagnostics, fail explicitly, or surface capability-loss metadata
- read [ir-contract.md](ir-contract.md) before changing parser or generator behavior
- read [json-schema-shape-gap.md](json-schema-shape-gap.md) before widening JSON Schema support or proposing shared-IR expansion based on JSON Schema pressure
- read [typescript-parser-preprocess.md](typescript-parser-preprocess.md) before changing TypeScript parser behavior around `import`, `export`, re-exports, or entry preparation

## Documentation Rule

As a rule of thumb:

- put user-facing usage, package entry points, and public configuration in package `README`s
- put design rationale, milestones, tradeoffs, and planned work in `docs/development`
