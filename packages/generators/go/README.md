# @schema-transformation-toolkit/generator-go

Deterministic Go struct generator for the shared Shape IR.

The generator emits a package declaration, exported struct fields, JSON tags by
default, references, slices, string-keyed maps, nullable pointers, and optional
fields with `omitempty`. Configure `packageName` and `emitJsonTags` through the
generator options.

The V1 generator consumes Shape IR only. Constraint IR is reported as target
semantic loss by the SDK when a source route carries constraints; the Go
generator does not claim runtime constraint validation.
