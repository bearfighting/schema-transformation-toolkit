# Universal Data Model Converter 测试规划

## 1. 文档目的

本文档定义 Universal Data Model Converter 项目的测试策略、测试分层、测试矩阵、Fixture 组织方式和阶段性实施计划。

当前阶段测试工作的核心目标是：

> 验证不同 Parser 是否能够将语义等价的源格式，稳定、一致地转换为规范化的中间表示（IR）。

但在 2026-07-20 这一时间点，项目实际测试状态已经不再是“只有 Parser → IR 测试基础设施”的早期阶段。
当前仓库已经同时具备：

* 较完整的 IR validation 与 normalization 测试；
* JSON、JSON Schema、TypeScript 三条 Parser 线路的独立测试；
* TypeScript 与 JSON Schema Generator 的独立测试；
* 选定路由的 integration / round-trip 测试；
* SDK route、report、loss、capability 的独立测试；
* public API snapshot 与 package boundary 检查。

因此本文档应被理解为：

* 一个长期目标蓝图；
* 一个针对当前现实进行校准的实施顺序；
* 一个用来识别“还缺哪些体系化能力”的工作文档。

项目采用 Parser → IR → Generator 架构，因此测试重点不能仅停留在最终生成文本是否符合预期，还需要分别验证：

1. Parser 是否正确理解源格式；
2. Parser 是否生成正确的 Value IR、Shape IR 和 Constraint IR；
3. 不同 Parser 对相同语义是否生成等价 IR；
4. Generator 是否正确表达 IR；
5. 语义损失是否被准确识别和报告；
6. 完整转换流程是否稳定；
7. Round-trip 后的语义是否保持等价。

---

# 2. 测试目标

测试体系需要保障以下性质。

## 2.1 Parser 正确性

对于一个给定的源格式输入，Parser 应当：

* 正确解析合法输入；
* 正确拒绝非法输入；
* 生成符合 IR schema 的文档；
* 将 Shape、Constraint 和 Annotation 放入正确的 IR 层；
* 对不支持的语义产生明确诊断；
* 不静默丢弃源格式中的重要语义。

## 2.2 跨 Parser 一致性

对于语义等价的 TypeScript、JSON Schema、JSON 或其他格式输入，它们生成的规范化 IR 应保持等价。

例如：

```ts
interface User {
  id: number;
  name?: string;
}
```

与：

```json
{
  "type": "object",
  "required": ["id"],
  "properties": {
    "id": {
      "type": "number"
    },
    "name": {
      "type": "string"
    }
  }
}
```

应当生成语义等价的 Shape IR。

## 2.3 Generator 正确性

Generator 应当：

* 正确读取规范化 IR；
* 生成语法合法的目标格式；
* 尽可能保留 IR 中的语义；
* 对无法表达的语义报告 normalization、lowering 或 loss；
* 不在没有报告的情况下静默丢失语义。

## 2.4 转换流程正确性

完整转换流程应当验证：

```text
Source
  ↓
Parser
  ↓
IR
  ↓
Generator
  ↓
Target
```

并确保：

* Parser 和 Generator 能正确组合；
* Route planner 选择正确路径；
* Capability 声明与实际运行行为一致；
* Conversion report 包含完整的诊断和语义损失信息。

## 2.5 回归稳定性

测试体系应当让以下修改可以安全进行：

* 扩展 IR；
* 重构 Parser；
* 重构 Generator；
* 新增 Parser；
* 新增 Generator；
* 修改 Capability Registry；
* 修改 normalization 规则；
* 修改输出格式化策略。

## 2.6 当前现实校准

按当前仓库状态，测试体系已经完成了不少原计划中的后半段工作，但组织方式仍然偏“按 package/route 手工铺开”，还没有完全进入理想的 canonical semantic fixture 模型。

可以将当前状态概括为：

* 测试覆盖面已经不错；
* TypeScript parser / generator 的高风险边界最近补得很细；
* SDK report、loss、capability consistency 已经有真实测试；
* 但 cross-parser semantic equivalence 还没有体系化；
* canonical semantic fixture matrix 还没有真正落成；
* output syntax validation、real-world corpus、nightly 类测试仍明显不足。

因此后续工作重点不应再假设“Generator contract tests 还没开始”，而应优先把现有测试组织升级成更可扩展的模型。

## 2.7 近期测试改进重点

按当前真实情况，测试侧的近期重点应收敛为两件事：

1. 抽取 canonical semantic fixtures 与共享断言工具  
   目标不是再手工增加很多分散测试，而是把已经存在的高价值语义覆盖整理成可复用资产。

2. 建立最小 cross-parser semantic equivalence 测试集  
   优先覆盖：
   * primitive 与 literal
   * optional vs nullable
   * tuple vs array
   * record
   * literal union
   * references
   * unknown

在这两项完成前，新增大量新格式测试的收益会低于整理现有测试体系。

---

# 3. 测试原则

## 3.1 测试语义，而不是只测试文本

不同源代码或生成代码可以具有相同语义。

例如：

```ts
interface User {
  name: string;
}
```

和：

```ts
type User = {
  name: string;
};
```

文本不同，但结构语义相同。

因此测试的核心对象应是规范化后的 IR，而不是源代码字符串或输出代码字符串。

---

## 3.2 Parser 与 Generator 独立测试

Parser 测试应直接验证：

```text
Source → IR
```

Generator 测试应直接验证：

```text
Canonical IR → Target
```

Generator 测试不应主要依赖 Parser 构造输入，否则 Parser 的错误会污染 Generator 测试结果。

---

## 3.3 End-to-end 测试只覆盖代表性路径

项目不需要为所有 Parser 和 Generator 组合复制完整语义测试集。

假设未来有：

* 10 个 Parser；
* 10 个 Generator。

