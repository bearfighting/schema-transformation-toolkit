# Project Standards

This is the working contract for implementation, review, testing, packaging,
and documentation. It is intentionally operational; stable architectural
choices live in [design.md](design.md), and current priorities live in
[progress.md](progress.md).

## Default implementation loop

1. State the semantic intent and boundary conditions.
2. Put the change in the owning layer: core contract, format parser/generator,
   transformer, SDK compatibility/reporting, or registry/build tooling.
3. Add focused success, failure, and semantic-caveat tests.
4. Implement the smallest complete vertical slice.
5. Update package usage docs or this development set when a contract changes.
6. Run proportionate validation, inspect the diff, and check repository status.

Preserve unrelated user changes. Do not perform broad cleanup while changing a
semantic contract. Do not commit unless the user explicitly asks for it.

## Ownership rules

| Area           | Owns                                                                                    | Must not own                                               |
| -------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Core           | IR models, guards, validation, traversal, transforms, normalization, pipeline contracts | format syntax or product-specific report policy            |
| Parser         | source parsing, parser diagnostics, source-specific options, declared IR/artifacts      | target selection or generator behavior                     |
| Generator      | target rendering, accepted IR/artifacts, root constraints, options, loss analysis       | source parsing or route planning                           |
| SDK            | public options, route resolution, pipeline invocation, result wrapping, reports         | transform order, artifact merge, generator entry selection |
| Registry/build | descriptor manifests, generated builtin registry, package build order                   | hidden runtime discovery or duplicated format semantics    |

## Definition of done

A change is complete only when:

- the semantic behavior is represented by explicit descriptors and shared IR
  contracts;
- success, unsupported semantics, invalid runtime input, and thrown-handler
  failures are distinguishable structured outcomes;
- diagnostics, notes, losses, and artifacts are ordered and retained according
  to the pipeline contract;
- focused unit tests and representative SDK integration tests cover the
  changed route, edge cases, and compatibility behavior;
- public schemas, contract tests, API snapshots, package README guidance, and
  changelog entries are updated when applicable;
- the relevant validation gates pass and `git diff --check` is clean.

## Test strategy

Use the smallest layer that proves the behavior, then one end-to-end route:

- core tests cover IR factories/guards, validation, traversal, transforms,
  pipeline stages, artifacts, diagnostics, notes, losses, and preservation of
  shared document metadata such as `rootName`;
- parser and generator tests cover valid input, unsupported constructs,
  malformed input, options, root-shape rules, and descriptor contracts;
- integration tests cover representative Value, Shape, Constraint, loss, and
  dynamic runtime-failure routes;
- SDK contract tests cover result schemas, route discovery, custom registries,
  custom transformers, compatibility helpers, and public error behavior;
- packaging tests cover generated registry determinism, third-party manifests,
  clean SDK installation, and all builtin families.

Tests must assert that semantic loss is not silently discarded and that failure
results retain safe evidence from completed stages. Avoid snapshot-only tests
when a semantic invariant can be asserted directly.

## Public contract rules

The SDK is the stable downstream boundary. Public changes require runtime
schema updates, contract tests, API snapshots, README/API metadata, and honest
option documentation together. Keep `ok` discriminated results, structured
failure codes and phases, diagnostics, semantic notes, losses, artifacts,
plans, and report fields compatible unless a breaking release is explicitly
planned.

Normal conversion flow must not depend on thrown exception strings. Unknown
formats, unsupported routes, and invalid runtime documents remain distinct.
Compatibility aliases stay supported until the breaking migration that removes
them is deliberately documented.

## Versioning and release policy

All workspace packages share one version. Before `1.0.0`, releases remain
unstable and may evolve their public behavior as the toolkit matures.

Use the version components consistently:

- `0.x.0` marks a larger feature batch or meaningful capability expansion.
- `0.x.y` marks a smaller feature, focused enhancement, fix, or hardening
  release within the current minor line.
- `-alpha.N`, `-beta.N`, and `-rc.N` identify testing stages. Alpha is for
  early feature validation, beta is for broader integration testing, and RC
  is for final release-candidate validation.
- `1.0.0` is reserved for the first stable compatibility contract.

For example, the current Rust enhancement should be tested as
`0.3.1-beta.0` and promoted to `0.3.1` only after release-artifact validation.

## Build, release, and consumer checks

Workspace builds use the explicit order:

```text
core → format packages → generated builtin registry → SDK
```

Generated registry output must be deterministic and checked in. Before a
release or public-boundary change, update every managed manifest and the
corresponding changelog section, then validate a third-party manifest/custom
registry and a clean SDK tarball install. The SDK package smoke installs all
workspace dependencies from local tarballs and does not rely on workspace
links or publication of local packages; ordinary third-party dependencies
retain normal package-manager resolution. Use a matching release tag; tags with
prerelease suffixes are published as prereleases by the release workflow. Never
rely on a local workspace link as packaging evidence.

Downstream products should use registry discovery, normalized diagnostics, and
report metadata rather than hardcoded format lists or low-level internals. The
current SDK is synchronous; browser/Worker integration is a product-layer
concern and is not implied by the core contracts.

## Validation baseline

Run the normal workspace checks:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check:public-api
pnpm format:check
pnpm build
```

For the current repository, the equivalent explicit gates are:

```bash
node scripts/build-workspace.mjs
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/prettier --check .
node scripts/check-boundaries.mjs
node scripts/check-api-snapshots.mjs
node scripts/generate-builtin-registry.mjs --check
node scripts/check-third-party-fixture.mjs
node scripts/check-sdk-package.mjs
git diff --check
```

If an environment-specific wrapper cannot run, use the explicit equivalent,
record the limitation in the handoff, and do not claim the skipped gate passed.

## Documentation rules

Development documentation has exactly three durable roles: design, progress,
and standards. Completed phase plans, review logs, temporary inventories, and
duplicated specialized notes are deleted after their durable conclusions are
absorbed here. Package behavior belongs in package READMEs; user examples
belong in `examples/`; release history belongs in `CHANGELOG.md`.
