import type { OptionCatalog } from "@schema-transformation-toolkit/core";
export const csharpParserOptionCatalog: OptionCatalog = {
  format: "csharp",
  role: "parser",
  options: [
    {
      key: "entry",
      label: "Root declaration",
      description: "Selects the C# root record.",
      category: "selection",
      defaultValue: "the unique graph root",
      affectedStages: ["parse"],
      semanticEffect:
        "Selects the Shape IR root; other records become definitions.",
      diagnosticEffect:
        "Ambiguous, missing, or unknown entries return structured parse failures.",
      supported: true,
      examples: [
        {
          title: "Select User",
          options: { entry: "User" },
          explanation: "Select User as the root record.",
        },
      ],
    },
  ],
};
