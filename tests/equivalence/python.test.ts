import { describe, expect, it } from "vitest";
import { tryGeneratePython } from "@schema-transformation-toolkit/generator-python";
import { tryParsePython } from "@schema-transformation-toolkit/parser-python";
import { expectIrEquivalent } from "../helpers/schema-equivalence.js";

describe("Python semantic round trips", () => {
  it("preserves required, nullable, arrays, and named definitions", () => {
    const source = `@dataclass
class Address:
    city: str

@dataclass
class User:
    name: str
    tags: list[str]
    address: Address
    nickname: str | None
`;
    const first = tryParsePython(source, { entry: "User" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const generated = tryGeneratePython(first.document);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const second = tryParsePython(generated.output, {
      entry: "User",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expectIrEquivalent(second.document, first.document);
    expect(second.document.root).toMatchObject({ kind: "object" });
    if (second.document.root.kind !== "object") return;
    expect(second.document.root.fields).toContainEqual(
      expect.objectContaining({
        name: { source: "nickname", words: ["nickname"] },
        required: true,
        nullable: true,
      }),
    );
  });

  it("normalizes Optional and pipe nullable syntax to the same IR", () => {
    const optional = tryParsePython(
      "@dataclass\nclass User:\n    nickname: Optional[str]\n",
    );
    const pipe = tryParsePython(
      "@dataclass\nclass User:\n    nickname: str | None\n",
    );
    expect(optional.ok && pipe.ok).toBe(true);
    if (!optional.ok || !pipe.ok) return;
    expectIrEquivalent(optional.document, pipe.document);
  });

  it("keeps recursive references through generation", () => {
    const parsed = tryParsePython(
      "@dataclass\nclass Node:\n    next: Node | None\n",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const generated = tryGeneratePython(parsed.document);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const reparsed = tryParsePython(generated.output);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expectIrEquivalent(reparsed.document, parsed.document);
  });

  it("preserves nested nullable element semantics through generation", () => {
    const parsed = tryParsePython(
      "@dataclass\nclass Example:\n    values: list[list[str | None]]\n",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.root).toMatchObject({
      kind: "object",
      fields: [
        {
          required: true,
          nullable: false,
          type: {
            kind: "array",
            elementType: {
              kind: "array",
              elementType: { kind: "union" },
            },
          },
        },
      ],
    });
    const generated = tryGeneratePython(parsed.document);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const reparsed = tryParsePython(generated.output);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expectIrEquivalent(reparsed.document, parsed.document);
  });

  it("preserves mutual recursion through generator round-trip", () => {
    const parsed = tryParsePython(
      `@dataclass
class Parent:
    child: Child | None

@dataclass
class Child:
    parent: Parent | None
`,
      { entry: "Parent" },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const generated = tryGeneratePython(parsed.document);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const reparsed = tryParsePython(generated.output, { entry: "Parent" });
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expectIrEquivalent(reparsed.document, parsed.document);
  });

  it("preserves string-keyed maps through Python generation and parsing", () => {
    const parsed = tryParsePython(
      `@dataclass
class User:
    metadata: dict[str, list[str | None]]
`,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const generated = tryGeneratePython(parsed.document);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const reparsed = tryParsePython(generated.output);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expectIrEquivalent(reparsed.document, parsed.document);
  });

  it("round-trips a named map alias root", () => {
    const parsed = tryParsePython("Metadata = dict[str, int]");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const generated = tryGeneratePython(parsed.document);
    expect(generated).toMatchObject({
      ok: true,
      output: expect.stringContaining("Metadata = dict[str, int]"),
    });
    if (!generated.ok) return;
    const reparsed = tryParsePython(generated.output);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expectIrEquivalent(reparsed.document, parsed.document);
  });
});
