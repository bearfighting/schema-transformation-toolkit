import type { OptionCatalog } from "@schema-transformation-toolkit/core";

export const csharpGeneratorOptionCatalog: OptionCatalog = {
  format: "csharp",
  role: "generator",
  options: [
    {
      key: "style",
      label: "Declaration style",
      description: "Generates object shapes as records or classes.",
      category: "formatting",
      defaultValue: "record",
      affectedStages: ["generate"],
      semanticEffect:
        "Controls whether object shapes use sealed records or sealed classes.",
      diagnosticEffect: "Invalid styles fail generation.",
      supported: true,
      examples: [
        {
          title: "Class output",
          options: { style: "class" },
          explanation: "Generate sealed classes with init-only properties.",
        },
      ],
    },
    {
      key: "namespace",
      label: "Namespace",
      description: "Adds a file-scoped C# namespace to generated source.",
      category: "formatting",
      defaultValue: undefined,
      affectedStages: ["generate"],
      semanticEffect: "Controls generated namespace text without changing IR.",
      diagnosticEffect: "Invalid namespace values fail generation.",
      supported: true,
      examples: [
        {
          title: "Model namespace",
          options: { namespace: "Example.Models" },
          explanation: "Emit a file-scoped namespace declaration.",
        },
      ],
    },
  ],
};
