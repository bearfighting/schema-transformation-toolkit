# Universal Data Model Converter 测试改造计划（2026-07 校准版）

## 1. 文档目的

本文档定义 Universal Data Model Converter 项目的测试策略、测试分层、测试矩阵、Fixture 组织方式和阶段性实施计划。

当前阶段测试工作的核心目标是：

> 验证不同 Parser 是否能够将语义等价的源格式，稳定、一致地转换为规范化的中间表示（IR）。

但在 2026-07-20 这一时间点，项目实际测试状态已经不再是“只有 Parser → IR 测试基础设施”的早期阶段。
当前仓库已经同时具备：

- 较完整的 IR validation 与 normalization 测试；
- JSON、JSON Schema、TypeScript 三条 Parser 线路的独立测试；
- TypeScript 与 JSON Schema Generator 的独立测试；
- 选定路由的 integration / round-trip 测试；
- SDK route、report、loss、capability 的独立测试；
- public API snapshot 与 package boundary 检查。

因此本文档应被理解为：

- 一个长期目标蓝图；
- 一个针对当前现实进行校准的实施顺序；
- 一个用来识别“还缺哪些体系化能力”的工作文档。

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

- 正确解析合法输入；
- 正确拒绝非法输入；
- 生成符合 IR schema 的文档；
- 将 Shape、Constraint 和 Annotation 放入正确的 IR 层；
- 对不支持的语义产生明确诊断；
- 不静默丢弃源格式中的重要语义。

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

- 正确读取规范化 IR；
- 生成语法合法的目标格式；
- 尽可能保留 IR 中的语义；
- 对无法表达的语义报告 normalization、lowering 或 loss；
- 不在没有报告的情况下静默丢失语义。

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

- Parser 和 Generator 能正确组合；
- Route planner 选择正确路径；
- Capability 声明与实际运行行为一致；
- Conversion report 包含完整的诊断和语义损失信息。

## 2.5 回归稳定性

测试体系应当让以下修改可以安全进行：

- 扩展 IR；
- 重构 Parser；
- 重构 Generator；
- 新增 Parser；
- 新增 Generator；
- 修改 Capability Registry；
- 修改 normalization 规则；
- 修改输出格式化策略。

## 2.6 当前现实校准

按当前仓库状态，测试体系已经完成了不少原计划中的后半段工作，但组织方式仍然偏“按 package/route 手工铺开”，还没有完全进入理想的 canonical semantic fixture 模型。

可以将当前状态概括为：

- 测试覆盖面已经不错；
- TypeScript parser / generator 的高风险边界最近补得很细；
- SDK report、loss、capability consistency 已经有真实测试；
- 但 cross-parser semantic equivalence 还没有体系化；
- canonical semantic fixture matrix 还没有真正落成；
- output syntax validation、real-world corpus、nightly 类测试仍明显不足。

因此后续工作重点不应再假设“Generator contract tests 还没开始”，而应优先把现有测试组织升级成更可扩展的模型。

## 2.7 近期测试改进重点

按当前真实情况，测试侧的近期重点应收敛为两件事：

1. 抽取 canonical semantic fixtures 与共享断言工具  
   目标不是再手工增加很多分散测试，而是把已经存在的高价值语义覆盖整理成可复用资产。

2. 建立最小 cross-parser semantic equivalence 测试集  
   优先覆盖：
   - primitive 与 literal
   - optional vs nullable
   - tuple vs array
   - record
   - literal union
   - references
   - unknown

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

- 10 个 Parser；
- 10 个 Generator。

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

- 完整保留；
- 合法 normalization；
- 明确 lowering；
- 明确 semantic loss；
- 明确 unsupported error。

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

- Value IR schema；
- Shape IR schema；
- Constraint IR schema；
- Definition 和 Reference；
- IR document version；
- 节点标识符；
- 不允许出现的非法组合；
- normalization 后的结构 invariant。

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

- 简单对象；
- 嵌套对象；
- Optional 和 Nullable；
- Array 和 Tuple；
- Union；
- Reference；
- Constraint preservation；
- Semantic loss；
- Unsupported case。

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

- 唯一 ID；
- 描述；
- canonical IR；
- 不同格式的输入；
- 期望的 Capability；
- 期望的 Diagnostics；
- 期望的 Loss；
- 支持级别。

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

| 状态             | 含义                            |
| ---------------- | ------------------------------- |
| `exact`          | 源语义完整进入 IR               |
| `normalized`     | 表达形式被规范化，但语义等价    |
| `inferred`       | 语义由值样本推断，存在推断性质  |
| `lowered`        | 转换为更通用或较弱表达          |
| `lossy`          | 部分语义无法保留，必须报告 loss |
| `unsupported`    | 当前明确不支持，应返回诊断      |
| `not-applicable` | 该语义不适用于此格式            |

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

