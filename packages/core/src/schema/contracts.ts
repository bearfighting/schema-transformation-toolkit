import type { SchemaDiagnostic, SchemaDocument } from "./types.js";

export interface ParseOptions {
  name?: string;
}

export interface PreparedOptions<TResolved> {
  resolved: TResolved;
  warnings: string[];
  errors: string[];
}

export interface ConfiguredParser<
  TParser extends SchemaParser = SchemaParser,
  TResolved = unknown,
> {
  parser: TParser;
  prepared: PreparedOptions<TResolved>;
}

export interface ParseSuccessResult {
  ok: true;
  document: SchemaDocument;
  diagnostics?: SchemaDiagnostic[];
}

export interface ParseFailureResult<TCode extends string = string> {
  ok: false;
  code: TCode;
  message: string;
  diagnostics?: SchemaDiagnostic[];
}

export type ParseResult<TCode extends string = string> =
  | ParseSuccessResult
  | ParseFailureResult<TCode>;

export interface SchemaParser<
  TInput = string,
  TOptions extends ParseOptions = ParseOptions,
  TResult extends ParseResult = ParseResult,
> {
  format: string;
  parse(input: TInput, options?: TOptions): TResult;
}

export type GenerateOptions = Record<never, never>;

export interface ConfiguredGenerator<
  TGenerator extends SchemaGenerator = SchemaGenerator,
  TResolved = unknown,
> {
  generator: TGenerator;
  prepared: PreparedOptions<TResolved>;
}

export interface GenerateSuccessResult<TOutput = string> {
  ok: true;
  output: TOutput;
  diagnostics?: SchemaDiagnostic[];
}

export interface GenerateFailureResult<TCode extends string = string> {
  ok: false;
  code: TCode;
  message: string;
  diagnostics?: SchemaDiagnostic[];
}

export type GenerateResult<TOutput = string, TCode extends string = string> =
  | GenerateSuccessResult<TOutput>
  | GenerateFailureResult<TCode>;

export interface SchemaGenerator<
  TOutput = string,
  TOptions extends GenerateOptions = GenerateOptions,
  TResult extends GenerateResult<TOutput> = GenerateResult<TOutput>,
> {
  target: string;
  generate(document: SchemaDocument, options?: TOptions): TResult;
}