完整组合会产生 100 条路径，但大部分语义已经分别在 Parser 和 Generator contract tests 中验证。

因此测试结构应当是：

```text
Parser × Semantic Fixtures
+
Semantic Fixtures × Generator
+
Selected End-to-End Routes
```

而不是：

```text
Parser × Generator × All Semantic Cases
```

---

## 3.4 Round-trip 比较语义等价性

Round-trip 测试不应要求字符串完全一致。

正确的测试方式是：

```text
parse(source)
≈
parse(generate(parse(source)))
```

其中 `≈` 表示规范化后的语义等价，而不是对象引用或文本完全相同。

---

## 3.5 所有语义损失必须显式化

转换结果只允许出现以下情况：

* 完整保留；
* 合法 normalization；
* 明确 lowering；
* 明确 semantic loss；
* 明确 unsupported error。

不允许：

```text
语义被丢弃，但转换仍然静默成功
```

---

# 4. 测试分层

项目测试分为六个层次。

## 4.1 IR Schema Tests

验证 IR 自身的结构约束和 invariant。

主要覆盖：

* Value IR schema；
* Shape IR schema；
* Constraint IR schema；
* Definition 和 Reference；
* IR document version；
* 节点标识符；
* 不允许出现的非法组合；
* normalization 后的结构 invariant。

示例：

```ts
describe("Shape IR schema", () => {
  it("accepts an object with required and optional properties", () => {
    const result = shapeDocumentSchema.safeParse({
      version: "1",
      root: {
        kind: "object",
        properties: {
          id: {
            required: true,
            shape: {
              kind: "number",
            },
          },
          name: {
            required: false,
            shape: {
              kind: "string",
            },
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });
});
```

还应测试非法情况：

```ts
it("rejects a reference to an undefined definition", () => {
  const result = validateIrDocument({
    root: {
      kind: "reference",
      target: "MissingType",
    },
    definitions: {},
  });

  expect(result.ok).toBe(false);
});
```

---

## 4.2 Parser Contract Tests

这是当前最高优先级的测试层。

每个 Parser 都必须通过统一的 Parser Contract。

Parser Contract 至少包括：

1. 合法输入解析；
2. 非法语法处理；
3. Shape 提取；
4. Constraint 提取；
5. Annotation 提取；
6. Definitions 和 References；
7. Source location；
8. Diagnostics；
9. Unsupported semantics；
10. Capability 声明一致性。

统一接口示例：

```ts
interface ParserContractCase {
  name: string;
  source: unknown;
  expectedIr?: IrModel;
  expectedDiagnostics?: ExpectedDiagnostic[];
  expectedCapabilities?: CapabilityId[];
}
```

每个 Parser 通过适配器接入：

```ts
runParserContract({
  parserId: "typescript",
  parse: parseTypeScript,
  fixtures: typescriptFixtures,
});
```

---

## 4.3 Generator Contract Tests

每个 Generator 必须从统一的 canonical IR fixtures 生成目标格式。

Generator Contract 至少包括：

1. 基础类型生成；
2. 对象生成；
3. Optional 和 Nullable；
4. Array、Tuple 和 Record；
5. Union 和 Literal；
6. References；
7. Constraints；
8. Naming；
9. Unsupported semantics；
10. Semantic loss；
11. 输出语法验证；
12. Generator options。

示例：

```ts
runGeneratorContract({
  generatorId: "typescript",
  generate: generateTypeScript,
  validateOutput: parseWithTypeScriptCompiler,
  fixtures: canonicalShapeFixtures,
});
```

---

## 4.4 Cross-Parser Equivalence Tests

该层验证不同 Parser 对相同语义的理解是否一致。

例如：

```text
TypeScript source ─────┐
JSON Schema source ────┼──> normalize(IR) ──> equivalent
Future Zod source ─────┘
```

示例：

```ts
it("parses optional object properties consistently", () => {
  const fromTypeScript = normalizeIr(
    parseTypeScript(`
      interface User {
        id: number;
        name?: string;
      }
    `),
  );

  const fromJsonSchema = normalizeIr(
    parseJsonSchema({
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "number",
        },
        name: {
          type: "string",
        },
      },
    }),
  );

  expectIrEquivalent(fromTypeScript, fromJsonSchema);
});
```

这类测试是检验共享 IR 设计是否合理的重要工具。

---

## 4.5 Selected End-to-End Tests

端到端测试负责验证完整系统集成，而不是穷举所有语义。

当前优先覆盖：

```text
TypeScript → JSON Schema
JSON Schema → TypeScript
JSON → TypeScript
JSON → JSON Schema
```

新增 Rust Generator 后覆盖：

```text
TypeScript → Rust
JSON Schema → Rust
JSON → Rust
```

新增 Zod Parser 后覆盖：

```text
Zod → TypeScript
Zod → JSON Schema
Zod → Rust
```

每条转换路径选择约 5～10 个代表性场景：

* 简单对象；
* 嵌套对象；
* Optional 和 Nullable；
* Array 和 Tuple；
* Union；
* Reference；
* Constraint preservation；
* Semantic loss；
* Unsupported case。

---

## 4.6 Round-trip Tests

Round-trip 测试分成两类。

### 同格式 Round-trip

```text
TypeScript → IR → TypeScript → IR
JSON Schema → IR → JSON Schema → IR
```

验证：

```ts
const initial = normalizeIr(parseTypeScript(source));
const generated = generateTypeScript(initial);
const reparsed = normalizeIr(parseTypeScript(generated.output));

expectIrEquivalent(reparsed, initial);
```

### 跨格式 Round-trip

```text
TypeScript
  → IR
  → JSON Schema
  → IR
  → TypeScript
  → IR
```

跨格式 Round-trip 只适用于两个格式共同支持的语义子集。