- `undefined` 是否属于可序列化数据模型；
- TypeScript `undefined` 如何映射；
- JSON Schema 中不存在属性与 `null` 的区别；
- Generator 无法表达 `undefined` 时如何报告。

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

- `unknown` 是否代表安全的未知值；
- `any` 是否允许绕过类型检查；
- JSON Schema `true` 如何表示；
- 这些语义进入共享 IR 时是否需要 normalization；
- Generator 如何报告 lowering。

---

## 7.5 Tuple 与 Array

必须验证：

```text
[string, number] ≠ Array<string | number>
```

同时测试：

- 固定长度 Tuple；
- 可选 Tuple 元素；
- Rest Tuple；
- Readonly Tuple；
- JSON Schema `prefixItems`；
- JSON Schema 旧版本 tuple 表达。

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

- Union 成员排序；
- Union 扁平化；
- 重复 Union 成员去重；
- Object property 排序；
- Definition 排序；
- Constraint 排序；
- Annotation 排序；
- 等价 scalar 表达归一化；
- Nullable 表达归一化；
- 空 definitions 统一；
- 移除不影响语义的 source metadata；
- 移除 source span；
- 自动生成 ID 的稳定化。

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

- 完整 Conversion Report；
- Diagnostics；
- Semantic Loss Report；
- Generator 输出；
- 较复杂的 IR fixture；
- CLI 输出。

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

- 稳定的 code；
- severity；
- 相关 capability；
- 是否包含 source location；
- Parser 是否成功或失败。

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

- 空输入；
- 无效语法；
- 不完整输入；
- 不支持的类型；
- 无法解析的引用；
- 重复定义；
- 冲突定义；
- 非法 Constraint；
- Parser 内部异常转换为结构化错误。

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

- normalization；
- lowering；
- semantic loss；
- conversion error。

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

- 输出是合法 JSON；
- 输出满足目标 JSON Schema draft 的 metaschema；
- `$ref` 可解析；
- definitions/$defs 正确。

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

- IR schema 始终有效；
- Generator 不产生语法错误；
- Parser 不因随机合法输入崩溃；
- normalization 具备幂等性；
- equivalent comparison 具备对称性；
- Union 排序不改变语义；
- parse-generate-parse 保持支持子集内的语义。

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

- Parser 不崩溃；
- Parser 不进入无限循环；
- Recursive reference 不造成 stack overflow；
- 极深嵌套得到受控错误；
- 超大 Union 得到受控处理；
- 非法 Unicode 和转义字符得到正确诊断；
- JSON Schema `$ref` cycle 不导致死循环。

建议优先 fuzz：

1. JSON Schema Parser；
2. TypeScript Parser；
3. IR normalization；
4. Reference resolver。

---

# 16. 性能测试

性能不是当前第一优先级，但测试结构中应保留性能基准。

主要场景：

- 100 个 Definition；
- 1,000 个 Definition；
- 深度 50 的嵌套对象；
- 大型 Union；
- 大型 JSON 样本推断；
- 大量 Reference；
- Recursive Reference；
- 多次批量转换。

记录：

- Parser 时间；
- Normalization 时间；
- Generator 时间；
- 内存占用；
- 输出大小。

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

- 常见 REST API DTO；
- GitHub API 风格对象；
- OpenAPI 中提取的 Schema；
- npm package configuration；
- `package.json` 类型；
- `tsconfig.json` 类型；
- 用户资料对象；
- 分页 API；
- Error response；
- Discriminated union；
- Recursive tree；
- JSON Schema 官方示例；
- TypeScript 类型定义示例。

Real-world corpus 测试重点：

- Parser 不崩溃；
- 输出 IR 有效；
- Diagnostics 可理解；
- Generator 输出语法合法；
- Loss report 完整；
- Round-trip 不产生非预期语义漂移。

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

- output syntax validation；
- minimal real-world corpus；
- cross-parser equivalence smoke set；
- 再考虑 property-based、fuzz、performance。

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

# 21. 2026-07 测试改造计划

本节取代“继续按大类堆 milestone”的写法，改为贴近当前仓库状态的改造路线。

截至 2026-07-21，可确认的现实前提是：

- 仓库已经具备成体系的 parser、generator、sdk、integration 测试；
- 当前主要问题不是“没有测试”，而是“测试语义资产尚未抽取成共享基础设施”；
- 继续横向增加零散 route tests 的边际收益，已经低于整理现有测试模型的收益；
- 因此近期应优先改造测试组织方式，而不是优先重构生产代码或扩新格式。

