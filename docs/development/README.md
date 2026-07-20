# Development Docs

This directory is for project-internal documentation.

Use it in three layers:

- start with one repository-level status page
- then open one execution checklist if you are working on a specific active area
- then open deeper reference docs only when you need design rationale or semantic boundaries

## Start Here

- [progress.md](progress.md): the repository-level status page
- [scope.md](scope.md): the project boundary and non-goals

## Execution Docs

- [typescript-parser-checklist.md](typescript-parser-checklist.md): TypeScript parser task tracking
- [workflow.md](workflow.md): default implementation flow and testing order
- [acceptance.md](acceptance.md): definition of done and per-layer acceptance criteria

## Core Reference

- [architecture-layering.md](architecture-layering.md): source-target families, IR layering, and orchestration direction
- [ir-boundaries.md](ir-boundaries.md): semantic boundary between Value IR, Shape IR, and Constraint IR
- [schema-traversal.md](schema-traversal.md): planned lightweight traversal layer for shared Shape IR consumers
- [capabilities-and-loss.md](capabilities-and-loss.md): conversion truthfulness, semantic loss, and capability reporting
- [decisions.md](decisions.md): durable design decisions and guardrails
- [ir-contract.md](ir-contract.md): current shared contract and diagnostic conventions
- [public-api-stage1.md](public-api-stage1.md): Stage 1 SDK API boundary

## Specialized Reference

- [json-schema-shape-gap.md](json-schema-shape-gap.md): JSON Schema pressure against the current shared IR
- [typescript-parser-preprocess.md](typescript-parser-preprocess.md): single-file preprocess boundary for TypeScript parsing
- [typescript-parser-cases.md](typescript-parser-cases.md): supported and unsupported TypeScript parser cases

## Maintenance Rule

- `progress.md` is the only repository-level status and prioritization page
- execution checklists should track one active workstream each and should not repeat full repository status
- package usage belongs in package `README`s, not here