如果中间格式不支持某项语义，测试应验证 loss report，而不是要求最终 IR 完全一致。

---

# 5. Semantic Fixture 体系

## 5.1 Fixture 是测试体系的核心

Fixture 不应只表示某种源格式的输入文件，而应表示一个独立的语义场景。

例如：

```text
optional-object-property
nullable-property
string-literal-union
recursive-reference
string-min-length
unsupported-conditional-type
```

每个 Fixture 应包含：

* 唯一 ID；
* 描述；
* canonical IR；
* 不同格式的输入；
* 期望的 Capability；
* 期望的 Diagnostics；
* 期望的 Loss；
* 支持级别。

建议的数据结构：

```ts
interface SemanticFixture {
  id: string;
  description: string;

  canonicalIr?: IrModel;

  sources: Partial<{
    json: unknown;
    jsonSchema: unknown;
    typescript: string;
    zod: string;
  }>;

  expected: {
    capabilities?: CapabilityId[];
    diagnostics?: ExpectedDiagnostic[];
    losses?: ExpectedSemanticLoss[];
  };

  support: Partial<
    Record<
      FormatId,
      | "exact"
      | "normalized"
      | "inferred"
      | "lowered"
      | "lossy"
      | "unsupported"
      | "not-applicable"
    >
  >;
}
```

---

## 5.2 Fixture 目录结构

建议使用：

```text
tests/
  fixtures/
    semantics/
      primitives/
        string.ts
        number.ts
        integer.ts
        boolean.ts
        null.ts
        unknown.ts

      literals/
        string-literal.ts
        number-literal.ts
        boolean-literal.ts

      objects/
        simple-object.ts
        required-property.ts
        optional-property.ts
        nested-object.ts
        empty-object.ts
        additional-properties.ts

      collections/
        homogeneous-array.ts
        tuple.ts
        readonly-tuple.ts
        string-record.ts
        nested-array.ts

      unions/
        primitive-union.ts
        literal-union.ts
        nullable.ts
        union-with-null.ts
        union-of-objects.ts

      references/
        local-reference.ts
        shared-reference.ts
        recursive-reference.ts
        mutual-recursion.ts

      constraints/
        string-min-length.ts
        string-max-length.ts
        string-pattern.ts
        numeric-minimum.ts
        numeric-maximum.ts
        integer.ts
        array-min-items.ts
        array-max-items.ts

      annotations/
        description.ts
        default.ts
        examples.ts
        deprecated.ts

      inference/
        homogeneous-values.ts
        heterogeneous-values.ts
        missing-properties.ts
        nullable-values.ts
        empty-array.ts
        empty-object.ts

      diagnostics/
        invalid-syntax.ts
        unresolved-reference.ts
        unsupported-feature.ts
        conflicting-constraints.ts

      losses/
        constraint-to-typescript.ts
        unknown-lowering.ts
        one-of-normalization.ts
```

---

## 5.3 Canonical IR 与 Source 输入分离

推荐每个 Fixture 独立导出 canonical IR 和各种 source representations。

示例：

```ts
export const optionalPropertyFixture: SemanticFixture = {
  id: "object.optional-property",

  description: "An object containing one required and one optional property",

  canonicalIr: {
    version: "1",
    shape: {
      root: {
        kind: "object",
        properties: {
          id: {
            required: true,
            shape: {
              kind: "number",
            },
          },
          name: {
            required: false,
            shape: {
              kind: "string",
            },
          },
        },
      },
    },
  },

  sources: {
    typescript: `
      interface User {
        id: number;
        name?: string;
      }
    `,

    jsonSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "number",
        },
        name: {
          type: "string",
        },
      },
    },
  },

  support: {
    typescript: "exact",
    jsonSchema: "exact",
    json: "not-applicable",
  },
};
```

---

# 6. Parser → IR 测试矩阵

## 6.1 支持级别定义

测试矩阵不应只使用布尔值。

应定义：

| 状态               | 含义                 |
| ---------------- | ------------------ |
| `exact`          | 源语义完整进入 IR         |
| `normalized`     | 表达形式被规范化，但语义等价     |
| `inferred`       | 语义由值样本推断，存在推断性质    |
| `lowered`        | 转换为更通用或较弱表达        |
| `lossy`          | 部分语义无法保留，必须报告 loss |
| `unsupported`    | 当前明确不支持，应返回诊断      |
| `not-applicable` | 该语义不适用于此格式         |

---

## 6.2 第一阶段矩阵

### Primitive 与 Literal

| Semantic Case   | JSON                | TypeScript | JSON Schema |
| --------------- | ------------------- | ---------- | ----------- |
| string          | inferred            | exact      | exact       |
| number          | inferred            | exact      | exact       |
| integer         | inferred/normalized | normalized | exact       |
| boolean         | inferred            | exact      | exact       |
| null            | inferred            | exact      | exact       |
| unknown         | not-applicable      | exact      | normalized  |
| string literal  | inferred            | exact      | exact       |
| number literal  | inferred            | exact      | exact       |
| boolean literal | inferred            | exact      | exact       |

### Object

| Semantic Case         | JSON                  | TypeScript | JSON Schema |
| --------------------- | --------------------- | ---------- | ----------- |
| simple object         | inferred              | exact      | exact       |
| required property     | inferred              | exact      | exact       |
| optional property     | inferred from samples | exact      | exact       |
| nested object         | inferred              | exact      | exact       |
| empty object          | inferred/ambiguous    | exact      | exact       |
| additional properties | inferred/ambiguous    | normalized | exact       |

### Collection

| Semantic Case       | JSON               | TypeScript | JSON Schema |
| ------------------- | ------------------ | ---------- | ----------- |
| homogeneous array   | inferred           | exact      | exact       |
| heterogeneous array | inferred           | normalized | normalized  |
| tuple               | inferred/ambiguous | exact      | exact       |
| record/map          | inferred/ambiguous | exact      | exact       |
| nested array        | inferred           | exact      | exact       |