## 21.1 改造目标

本轮改造希望在不削弱当前回归保护的前提下，完成四件事：

1. 把分散在 parser / generator / integration 中的高价值语义场景，抽取为可复用的 canonical semantic fixtures。
2. 建立最小可运行的 cross-parser semantic equivalence 测试层。
3. 把 generator 输出验证从“字符串正确”升级为“字符串正确且目标格式合法”。
4. 为 capability、diagnostic、loss 三类 truthfulness contract 增加更明确的自动化校验入口。

## 21.1.1 2026-07-21 当前已完成进展

截至 2026-07-21，这一轮测试改造的第一版已经落地，且不再只是计划：

- `tests/fixtures/semantics` 已建立共享 `SemanticFixture` 基础设施、共享导出入口与 selector；
- `tests/helpers` 已建立 IR equivalence、diagnostic assertions、generator contract、capability coverage、constraint assertions、real-world corpus 等共享 helper；
- integration / parser / generator 测试中最重复的一批 success-branch 样板、generator event builders、definition-name helpers 已抽取到共享 helper；
- canonical semantic fixtures 已覆盖 primitive、optional / nullable、tuple、record、literal / primitive union、local / shared / recursive reference，以及一批约束与 annotation 场景；
- `typescript <-> json-schema` 的最小 cross-parser equivalence smoke 已落地；
- TypeScript generator 语法校验与 JSON Schema generator 结构校验已落地，并挂到 generator contract 测试层；
- capability coverage automation 已落地，当前声明为 supported 的 JSON Schema parser / generator capability 已有对应 fixture 覆盖；
- 最小 real-world corpus 已落地，当前已覆盖 6 个跨 JSON、TypeScript、JSON Schema 的真实风格样例；
- 全量本地验证已通过，最近一次 `pnpm test` 为 `38` 个 test files、`428` 个 tests 通过。

## 21.2 非目标

本轮改造明确不以以下事项为主要目标：

- 不追求一次性重写现有全部测试文件；
- 不先做大规模生产代码架构重构；
- 不先建立完整 property-based、fuzz、performance 体系；
- 不在测试基础设施尚未收敛前，同时引入多个新 parser / generator 家族。

## 21.3 工作流分层

改造后的测试体系应当稳定分成六层：

1. IR / core invariant tests
2. parser contract tests
3. generator contract tests
4. cross-parser equivalence tests
5. selected integration and round-trip smoke tests
6. corpus / nightly / stress-style tests

其中第 1、2、3、5 层已经有较强基础；当前最需要补的是第 4 层，以及让第 2、3 层共享同一批 semantic fixtures。

---

# 22. 近期执行顺序

## Phase A：测试基础设施收敛

目标：

- 定义共享 `SemanticFixture` 类型；
- 建立 `tests/fixtures/semantics` 目录；
- 建立最小 fixture registry 或显式导出索引；
- 引入 shared assertion helpers；
- 引入 `normalizeIrForTest` 和 `expectIrEquivalent` 的统一入口。

建议先落地的 helper：

- `expectValidIr`
- `expectDiagnosticCode`
- `expectSemanticLossCode`
- `expectShapeKind`
- `expectOptionalProperty`
- `expectNullableProperty`
- `expectReference`
- `expectIrEquivalent`

完成标准：

- 至少一个 TypeScript fixture、一个 JSON Schema fixture、一个 JSON inference fixture 可以走同一套 helper；
- 新增一个语义 case 时，不需要再在多个测试文件中复制大段断言；
- 现有高价值测试可以开始逐步迁移，而不是要求一次性迁完。

当前状态：

- 已完成第一版；
- 共享 fixture 类型、registry 入口、selector 与 assertion helpers 已存在；
- `expectOk`、TypeScript / JSON Schema generator event builders、definition-name helpers 已开始替代 route-local 重复样板；
- 后续重点不再是“从 0 到 1 建设施工”，而是继续扩 fixture 密度和复用范围。

## Phase B：最小 canonical semantic fixture 集

目标不是一次做到 50 个以上 fixture，而是先做一组最小但高杠杆的共享语义集。

第一批建议固定为 12 个：

- primitive.string
- primitive.number
- primitive.boolean
- primitive.null
- primitive.unknown
- object.required-property
- object.optional-property
- object.nullable-property
- collection.array
- collection.tuple
- collection.record
- union.literal-union

第二批再补 8 个：

