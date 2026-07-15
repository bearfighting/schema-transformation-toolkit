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

### Principles And Scope

- [scope.md](scope.md): project boundary and supported vs unsupported feature classes
- [decisions.md](decisions.md): durable design decisions and guardrails
- [ir-contract.md](ir-contract.md): current shared schema IR contract, invariants, and diagnostic conventions

### Delivery Process

- [workflow.md](workflow.md): default implementation flow and testing order
- [acceptance.md](acceptance.md): definition of done and per-layer acceptance criteria

### Planning And Tracking

- [roadmap.md](roadmap.md): near-term development direction
- [progress.md](progress.md): current phase, completed work, next milestones
- [plan.md](plan.md): staged execution plan for `core` and `web`, plus deferred follow-on surfaces
- [json-schema-generator-v0.md](json-schema-generator-v0.md): working plan for the first JSON Schema generator
- [typescript-parser-todo.md](typescript-parser-todo.md): implementation checklist for the first TypeScript parser
- [typescript-parser-preprocess.md](typescript-parser-preprocess.md): preprocess boundary for single-file parsing vs future module-aware resolution

### Reference

- [ir-contract.md](ir-contract.md): canonical current IR semantics and shared diagnostic contract
- [ir-v0-cases.md](ir-v0-cases.md): test-oriented working cases for current schema IR support
- [typescript-parser-v0-cases.md](typescript-parser-v0-cases.md): test-oriented support and failure cases for the first TypeScript parser
- [typescript-parser-preprocess.md](typescript-parser-preprocess.md): architectural note for module-related preprocessing and future multi-file expansion

## Suggested Reading Order

- start with [scope.md](scope.md) if you want the project boundary first
- read [ir-contract.md](ir-contract.md) before changing parser or generator behavior
- read [progress.md](progress.md) for the current implementation state
- read [json-schema-generator-v0.md](json-schema-generator-v0.md) or [typescript-parser-todo.md](typescript-parser-todo.md) when working on a specific active track
- read [typescript-parser-preprocess.md](typescript-parser-preprocess.md) before changing TypeScript parser behavior around `import`, `export`, re-exports, or entry preparation

## Documentation Rule

As a rule of thumb:

- put user-facing usage, package entry points, and public configuration in package `README`s
- put design rationale, milestones, tradeoffs, and planned work in `docs/development`
