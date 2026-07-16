import { describe, expect, it } from "vitest";
import * as sdkModule from "../../packages/sdk/src/index.js";

describe("sdk api contract", () => {
  it("re-exports the TypeScript parser surface", () => {
    expect(sdkModule.typeScriptParser).toBeDefined();
    expect(sdkModule.configureTypeScriptParser).toBeDefined();
    expect(sdkModule.preprocessTypeScriptSource).toBeDefined();
    expect(sdkModule.createTypeScriptSourceFile).toBeDefined();
  });

  it("re-exports the JSON Schema parser surface", () => {
    expect(sdkModule.jsonSchemaParser).toBeDefined();
    expect(sdkModule.configureJsonSchemaParser).toBeDefined();
    expect(sdkModule.inferJsonSchemaDocument).toBeDefined();
    expect(sdkModule.tryInferJsonSchemaDocument).toBeDefined();
  });
});