- object.nested-object
- union.primitive-union
- union.optional-vs-nullable
- reference.local-reference
- reference.shared-reference
- reference.recursive-reference
- constraint.string-min-length
- constraint.closed-object

完成标准：

- 每个 fixture 都有清晰 ID、描述、source variants、support level；
- 每个 fixture 至少有一个 canonical IR 或 canonical semantic assertion 入口；
- TypeScript / JSON Schema / JSON 三条线路对适用场景能明确标注 `exact`、`normalized`、`inferred` 或 `not-applicable`。

当前状态：

- 已完成第一版且超出最初最小集；
- 目前共享 fixture 已包含 `primitive.string`、`primitive.unknown`、`object.optional-property`、`object.nullable-property`、`collection.record`、`collection.optional-tuple-member`、`reference.local-reference`、`reference.shared-reference`、`reference.recursive-reference`、`union.primitive-union`、`union.literal-union`、`constraint.string-min-length`、`constraint.closed-object`、`annotation.description`、`constraint.numeric-minimum`、`constraint.array-min-items`；
- 下一步重点是继续补齐高频 required-property、array、nested-object、presence-vs-nullability 等语义，而不是回到分散 route test 模式。

## Phase C：cross-parser semantic equivalence

这是当前最缺的一层，应在 fixture 基础设施成形后立即开始。

首批 equivalence smoke set 只覆盖七类高风险语义：

- primitive 与 literal
- optional vs nullable
- tuple vs array
- record
- literal union
- references
- unknown

完成标准：

- 至少存在 `typescript <-> json-schema` 的双边等价验证；
- 对 JSON inference，只在适用且可稳定表达的语义上接入；
- equivalence 失败时能定位到具体 fixture，而不是只看到整条 route 失败。

当前状态：

- 已完成最小 smoke 版本；
- `tests/equivalence/typescript-json-schema.test.ts` 已覆盖 shared fixtures 驱动的双边等价验证；
- 下一步重点是扩充 fixture 覆盖面，而不是另起一套独立 equivalence 测试风格。

## Phase D：generator 输出合法性验证

当前 generator 测试已经不少，但还偏重字符串断言。下一步应补：

- TypeScript output syntax validation
- JSON Schema output structural validation
- `$ref` 完整性验证

建议实施顺序：

1. 先对 TypeScript generator 接入 `ts.createSourceFile(...).parseDiagnostics` 校验。
2. 再对 JSON Schema generator 建立合法 JSON、`$defs` / `$ref` 完整性、目标 draft 基本约束校验。
3. 最后把这层验证挂到 generator contract helpers，而不是散落在个别集成测试里。

完成标准：

- generator contract 测试对“输出不可解析”有独立红灯；
- 语义断言与语法断言解耦；
- 生成器输出的失败边界比现在更早、更清晰。

当前状态：

- 已完成第一版；
- TypeScript generator 已有编译器 API 语法校验；
- JSON Schema generator 已有结构合法性与 `$ref` 完整性校验入口；
- 这两层已经接入 generator contract smoke，而不是只散落在个别集成测试中。

## Phase E：truthfulness automation

在 fixture 和 equivalence 层建立后，再补自动化一致性检查：

- declared capability 必须有至少一个对应 fixture
- lossy / lowering / normalization 必须有明确测试入口
- stable diagnostic code 必须在测试中被直接断言

完成标准：

- capability coverage 可以输出缺失项；
- 语义损失不会只通过 E2E 间接暴露；
- parser / generator / sdk 的说明文档更容易保持同步。

当前状态：

- 已完成第一版 capability coverage automation；
- 当前自动化已直接校验 parser / generator 的 capability 声明是否被 shared fixtures 覆盖；
- diagnostic / loss 侧也已有 shared assertion helpers，但后续仍可继续扩大稳定 code 与 loss-case 的矩阵密度。

---

# 23. 建议工作量与分批策略

建议把这一轮改造控制在 4 个小批次内完成，而不是开一个“大测试重构”长期分支。

## Batch 1

- 建立 `SemanticFixture` 类型
- 建立 shared helpers
- 迁移 3～5 个代表性 case

当前状态：已完成。

## Batch 2

- 补足第一批 12 个 canonical fixtures
- 建立最小 `typescript <-> json-schema` equivalence tests

当前状态：已完成第一版，且 fixture 数已超过原先最小 smoke 目标。

## Batch 3

- 补第二批 8 个 fixture
- 接入 TypeScript generator syntax validation
- 接入 JSON Schema generator structural validation

当前状态：已完成第一版。

## Batch 4

- 增加 capability coverage automation
- 增加最小 real-world corpus
- 重新整理 selected E2E / round-trip 的职责边界

