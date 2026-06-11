# Development Docs

This directory is for project-internal documentation.

It should answer questions like:

- what decisions have already been made
- what the project explicitly supports
- what development workflow we follow
- how we decide a feature is complete
- what the current plan and progress are

## Index

### Principles And Scope

- [scope.md](scope.md): project boundary and supported vs unsupported feature classes
- [decisions.md](decisions.md): durable design decisions and guardrails

### Delivery Process

- [workflow.md](workflow.md): default implementation flow and testing order
- [acceptance.md](acceptance.md): definition of done and per-layer acceptance criteria

### Planning And Tracking

- [roadmap.md](roadmap.md): near-term development direction
- [progress.md](progress.md): current phase, completed work, next milestones

### Reference

- [ir-v0-cases.md](ir-v0-cases.md): test-oriented working cases for current schema IR support

## Documentation Rule

As a rule of thumb:

- put user-facing usage, package entry points, and public configuration in package `README`s
- put design rationale, milestones, tradeoffs, and planned work in `docs/development`