### Union 与 Nullable

| Semantic Case       | JSON                  | TypeScript    | JSON Schema      |
| ------------------- | --------------------- | ------------- | ---------------- |
| primitive union     | inferred from samples | exact         | exact            |
| literal union       | inferred from samples | exact         | exact            |
| nullable value      | inferred              | exact         | exact            |
| optional property   | inferred from samples | exact         | exact            |
| union of objects    | inferred              | exact         | exact/normalized |
| discriminated union | inferred/ambiguous    | exact/partial | normalized       |

### Reference

| Semantic Case        | JSON           | TypeScript    | JSON Schema   |
| -------------------- | -------------- | ------------- | ------------- |
| named definition     | not-applicable | exact         | exact         |
| local reference      | not-applicable | exact         | exact         |
| shared reference     | not-applicable | exact         | exact         |
| recursive reference  | not-applicable | exact/partial | exact/partial |
| unresolved reference | not-applicable | diagnostic    | diagnostic    |

### Constraint

| Semantic Case     | JSON           | TypeScript     | JSON Schema |
| ----------------- | -------------- | -------------- | ----------- |
| minLength         | not-applicable | not-applicable | exact       |
| maxLength         | not-applicable | not-applicable | exact       |
| pattern           | not-applicable | not-applicable | exact       |
| minimum           | not-applicable | not-applicable | exact       |
| maximum           | not-applicable | not-applicable | exact       |
| exclusive minimum | not-applicable | not-applicable | exact       |
| minItems          | not-applicable | not-applicable | exact       |
| maxItems          | not-applicable | not-applicable | exact       |

---

# 7. 高风险语义测试

以下语义必须建立专门测试，避免不同格式之间发生概念混淆。

## 7.1 Optional 与 Nullable

必须验证：

```text
optional ≠ nullable
```

以下 TypeScript：

```ts
interface Example {
  value?: string;
}
```

表示属性可能不存在。

以下 TypeScript：

```ts
interface Example {
  value: string | null;
}
```

表示属性必须存在，但值可以是 `null`。

以下形式：

```ts
interface Example {
  value?: string | null;
}
```

表示属性可以不存在，存在时也可以为 `null`。

三者应生成不同 IR。

---

## 7.2 Missing、Undefined 和 Null

必须明确测试：

```text
missing ≠ undefined ≠ null
```

特别需要确定：

* `undefined` 是否属于可序列化数据模型；
* TypeScript `undefined` 如何映射；
* JSON Schema 中不存在属性与 `null` 的区别；
* Generator 无法表达 `undefined` 时如何报告。

---

## 7.3 Union、Enum 和 Literal Union

必须验证：

```text
union ≠ enum ≠ literal union
```

例如：

```ts
type Status = "draft" | "published";
```

和：

```ts
enum Status {
  Draft = "draft",
  Published = "published",
}
```

是否进入相同 IR，需要有明确设计和测试。

即使 Shape 语义相同，命名、成员 metadata 或生成策略也可能不同。

---

## 7.4 Unknown、Any 与 Unconstrained Schema

必须明确测试：

```text
unknown ≠ any ≠ unconstrained schema
```

需要确定：

* `unknown` 是否代表安全的未知值；
* `any` 是否允许绕过类型检查；
* JSON Schema `true` 如何表示；
* 这些语义进入共享 IR 时是否需要 normalization；
* Generator 如何报告 lowering。

---

## 7.5 Tuple 与 Array

必须验证：

```text
[string, number] ≠ Array<string | number>
```

同时测试：

* 固定长度 Tuple；
* 可选 Tuple 元素；
* Rest Tuple；
* Readonly Tuple；
* JSON Schema `prefixItems`；
* JSON Schema 旧版本 tuple 表达。

---

## 7.6 Required Property 与 Value Type

必须确保 required 状态属于对象属性，而不是属性值 Shape。

错误模型：

```ts
{
  name: {
    kind: "optional",
    inner: {
      kind: "string",
    },
  },
}
```

推荐模型应明确区分：

```ts
{
  properties: {
    name: {
      required: false,
      shape: {
        kind: "string",
      },
    },
  },
}
```

除非 IR 已明确选择其他设计，否则测试必须固定项目当前语义。

---

# 8. IR Normalization

## 8.1 为什么需要 Normalization

不同 Parser 可能产生结构上不同、语义上等价的 IR。

例如：

```text
string | null
```

可能被表示为：

```ts
{
  kind: "union",
  members: [
    {
      kind: "string",
    },
    {
      kind: "null",
    },
  ],
}
```

也可能具有 nullable shortcut。

为了进行跨 Parser 比较，需要统一 normalization。

---

## 8.2 Normalization 规则

建议至少包括：

* Union 成员排序；
* Union 扁平化；
* 重复 Union 成员去重；
* Object property 排序；
* Definition 排序；
* Constraint 排序；
* Annotation 排序；
* 等价 scalar 表达归一化；
* Nullable 表达归一化；
* 空 definitions 统一；
* 移除不影响语义的 source metadata；
* 移除 source span；
* 自动生成 ID 的稳定化。

示例：

```ts
export function normalizeIrForTest(ir: IrModel): IrModel {
  return pipe(
    ir,
    flattenUnions,
    deduplicateUnionMembers,
    sortUnionMembers,
    sortObjectProperties,
    sortDefinitions,
    removeSourceLocations,
    normalizeGeneratedIds,
  );
}
```

---

## 8.3 结构等价与语义等价

建议提供两个比较函数：

```ts
expectIrStructurallyEqual(actual, expected);
```

用于严格测试单个 Parser 的输出结构。

```ts
expectIrEquivalent(actual, expected);
```