当前状态：

- capability coverage automation 已完成；
- 最小 real-world corpus 已完成；
- selected E2E / round-trip 的职责边界已经更清晰，且一批 integration / parser 测试的重复 success-branch 样板已完成首轮收敛；
- 后续仍可继续收紧旧测试的角色分工，但当前已经不再需要为同一类 generator / parser 事件在多条 route 中反复手写同构断言。

每个 batch 都应满足：

- 不要求迁移全部旧测试；
- 不降低当前通过率；
- 新旧测试可短期并存；
- 每批都能独立合并并产生明确收益。

---

# 24. Definition of Done

## Fixture / helper 基础设施完成标准

- 共享 fixture 类型已稳定；
- 至少两个 parser 和一个 generator 已接入；
- 新增语义 case 的样板代码显著减少；
- normalization 与 equivalence 比较不再散落在各文件中各写一版。

## Cross-parser equivalence 完成标准

- 已覆盖近期定义的七类高风险语义；
- 至少存在一组稳定的 smoke matrix；
- 测试失败可直接定位到 semantic fixture ID；
- 不再依赖整段 route 输出比对来间接证明“两个 parser 语义一致”。

## Generator validation 完成标准

- TypeScript 输出经过编译器 API 语法检查；
- JSON Schema 输出经过结构合法性校验；
- 字符串 snapshot 不再是 generator 正确性的唯一依据；
- widening / loss / normalization 仍保留显式断言。

## 本轮改造完成标准

- 共享 semantic fixtures 已成为新增测试的默认入口；
- cross-parser equivalence 已形成最小体系；
- generator syntax validation 已落地；
- capability / diagnostic / loss 自动化检查已有第一版；
- selected integration tests 数量可以继续保持克制，而不会削弱信心。

按 2026-07-21 的状态看，上述目标中的前四项已完成第一版；最后一项也已进入可持续收敛阶段，并已体现为 shared helper 抽取、route-local 样板减少、integration / parser / generator 职责边界更清晰。

---

# 25. 新格式接入标准

在改造后的模型中，新 parser 或新 generator 的接入标准应保持统一。

## 新 Parser

一个新 Parser 的最低要求：

1. 实现统一 Parser interface。
2. 声明 capability。
3. 接入适用的 semantic fixtures。
4. 通过 parser contract tests。
5. 对 unsupported semantics 提供稳定 diagnostics。
6. 至少通过一条 selected route 或 equivalence smoke path。

## 新 Generator

一个新 Generator 的最低要求：

1. 实现统一 Generator interface。
2. 声明输入 capability。
3. 接入 canonical IR fixtures。
4. 通过 generator contract tests。
5. 输出通过目标语言或目标格式校验。
6. 对 lowering / widening / loss 提供稳定报告。

关键点不是“为新格式再手写一套测试”，而是让它接入已有 semantic matrix。

---

# 26. 当前优先级结论

按 2026-07-21 的仓库状态，测试相关工作的推荐顺序应固定为：

```text
1. 保持现有 parser / generator / sdk truthfulness 不回退
2. 抽取 canonical semantic fixtures 与 shared helpers
3. 建立最小 cross-parser semantic equivalence
4. 增加 generator output syntax validation
5. 增加 capability / diagnostic / loss automation
6. 再整理 E2E、round-trip、corpus 层
7. 最后再考虑 property、fuzz、performance 或新增格式族
```

这意味着当前最该避免的事情是：

- 继续只靠增加孤立 integration tests 来扩覆盖；
- 在 fixture 基础设施缺失时同时大幅扩新格式；
- 用大量字符串快照代替语义断言和目标格式校验。

## 26.1 推荐的第一批实际改动

如果按投入产出比排序，最值得先做的 5 个具体改动是：

1. 新建 `tests/fixtures/semantics` 与 `tests/helpers`
2. 提取最小 `SemanticFixture` 类型和注册表
3. 落地第一批 12 个 canonical fixtures
4. 新建 `tests/equivalence/typescript-json-schema.test.ts`
5. 为 TypeScript generator 增加语法有效性断言入口

这一批实际改动已经完成。下一阶段更值得优先做的是：

1. 继续扩 shared semantic fixtures，优先补齐高频缺口而非追求大而全
2. 把更多 generator / parser truthfulness case 迁入 shared helpers
3. 继续补强 real-world corpus 与 selected round-trip 边界
4. 在不制造重复的前提下，逐步压缩职责重叠的旧集成测试，并把仍保留的 route tests 明确限定在 route-specific 行为上

