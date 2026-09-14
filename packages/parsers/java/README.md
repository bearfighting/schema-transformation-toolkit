# @schema-transformation-toolkit/parser-java

Restricted Java record, structural class, and unit-enum parser for the shared Shape IR.

This adapter produces Shape IR only. It does not infer or preserve Constraint IR;
constraint-bearing source routes report any Java target loss through the SDK.

Java V1 accepts exactly one public top-level record, restricted structural class, or unit-only enum and allows
additional package-private declarations as named definitions. Structural classes contain only
serializable instance fields; methods, constructors, inheritance, and framework metadata are rejected.
It supports Java primitive
scalars, common boxed scalars, `String`, arrays, `List<T>`,
`Map<String, T>`, named references, and recursive references.

Reference types are conservatively represented as nullable and produce a
`java-nullability-unspecified` semantic note. Full Java classes, interfaces,
generic declarations, wildcards, annotations, methods, constructors,
non-string map keys, data-carrying enums, JavaBeans, and full POJO behavior are
explicitly unsupported. Structural classes are limited to serializable instance
fields. Unit-only enums lower to named string literal unions and report a
semantic note.