用于跨 Parser 和 Round-trip 测试。

语义等价比较应当先进行 normalization。

---

# 9. 测试断言工具

不建议所有测试都直接使用完整 snapshot。

应建设一组领域专用断言。

## 9.1 基础断言

```ts
expectValidIr(ir);
expectNoErrors(result);
expectDiagnostic(result, "TS_UNSUPPORTED_CONDITIONAL_TYPE");
expectSemanticLoss(result, "constraint.string.pattern");
expectCapability(result, "shape.object");
```

## 9.2 Shape 断言

```ts
expectShapeKind(ir, "object");
expectRequiredProperty(ir, "id", "number");
expectOptionalProperty(ir, "name", "string");
expectNullableProperty(ir, "description", "string");
expectReference(ir, "address", "Address");
```

## 9.3 Constraint 断言

```ts
expectStringConstraint(ir, path, {
  minLength: 1,
  maxLength: 100,
});

expectNumericConstraint(ir, path, {
  minimum: 0,
  exclusiveMaximum: 100,
});
```

## 9.4 Fluent DSL

后续可以提供：

```ts
expectObject(ir)
  .toHaveRequiredProperty("id", "number")
  .toHaveOptionalProperty("name", "string")
  .toHaveProperty("tags", shape.array(shape.string()))
  .toDisallowAdditionalProperties();
```

这样可以降低测试对 IR 内部存储细节的依赖。

---

# 10. Snapshot 使用策略

Snapshot 适合：

* 完整 Conversion Report；
* Diagnostics；
* Semantic Loss Report；
* Generator 输出；
* 较复杂的 IR fixture；
* CLI 输出。

Snapshot 不适合成为所有语义测试的唯一断言。

建议每个重要测试同时包含：

1. 关键语义的显式断言；
2. 必要时补充 snapshot。

示例：

```ts
const result = parseTypeScript(source);

expectOptionalProperty(result.ir, "name", "string");
expect(result.report).toMatchSnapshot();
```

这样 IR 增加 source metadata 时，不会迫使所有测试无意义更新。

---

# 11. Diagnostics 测试

## 11.1 Diagnostics 数据要求

Diagnostic 至少应包含：

```ts
interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  source?: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  capability?: CapabilityId;
}
```

测试主要断言：

* 稳定的 code；
* severity；
* 相关 capability；
* 是否包含 source location；
* Parser 是否成功或失败。

测试不应过度依赖完整错误文本，因为错误描述可能正常调整。

推荐：

```ts
expect(result.diagnostics).toContainEqual(
  expect.objectContaining({
    code: "TS_UNSUPPORTED_CONDITIONAL_TYPE",
    severity: "error",
  }),
);
```

---

## 11.2 必测错误场景

每个 Parser 至少覆盖：

* 空输入；
* 无效语法；
* 不完整输入；
* 不支持的类型；
* 无法解析的引用；
* 重复定义；
* 冲突定义；
* 非法 Constraint；
* Parser 内部异常转换为结构化错误。

---

# 12. Capability 一致性测试

Capability Registry 必须与真实行为保持一致。

## 12.1 声明能力必须有 Fixture

```ts
for (const capability of parser.capabilities.supported) {
  it(`has a fixture for ${capability}`, () => {
    expect(findFixtureForCapability(capability)).toBeDefined();
  });
}
```

---

## 12.2 Fixture 行为必须符合声明

```ts
for (const fixture of semanticFixtures) {
  const declared = parser.getSupportLevel(fixture.id);
  const actual = runFixture(parser, fixture);

  expect(actual.supportLevel).toBe(declared);
}
```

---

## 12.3 Semantic Loss 必须完整

当 Source capability 不被 Target 支持时，必须出现以下结果之一：

* normalization；
* lowering；
* semantic loss；
* conversion error。

不能静默成功。

```ts
expectConversionDecision({
  sourceCapability: "constraint.string.pattern",
  targetFormat: "typescript",
  expected: "lossy",
});
```

---

# 13. Generator 输出验证

Generator 输出不能只通过字符串 snapshot 验证，还应交给目标格式的官方或标准解析器验证。

## 13.1 TypeScript

使用 TypeScript compiler API：

```ts
const sourceFile = ts.createSourceFile(
  "generated.ts",
  output,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

expect(sourceFile.parseDiagnostics).toHaveLength(0);
```

后续可以增加：

```text
tsc --noEmit
```

验证完整类型文件。

## 13.2 JSON Schema

至少验证：

* 输出是合法 JSON；
* 输出满足目标 JSON Schema draft 的 metaschema；
* `$ref` 可解析；
* definitions/$defs 正确。

## 13.3 Rust

新增 Rust Generator 后，使用：

```text
cargo check
```

或者将输出嵌入临时 crate，通过：

```text
rustc
```

验证语法和类型合法性。

---

# 14. Property-based Testing

在基础 Fixture 稳定后，可以增加 Property-based Tests。

适合测试：

* IR schema 始终有效；
* Generator 不产生语法错误；
* Parser 不因随机合法输入崩溃；
* normalization 具备幂等性；
* equivalent comparison 具备对称性；
* Union 排序不改变语义；
* parse-generate-parse 保持支持子集内的语义。

关键性质：

```ts
normalize(normalize(ir)) === normalize(ir);
```

```ts
equivalent(a, b) === equivalent(b, a);
```

```ts
equivalent(a, b) && equivalent(b, c)
  => equivalent(a, c);
```

```ts
parse(generate(ir))
  ≈ ir;
```

Property-based Testing 不应取代人工语义 Fixture，而应作为补充。

---

# 15. Fuzz Testing

后续可以针对 Parser 增加 Fuzz Testing。

主要目标：