## 26.2 第二阶段待办

按 2026-07-21 的状态，这一轮测试改造更适合定义为“首轮架构落地已完成，第二阶段进入扩覆盖与继续收敛”，而不是“所有测试改造都已结束”。

第二阶段最值得继续完成的事项是：

1. 继续补 shared semantic fixtures 的高频缺口
2. 继续把 generator / parser / sdk 的 truthfulness case 迁入 shared helpers
3. 继续压缩与 fixture / contract / equivalence 层职责重叠的 integration smoke
4. 继续扩最小 real-world corpus，使其对 shared IR 和 generators 形成更真实的组合压力

按 2026-07-21 当前进展看：

- 第 1 项已完成一轮明显推进：shared fixtures 已补入 `object.required-property`、`collection.array`、`object.nested-object`、`union.optional-vs-nullable`，以及多组 `reference + constraint`、constraint bundle、annotation bundle、config-like / paginated-response / multi-definition graph 场景；
- 第 2 项也已开始进入 fixture 驱动：SDK semantic-loss 规划已覆盖多类 shared fixture，generator contract 中的 unknown truthfulness 断言也已从单点手写 case 提升为读取 fixture 元数据的共享入口；
- 第 3 项已进入持续收敛阶段：四条主要 JSON / JSON Schema 源路由以及一批 TypeScript 源路由的基础 smoke 已开始从完整 payload / full-output snapshot 断言，收敛为更聚焦的 route-specific 断言；
- 第 4 项也已进入持续扩充阶段：minimal corpus 已从早期的最小集合扩到 10 个 case，并开始覆盖 widening-heavy schema bundle、OpenAPI-components-style bundle、dashboard-style TypeScript shape 与 workspace-style JSON config。

### 26.2.1 Fixture 扩充

优先补充的高频语义缺口应包括：

- `object.required-property`
- `collection.array`
- `object.nested-object`
- `union.optional-vs-nullable`
- 更多 `reference + constraint` 组合
- 更多 annotation 组合

目标不是单纯追求 fixture 数量，而是让高频 shared semantics 都有统一入口，而不是继续散落在 route-local tests 中。

### 26.2.2 Truthfulness Matrix 扩充

虽然 capability coverage automation 已经落地，但 truthfulness matrix 仍可继续系统化。

下一步值得补的是：

- widening / lowering / normalization / loss 的更明确矩阵化覆盖
- stable diagnostic code 的更统一断言入口
- parser / generator / sdk 三层对同一语义 caveat 的一致性检查

目标是让“行为正确”进一步收敛成“行为正确且解释一致”。

当前这一项的最新落地包括：

- shared diagnostic assertion helpers 已支持按 code 列表批量断言，减少 generator / sdk contract 中重复样板；
- `primitive.unknown` 已在 shared fixture 元数据中声明 TypeScript 与 JSON Schema generator 的 truthfulness expectation；
- TypeScript / JSON Schema generator contract tests 已消费 fixture-level expectation，而不是继续手写特例断言。
- `union.literal-with-unknown` 已进入 shared fixture catalog，并同时驱动 TypeScript generator truthfulness 与 `json-schema -> typescript` SDK report semantic caveat 断言。
- `object.integer-property` 已进入 shared fixture catalog，并同时驱动 TypeScript generator truthfulness 以及 `json -> typescript` / `json-schema -> typescript` 两条 route 的 SDK semantic caveat 断言。
- 多个 constraint / annotation fixture 已开始声明 `json-schema -> typescript` 的 `semanticLosses` expectation，`sdk/losses` 与 `sdk/api-contract` 已共享同一批 fixture-level loss 期望，而不是各自维护独立表格。
- 选定的 `json -> typescript` 与 `json-schema -> typescript` integration tests 已开始下调对共享 integer-widening payload 的逐项断言，改为优先锁定 route-specific 输出形态、配置行为与引用展开，避免继续与 fixture / generator contract 层重复证明同一 caveat。
- 选定的 `json -> json-schema` integration tests 也已开始采用同样策略：保留输出形态、generator 选项行为与 union/unknown 路由级结果校验，但把重叠的 generator policy / widening event 断言收敛为更轻量的 code-level 存在性检查。
- 选定的 `json-schema -> json-schema` integration tests 也已开始对 wide-unknown route case 做同类收敛：继续锁定 parser-to-generator 组合后的输出结构和 widening 点数量，但不再逐项复刻完整 generator event payload。

### 26.2.3 Integration / Round-trip 收敛

当前 selected integration and round-trip tests 已经完成首轮样板收敛，但还没有完全进入“少而贵”的状态。

