import type {
  JsonSchemaGeneratorOptions,
  JsonSchemaOutput,
} from "@schema-transformation-toolkit/generator-json-schema";
import type { JsonOutput } from "@schema-transformation-toolkit/generator-json";
import type {
  OpenApiGeneratorOptions,
  OpenApiOutput,
} from "@schema-transformation-toolkit/generator-openapi";
import type { TypeScriptGeneratorOptions } from "@schema-transformation-toolkit/generator-typescript";
import type { ZodGeneratorOptions } from "@schema-transformation-toolkit/generator-zod";
import type { YamlOutput } from "@schema-transformation-toolkit/generator-yaml";
import type {
  CsvGeneratorOptions,
  CsvOutput,
} from "@schema-transformation-toolkit/generator-csv";
import type {
  TomlGeneratorOptions,
  TomlOutput,
} from "@schema-transformation-toolkit/generator-toml";
import type { JsonParseOptions } from "@schema-transformation-toolkit/parser-json";
import type { JsonSchemaParseOptions } from "@schema-transformation-toolkit/parser-json-schema";
import type { TypeScriptParseOptions } from "@schema-transformation-toolkit/parser-typescript";
import type { OpenApiParseOptions } from "@schema-transformation-toolkit/parser-openapi";
import type { ZodParseOptions } from "@schema-transformation-toolkit/parser-zod";
import type { YamlParseOptions } from "@schema-transformation-toolkit/parser-yaml";
import type { CsvParseOptions } from "@schema-transformation-toolkit/parser-csv";
import type { TomlParseOptions } from "@schema-transformation-toolkit/parser-toml";
import type { RustParseOptions } from "@schema-transformation-toolkit/parser-rust";
import type { PythonGeneratorOptions } from "@schema-transformation-toolkit/generator-python";
import type { PythonParseOptions } from "@schema-transformation-toolkit/parser-python";
import type { GoGeneratorOptions } from "@schema-transformation-toolkit/generator-go";
import type { GoParseOptions } from "@schema-transformation-toolkit/parser-go";
import type { JavaGeneratorOptions } from "@schema-transformation-toolkit/generator-java";
import type { JavaParseOptions } from "@schema-transformation-toolkit/parser-java";
import type { KotlinGeneratorOptions } from "@schema-transformation-toolkit/generator-kotlin";
import type { KotlinParseOptions } from "@schema-transformation-toolkit/parser-kotlin";
import type { CSharpGeneratorOptions } from "@schema-transformation-toolkit/generator-csharp";
import type { CSharpParserOptions } from "@schema-transformation-toolkit/parser-csharp";

/** Compatibility-only builtin output map. Generic registry output is unknown-safe. */
export interface BuiltinGeneratorOutputs {
  json: JsonOutput;
  "json-schema": JsonSchemaOutput;
  typescript: string;
  zod: string;
  openapi: OpenApiOutput;
  yaml: YamlOutput;
  csv: CsvOutput;
  toml: TomlOutput;
  python: string;
  go: string;
  java: string;
  kotlin: string;
  csharp: string;
}

export interface BuiltinParserOptions {
  json?: JsonParseOptions;
  jsonSchema?: JsonSchemaParseOptions;
  typeScript?: TypeScriptParseOptions;
  openapi?: OpenApiParseOptions;
  zod?: ZodParseOptions;
  yaml?: YamlParseOptions;
  csv?: CsvParseOptions;
  toml?: TomlParseOptions;
  rust?: RustParseOptions;
  python?: PythonParseOptions;
  go?: GoParseOptions;
  java?: JavaParseOptions;
  kotlin?: KotlinParseOptions;
  csharp?: CSharpParserOptions;
}

export interface BuiltinGeneratorOptions {
  jsonSchema?: JsonSchemaGeneratorOptions;
  typeScript?: TypeScriptGeneratorOptions;
  zod?: ZodGeneratorOptions;
  openapi?: OpenApiGeneratorOptions;
  yaml?: Record<string, never>;
  csv?: CsvGeneratorOptions;
  toml?: TomlGeneratorOptions;
  python?: PythonGeneratorOptions;
  go?: GoGeneratorOptions;
  java?: JavaGeneratorOptions;
  kotlin?: KotlinGeneratorOptions;
  csharp?: CSharpGeneratorOptions;
}