* Parser 不崩溃；
* Parser 不进入无限循环；
* Recursive reference 不造成 stack overflow；
* 极深嵌套得到受控错误；
* 超大 Union 得到受控处理；
* 非法 Unicode 和转义字符得到正确诊断；
* JSON Schema `$ref` cycle 不导致死循环。

建议优先 fuzz：

1. JSON Schema Parser；
2. TypeScript Parser；
3. IR normalization；
4. Reference resolver。

---

# 16. 性能测试

性能不是当前第一优先级，但测试结构中应保留性能基准。

主要场景：

* 100 个 Definition；
* 1,000 个 Definition；
* 深度 50 的嵌套对象；
* 大型 Union；
* 大型 JSON 样本推断；
* 大量 Reference；
* Recursive Reference；
* 多次批量转换。

记录：

* Parser 时间；
* Normalization 时间；
* Generator 时间；
* 内存占用；
* 输出大小。

第一阶段只建立 benchmark，不必设置严格门槛。

后续可以设置回归阈值，例如：

```text
相同 Fixture 的运行时间不得比基准退化超过 30%
```

---

# 17. 测试目录建议

```text
tests/
  fixtures/
    semantics/
    real-world/
    invalid/
    performance/

  helpers/
    normalize-ir.ts
    compare-ir.ts
    parser-contract.ts
    generator-contract.ts
    diagnostic-assertions.ts
    capability-assertions.ts
    shape-assertions.ts
    constraint-assertions.ts
    temporary-project.ts

  ir/
    schema.test.ts
    invariants.test.ts
    normalization.test.ts
    equivalence.test.ts

  parsers/
    json/
      primitives.test.ts
      objects.test.ts
      inference.test.ts
      diagnostics.test.ts
      contract.test.ts

    typescript/
      primitives.test.ts
      objects.test.ts
      collections.test.ts
      unions.test.ts
      references.test.ts
      diagnostics.test.ts
      contract.test.ts

    json-schema/
      primitives.test.ts
      objects.test.ts
      constraints.test.ts
      combinators.test.ts
      references.test.ts
      diagnostics.test.ts
      contract.test.ts

  generators/
    typescript/
      primitives.test.ts
      objects.test.ts
      unions.test.ts
      references.test.ts
      losses.test.ts
      syntax.test.ts
      contract.test.ts

    json-schema/
      primitives.test.ts
      objects.test.ts
      constraints.test.ts
      references.test.ts
      losses.test.ts
      metaschema.test.ts
      contract.test.ts

  equivalence/
    typescript-json-schema.test.ts
    json-inference.test.ts

  integration/
    selected-routes.test.ts
    sdk.test.ts
    registry.test.ts
    planner.test.ts
    conversion-report.test.ts

  round-trip/
    typescript.test.ts
    json-schema.test.ts
    cross-format.test.ts

  property/
    normalization.property.test.ts
    round-trip.property.test.ts

  performance/
    parser.bench.ts
    generator.bench.ts
    conversion.bench.ts
```

如果每个 package 已经采用 colocated tests，可以将具体 Parser 和 Generator 测试放在各自 package 中，但建议 semantic fixtures 和 contract helpers 保持共享。

---

# 18. Real-world Corpus

Canonical fixtures 用于精确测试单项语义，但还需要真实世界样本验证组合情况。

第一阶段建议收集 15～20 个 corpus：

* 常见 REST API DTO；
* GitHub API 风格对象；
* OpenAPI 中提取的 Schema；
* npm package configuration；
* `package.json` 类型；
* `tsconfig.json` 类型；
* 用户资料对象；
* 分页 API；
* Error response；
* Discriminated union；
* Recursive tree；
* JSON Schema 官方示例；
* TypeScript 类型定义示例。

Real-world corpus 测试重点：

* Parser 不崩溃；
* 输出 IR 有效；
* Diagnostics 可理解；
* Generator 输出语法合法；
* Loss report 完整；
* Round-trip 不产生非预期语义漂移。

真实样本不应替代小型 semantic fixtures，因为真实样本出现错误时很难快速定位具体语义。

---

# 19. CI 测试分组

建议将 CI 分为三层。

## 19.1 Pull Request 必跑

每次 PR 必须运行：

```text
lint
typecheck
unit tests
IR schema tests
parser contract tests
generator contract tests
selected integration tests
```

目标是保持较快反馈。

按当前仓库实际，这一层已经基本存在于日常验证流程中，至少应稳定覆盖：

```text
check:public-api
typecheck
targeted parser tests
targeted generator tests
selected integration tests
sdk contract tests
```

## 19.2 Main Branch 必跑

合并到 main 后运行：

```text
全部 PR 测试
全部 end-to-end tests
round-trip tests
real-world corpus
output syntax validation
package build tests
```

## 19.3 Nightly

每日或定期运行：

```text
property-based tests
fuzz tests
large corpus
performance benchmarks
all parser-generator routes
```

完整的 N×M smoke matrix 可以放在 nightly 中，而不是每个 PR 穷举。

当前现实中，19.2 与 19.3 描述的内容大多仍属于目标状态，而不是已落地流程。
因此短期更重要的是先补齐：

* output syntax validation；
* minimal real-world corpus；
* cross-parser equivalence smoke set；
* 再考虑 property-based、fuzz、performance。

---

# 20. 覆盖率指标

不建议只追求代码行覆盖率。

测试指标应包括四类。

## 20.1 代码覆盖率

建议初始目标：

```text
Statements: 80%
Branches:   75%
Functions:  80%
Lines:      80%
```

Parser 和 IR normalization 可以设更高目标。

## 20.2 Semantic Coverage

记录 canonical semantic cases 数量：

```text
Total semantic fixtures
Fixtures supported by each parser
Fixtures supported by each generator
Exact/normalized/lossy/unsupported distribution
```

## 20.3 Capability Coverage