第二阶段应继续区分两类测试：

- 应保留的测试：route-specific 行为、definition reachability、round-trip fixpoint、配置组合行为
- 应迁走或弱化的测试：只是重复 shared fixture 语义、重复 generator event、重复 parser success branch 的 smoke

完成后，integration 层应主要承担 route 特有风险，而不是继续重复证明共享语义。

按 2026-07-21 当前盘点，integration 层可以再细分为三档：

- 已开始明显收敛的路由：
  `json -> typescript`、`json-schema -> typescript`、`json -> json-schema`、`json-schema -> json-schema` 已开始把 shared widening / policy payload 从完整对象断言收敛为 output + code-level presence / count 检查。
- 当前保留价值较高、暂不建议继续瘦身的路由：
  `json-schema -> json-schema` 中的 constraint round-trip、mixed fixed-field + typed additionalProperties failure、broader type array failure、allOf failure、external ref failure，仍然在覆盖 parser 与 generator 组合边界，不只是共享语义重复。
- 下一批更适合继续盘点的路由：
  `typescript -> typescript` 与 `typescript -> json-schema` 仍以“完整输出结构断言”为主，其中有一部分测试在语义上接近 shared fixture 已覆盖内容，后续可优先检查 basic object / tuple / literal / readonly 这类 case 是否应降级成更聚焦的 route-specific 断言。

当前 integration 文件的系统盘点结论可以概括为：

- `typescript -> typescript` 目前更像“TypeScript route snapshot pack”，强项是 definition reachability、unused declaration trimming、fixpoint round-trip、enum normalization、readonly normalization；短板是其中部分 basic shape case 与 shared fixture / equivalence 的职责已经开始重叠。
- `typescript -> json-schema` 当前主要价值集中在 `$defs` reachability、enum lowering、readonly normalization、nested record + union composition；其中第一条“supported declarations into JSON Schema”最像下一批可收敛候选。
- `json -> typescript` 与 `json -> json-schema` 当前已经基本回到“parser inference mode + generator option + route failure surface”的职责，后续再瘦身应非常克制。
- `json-schema -> typescript` 与 `json-schema -> json-schema` 当前最值得保留的是 unknown lowering、reference-resolved widening、constraint extraction / re-emission 与 parser boundary failures；已经收敛过的 payload 细节不必再回退成完整 event object 断言。

这轮盘点后的最新推进是：

- `typescript -> typescript` 已开始先收最基础的 object / tuple / optional-tuple smoke，用更轻的 success + key-line 断言替代完整输出快照；
- `typescript -> json-schema` 已开始先收最基础的 object / readonly normalization smoke，改为优先锁定 root reference、`$defs` reachability 与关键 property shape，而不是整份输出对象逐层等值；
- `typescript -> typescript` 也已继续收 literal root、enum normalization、enum member reference、readonly normalization 这批基础 smoke；
- `typescript -> json-schema` 也已开始收 enum lowering 这批基础 smoke，把完整输出对象等值缩到更聚焦的 `$defs` / `$ref` / key property 断言；
- `typescript -> typescript` 与 `typescript -> json-schema` 还已开始收 nested inline object、mixed declaration style、nested record + array / union composition 这批基础 composition smoke；
- 这说明下一批 TypeScript 源路由收敛可以继续沿“基础 shared shape 先收、definition reachability / enum normalization / fixpoint case 后收”的顺序推进。

### 26.2.4 Real-world Corpus 扩充

当前 corpus 已足够证明方向，但仍属于最小版。

下一步更值得补的是：

- 多层 `$defs` / reference 组合
- nested unions / records / tuples 的真实风格输入
- constraint 与 annotation 更密集的真实 schema
- 更接近 OpenAPI / config / manifest 风格的样例

目标是让 corpus 从“验证架构存在”逐步升级为“持续提供真实压力”。

按当前 corpus 盘点，`tests/real-world/minimal-corpus.test.ts` 与 `tests/fixtures/real-world/minimal-corpus.ts` 已覆盖：

- 3 个 JSON case：`package-manifest`、`tsconfig-like`、`workspace-pipeline-config`
- 3 个 TypeScript case：`paginated-response`、`audit-feed`、`dashboard-config`
- 4 个 JSON Schema case：`openapi-user-response`、`pagination-response`、`loose-bundle-document`、`openapi-components-bundle`

这套 corpus 已经能证明：

- 三类 source format 都能进入 shared IR 并重新生成两个 target；
- JSON Schema corpus 中的 constraints / annotations 能通过 generator 继续保真；
- config-style 与 API-style 输入已经不再只是单层 toy examples；
- widening-heavy schema bundle、OpenAPI-style bundle、dashboard-style TypeScript shape 与 workspace-style JSON config 都已开始提供更真实的组合压力。

