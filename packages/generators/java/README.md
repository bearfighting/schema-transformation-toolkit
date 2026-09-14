# @schema-transformation-toolkit/generator-java

Deterministic Java record/class generator for the shared Shape IR.

The generator consumes Shape IR only. It does not emit Java runtime validation;
source constraints that cannot survive a Java route are reported as structured
SDK semantic losses.

The generator returns one Java source string. The root declaration is public by
default and all other definitions are package-private so the result contains
at most one public top-level declaration. Set `rootVisibility` to
`"package-private"` when the generated source is embedded in another file.

It supports scalar types, arrays, lists, string-keyed records, references,
nullable fields, and representable named string literal unions as unit enums.
Set `declarationStyle: "class"` to generate final classes with public final fields
and a full-argument constructor. Set `packageName` to emit a validated Java
package declaration. It does not generate JavaBeans, Jackson, or Bean Validation metadata.