```text
Declared capabilities with tests / total declared capabilities
```

目标必须达到 100%。

每个声明为 supported 的 Capability 必须至少有一个正向测试。

## 20.4 Route Coverage

记录：

```text
Parser → Generator route 是否至少有 smoke test
```

不要求每条 route 覆盖全部 semantic fixtures。

---

# 21. 第一阶段实施计划

原始版本把第一阶段重点定义为 Parser → IR 测试体系。
这在项目较早阶段是合理的，但按当前实际状态，第一阶段中的多项内容已经部分完成，后续更需要把零散测试能力收敛成统一模型。

因此当前应将“第一阶段”理解为：

* 巩固现有 parser / generator / sdk / integration 测试；
* 抽取 canonical semantic fixtures；
* 建立最小 cross-parser equivalence 体系；
* 用更少重复代码覆盖更多语义与 route。

## Milestone 1：测试基础设施

完成：

* `SemanticFixture` 类型；
* IR normalization；
* IR equivalence；
* Parser contract runner；
* 基础领域断言；
* Fixture 自动发现；
* Capability 与 Fixture 映射。

当前状态评估：

* `IR normalization`、`IR equivalence`、基础领域断言已经有真实实现和测试；
* 但 `SemanticFixture`、统一 contract runner、fixture 自动发现、capability-to-fixture 映射还没有真正落地成共享基础设施；
* 因此这个里程碑应视为“部分完成，但仍是最值得补的结构性缺口”。

验收标准：

* 一个 Fixture 可以被多个 Parser 复用；
* Parser 测试可以统一执行；
* 跨 Parser 可以比较规范化 IR。

下一步应优先落地的最小子集：

* 共享 `SemanticFixture` 类型；
* 一组 shared semantic helper / assertion helper；
* 最小 fixture loader 或注册表；
* 至少一条 TypeScript / JSON Schema / JSON 可复用的 semantic fixture 流程。

---

## Milestone 2：基础 Shape Fixtures

优先完成约 20 个 Fixture：

### Primitive

* string；
* number；
* integer；
* boolean；
* null；
* unknown；
* string literal；
* number literal。

### Object

* simple object；
* required property；
* optional property；
* nested object；
* empty object。

### Collection

* homogeneous array；
* tuple；
* record。

### Union

* primitive union；
* literal union；
* nullable；
* union of objects。

当前状态评估：

* 这些语义中的大部分，其实已经以 parser tests、generator tests、integration tests 的形式存在；
* TypeScript parser 和 generator 对 object / tuple / record / union / reference / unknown 的覆盖已经明显超出“还未开始”阶段；
* 但这些测试还没有统一提升为 canonical reusable fixtures，所以该里程碑应被视为“语义已覆盖不少，组织方式仍未完成”。

验收标准：

* TypeScript Parser 完整接入；
* JSON Schema Parser 完整接入；
* JSON Parser 对适用场景完成接入；
* 跨 Parser 等价测试通过。

---

## Milestone 3：References 与 Constraints

新增约 15 个 Fixture：

### References

* local reference；
* shared reference；
* recursive reference；
* mutual recursion；
* unresolved reference。

### Constraints

* minLength；
* maxLength；
* pattern；
* minimum；
* maximum；
* exclusive range；
* minItems；
* maxItems；
* required properties；
* additional properties。

当前状态评估：

* JSON Schema parser / generator 对 constraint 与 additionalProperties 已经有不少测试；
* TypeScript parser 的 reference、entry、reachable definition、failure matrix 也已经形成较强覆盖；
* 真正还缺的是“跨 parser 的同语义等价比较”以及更明确的 fixture/support-level 标注。

验收标准：

* Shape 和 Constraint 明确分层；
* Reference normalization 稳定；
* Unsupported 和 partial support 有明确诊断。

---

## Milestone 4：Diagnostics 与 Loss

新增约 10 个 Fixture：

* invalid syntax；
* unsupported TypeScript type；
* unresolved reference；
* conflicting constraints；
* constraint loss to TypeScript；
* `oneOf` normalization；
* unknown lowering；
* annotation loss；
* unsupported external reference；
* recursive limit。

当前状态评估：

* 这一里程碑的很多内容其实已经部分落地，尤其是：
  * stable diagnostic code；
  * generator-side truthfulness diagnostics；
  * sdk report / semantic caveat / loss coverage；
* 但 unsupported external reference、recursive limit、系统化 loss matrix 仍不算真正完成。

验收标准：

* 所有失败都有稳定 diagnostic code；
* 所有语义损失都有 loss report；
* 不存在已知的静默丢失。

---

## Milestone 5：Generator Contract

使用 canonical fixtures 接入：

* TypeScript Generator；
* JSON Schema Generator。

完成：

* IR → Generator 独立测试；
* 输出语法验证；
* Loss 验证；
* Generator options 验证。

当前状态评估：

* 这部分已经不是未来计划，而是当前正在真实发生的工作；
* TypeScript generator 已经具备：
  * naming collision failures；
  * invalid record-key failure；
  * integer widening diagnostics；
  * unknown widening diagnostics；
  * unknown-absorbs-union diagnostics；
  * options 覆盖与 selected integration coverage；
* JSON Schema generator 也已有相当多 target-policy 与 widening 测试。

因此接下来 Generator Contract 的重点不应只是“开始写测试”，而应转向：

* 提炼 canonical generator fixtures；
* 增加 output syntax validation；
* 减少不同文件中的重复断言辅助代码。

---

## Milestone 6：Selected End-to-End 和 Round-trip

完成：

* 现有主要路径的代表性 E2E；
* TypeScript 同格式 Round-trip；
* JSON Schema 同格式 Round-trip；
* TypeScript ↔ JSON Schema 支持子集 Round-trip；
* Conversion report snapshot。