但它仍然明显缺少以下压力：

- 多层 `$defs` + unknown / true-schema widening 混合出现的真实 schema；
- 同时包含 tuple、record、union、nullable、reference 的更大 TypeScript source；
- 更接近 OpenAPI component / response bundle 的 JSON Schema 样本，而不是单一 response shape；
- 更接近 monorepo config / workflow manifest 风格、包含嵌套 map 和 heterogeneous option clusters 的 JSON 样本。

如果开始第三轮 corpus 扩充，建议优先顺序是：

1. 新增一个多层 `$defs` + loose map + nested true schema 的 JSON Schema corpus case
2. 新增一个更接近 OpenAPI `components.schemas` 风格的 JSON Schema corpus case
3. 新增一个包含 nested tuple / record / union / readonly 的 TypeScript corpus case
4. 新增一个更复杂的 JSON config / manifest corpus case

按 2026-07-21 当前进展看，第 1 项已经开始落地：

- `json-schema.loose-bundle-document` 已进入 minimal corpus，覆盖多层 `$defs`、open map、nested true schema、array item ref 与 root-level reusable ref 组合；
- 对应 corpus 测试已开始单独锁定这类 widening-heavy schema 在 generator 侧仍然可结构化重建，而不只是参与通用“parse + regenerate”循环。

第 2 项也已开始落地：

- `json-schema.openapi-components-bundle` 已进入 minimal corpus，覆盖更接近 OpenAPI `components.schemas` 风格的 reusable entity、paged data、error payload、oneOf response envelope 与 mixed constraint / annotation 组合；
- 对应 corpus 测试已开始单独锁定 `$defs` graph、response envelope 结构、`User` / `PageInfo` / `PaginatedUsers` 之间的引用关系，以及关键 `minLength` / `minimum` / `minItems` 保真结果。

第 3 项也已开始落地：

- `typescript.dashboard-config` 已进入 minimal corpus，覆盖 readonly normalization、nested tuple optionality、record map、union config shape、nullable tuple member 与 reusable definitions 的组合压力；
- 对应 corpus 测试已开始单独锁定 TypeScript target 上的 key-line 结果，以及 JSON Schema target 上的 tuple `prefixItems`、record `additionalProperties`、union `oneOf` 与 root `$defs` graph 结构。

第 4 项也已开始落地：

- `json.workspace-pipeline-config` 已进入 minimal corpus，覆盖更复杂的 JSON config / manifest 风格输入，包括 nested option clusters、environment/task map、nullable field、boolean flag 与 array-heavy leaf nodes；
- 对应 corpus 测试已开始单独锁定 TypeScript target 上的 nested object cluster 结果，以及 JSON Schema target 上 `workspace` / `environments` / `tasks` / `notifications` 四层结构的可重建性。

按本轮完整回归后的判断，这一轮测试 refactoring 可以暂时告一段落：

- 当前没有发现需要先阻塞后续工作的 parser / IR / generator correctness 问题；
- 当前最主要的剩余工程性重复，已经从测试侧转移到 diagnostics / validation 一类 consumer 中反复手写的 `Shape IR` traversal；
- 因此下一阶段的主目标可以切换为 shared IR traversal / visitor 提取，并把现有 fixture、truthfulness、integration、corpus 作为回归护栏。

### 26.2.5 第二阶段完成标准

可以用以下标准判断第二阶段是否基本完成：

- 常见语义新增时，默认先补 fixture，而不是先补 route test
- integration tests 主要只保留 route-specific 行为
- generator / parser 的主要 truthfulness case 都能走 shared helpers
- corpus 不再只是演示性样例，而开始形成稳定的真实回归压力

---

# 27. 最终目标

这套测试改造完成后，项目应进入如下模型：

```text
Every Parser
    ↓
Canonical Semantic Fixtures
    ↓
Parser / Generator Contracts
    ↓
Cross-Parser Equivalence
    ↓
Selected E2E and Round-trip Smoke
```

最终想要达到的不是“测试文件越来越多”，而是：

- 新增语义时，有统一入口补 fixture；
- 新增格式时，有统一入口声明 support level；
- 改动 IR 或 normalization 时，有统一入口验证等价性；
- 改动 generator 时，能同时看到语义、loss、syntax 三层反馈。

到那时，端到端 N×M 组合测试只承担集成和 smoke 职责，语义正确性则主要由 canonical fixtures、contract tests 和 equivalence tests 保证。
