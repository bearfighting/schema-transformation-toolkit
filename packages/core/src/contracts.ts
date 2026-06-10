import type { SchemaDocument } from "./types.js";

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
  TResolved = unknown
> {
  parser: TParser;
  prepared: PreparedOptions<TResolved>;
}

export interface ParseSuccessResult {
  ok: true;
  document: SchemaDocument;
}

export interface ParseFailureResult {
  ok: false;
  code: string;
  message: string;
}

export type ParseResult = ParseSuccessResult | ParseFailureResult;

export interface SchemaParser<
  TInput = string,
  TOptions extends ParseOptions = ParseOptions,
  TResult extends ParseResult = ParseResult
> {
  format: string;
  parse(input: TInput, options?: TOptions): TResult;
}

export interface GenerateOptions {}

export interface ConfiguredGenerator<
  TGenerator extends SchemaGenerator = SchemaGenerator,
  TResolved = unknown
> {
  generator: TGenerator;
  prepared: PreparedOptions<TResolved>;
}

export interface GenerateSuccessResult<TOutput = string> {
  ok: true;
  output: TOutput;
}

export interface GenerateFailureResult {
  ok: false;
  code: string;
  message: string;
}

export type GenerateResult<TOutput = string> =
  | GenerateSuccessResult<TOutput>
  | GenerateFailureResult;

export interface SchemaGenerator<
  TOutput = string,
  TOptions extends GenerateOptions = GenerateOptions,
  TResult extends GenerateResult<TOutput> = GenerateResult<TOutput>
> {
  target: string;
  generate(document: SchemaDocument, options?: TOptions): TResult;
}