当前状态评估：

* selected E2E 和 selected round-trip 已经存在，并且不是空壳；
* 当前缺口不在“有没有 E2E”，而在：
  * 是否有更明确的 smoke / representative / exhaustive 分层；
  * 是否建立了 cross-parser equivalence；
  * 是否引入真实世界样本与 syntax validation。

因此接下来不建议把主要精力继续投入在“再多加几条孤立 E2E”，而应优先让 E2E 与 semantic fixtures、capability coverage、syntax validation 形成更清晰的层次关系。

---

# 22. 第一阶段建议工作量

建议第一阶段控制在约 40～50 个 semantic fixtures。

分布如下：

| 分类                  | 数量 |
| ------------------- | -: |
| Primitive 与 Literal |  8 |
| Object              |  7 |
| Collection          |  5 |
| Union 与 Nullable    |  7 |
| Reference           |  5 |
| Constraint          | 10 |
| Diagnostics 与 Loss  |  8 |
| 合计                  | 50 |

这些 Fixture 可以同时驱动多个 Parser 和 Generator，因此实际形成的测试数量会明显超过 50，但不需要手工复制大量测试代码。

---

# 23. 新 Parser 接入标准

在 Test Matrix 建立后，新 Parser 不应仅以“能够解析几个示例”为完成标准。

一个新 Parser 的最低接入要求：

1. 实现统一 Parser interface；
2. 声明 Capability；
3. 通过适用的基础 Parser Contract；
4. 接入 semantic fixtures；
5. 为所有 unsupported semantics 提供诊断；
6. 不产生无报告的语义损失；
7. 至少通过一条 end-to-end route；
8. 提供文档化的支持矩阵。

例如新增 Zod Parser 时，不需要重新设计测试体系，只需要声明：

```text
哪些已有 Fixture 为 exact
哪些为 normalized
哪些为 lossy
哪些为 unsupported
```

然后运行相同 contract。

---

# 24. 新 Generator 接入标准

一个新 Generator 的最低接入要求：

1. 实现统一 Generator interface；
2. 声明输入 Capability；
3. 通过适用的 Generator Contract；
4. 使用 canonical IR fixtures；
5. 输出通过目标语言解析器或编译器；
6. 所有 unsupported semantics 有明确报告；
7. 至少通过一条 end-to-end route；
8. 提供 target-specific options 测试。

例如 Rust Serde Generator 应至少通过：

* primitive；
* object；
* optional；
* nullable mapping policy；
* array；
* tuple；
* record；
* named reference；
* simple enum；
* union lowering；
* invalid identifier normalization；
* `cargo check`。

---

# 25. Definition of Done

## Parser Fixture 完成标准

一个 Parser Fixture 只有同时满足以下条件才算完成：

* 输入明确表达单一主要语义；
* 预期 IR 已定义；
* IR 通过 schema validation；
* 关键语义使用显式断言；
* Diagnostics 已验证；
* Capability support level 已记录；
* 必要的 normalization 已说明；
* 没有未记录的语义损失。

## Generator Fixture 完成标准

* 输入使用 canonical IR；
* 输出文本符合预期；
* 输出通过目标格式语法验证；
* 关键语义得到保留；
* normalization/lowering/loss 被验证；
* Generator options 有测试；
* 测试不依赖不相关 Parser。

## 新格式完成标准

* Contract tests 通过；
* Capability matrix 完成；
* 主要 semantic fixtures 接入；
* Diagnostics 稳定；
* 至少一个真实样本通过；
* 至少一条 E2E route 通过；
* 文档与实现一致。

---

# 26. 当前优先级结论

现阶段测试优先级为：

```text
1. 巩固现有 IR / Parser / Generator / SDK 测试，不让 truthfulness 回退
2. 抽取 canonical semantic fixtures 与共享断言工具
3. 建立最小 cross-parser semantic equivalence 测试集
4. 建立 capability coverage 的自动化校验
5. 增加 generator output syntax validation
6. 维护 selected end-to-end tests 与 round-trip smoke sets
7. 引入 minimal real-world corpus
8. Property-based 与 fuzz tests
9. Performance tests
```

按当前实际，在完成前四到五项之前，不建议同时增加多个新格式方向。
继续横向扩 Parser / Generator 数量，会让现有“覆盖还不错但组织未收敛”的问题更快放大。

合理的开发顺序是：

```text
Stabilize current parser / generator truthfulness
  ↓
Extract canonical fixtures and shared helpers
  ↓
Minimal cross-parser equivalence matrix
  ↓
Capability coverage automation
  ↓
Output syntax validation
  ↓
Selected E2E / round-trip / corpus layers
  ↓
Then consider new parser or generator families
```

换句话说，当前最缺的不是“多写几条单独测试”，而是把已经存在的大量有效测试整理成更可扩展、更可复用的体系。

## 26.1 近期执行重点

基于当前仓库状态，测试方面下一步应明确聚焦：

```text
1. canonical semantic fixtures
2. cross-parser semantic equivalence
```

只有在这两个方面开始成形后，再继续扩大量新的 route 测试、nightly 体系或新格式接入，整体投入产出比才会更高。

---

# 27. 最终目标

这套测试体系最终应当使项目具备以下能力：

> 新增一种格式时，不需要重新手写所有格式之间的组合测试，只需要证明该格式如何进入或离开 canonical IR，并明确说明其能力边界和语义损失。

理想测试模型为：

```text
Every Parser
    ↓
Canonical Semantic Fixture Matrix
    ↓
Every Generator
```

端到端的 N×M 路径主要承担集成和 smoke test，而语义正确性由 Parser Contract、Generator Contract 和 Canonical IR Fixtures 共同保证。

这将使项目能够在格式数量不断增加时，仍保持测试规模可控、语义边界明确和转换结果可回归。
