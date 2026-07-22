# IR Traversal Review Notes

> 项目：Universal Data Model Converter  
> 评审范围：Schema IR traversal、reference traversal、visitor context、path、测试与未来 transformation 支撑  
> 文档目标：保留 traversal 评审结论，并为主计划文档提供背景材料

## 使用方式

这份文档现在应被视为：

- 一份评审记录
- 一份问题清单与长期改进素材

它不再是 traversal 的主执行计划。

当前真正指导实现的文档是：

- [schema-traversal.md](schema-traversal.md)

阅读顺序建议：

1. 先读 `schema-traversal.md` 了解当前执行计划
2. 只有在需要判断某项长期增强是否值得推进时，再回来看这份评审笔记

## 结论摘要

这份评审文档里的问题并不都属于当前阶段的同一优先级。

按当前仓库状态，应这样理解：

- `document traversal` 语义拆分、reference follow 状态显式化、child enumeration 抽取，属于近期应推进事项
- traversal / transform 入口语义对齐、transform reference policy 显式化，也属于近期已经开始落地的事项
- typed path、wrapper-level hooks、reference stack、visitor control，属于下一阶段候选项
- iterative traversal、跨 IR 统一 walker、mutation-capable traversal，属于明显更晚的工作

如果这份文档中的某条建议与 `schema-traversal.md` 的当前计划冲突，应以 `schema-traversal.md` 为准。

---

## 1. 执行摘要

当前 IR traversal 的整体方向是正确的。

它已经不再只是某个 parser 或 generator 内部的递归辅助函数，而正在成为 Schema IR 的公共基础设施。现有实现已经包含：

- Schema document 与单节点遍历入口；
- `preserve` 与 `follow` 两种 reference 策略；
- definition lookup；
- reference cycle protection；
- `parent`、`containingDefinition`、`via`、`path` 等访问上下文；
- validation 对 traversal 的实际复用。

这些设计证明 traversal 抽象已经开始产生真实价值，尤其是 validation 不再需要为每种 SchemaNode 重写递归逻辑。

不过，当前实现更适合被定义为：

> 一个同步、只读、前序遍历的 SchemaNode walker。

它暂时还不应被视为完整、稳定的 IR traversal framework，也尚不足以直接支撑未来的：

- capability analysis；
- conversion loss report；
- reference dependency graph；
- immutable IR transformation；
- constraint attachment；
- source mapping；
- 多层 IR 联动；
- schema visualization。

当前最急需解决的不是继续增加 visitor 功能，而是稳定 traversal 的四个基础语义：

1. 遍历哪些根节点；
2. reference 如何展开；
3. 节点可能被访问多少次；
4. path 如何稳定、无歧义地定位节点。

---

## 2. 当前实现的积极成果

### 2.1 Reference traversal 被显式建模

当前实现使用类似下面的策略类型：

```ts
export type SchemaWalkReferenceMode = "preserve" | "follow";
```

这是一个重要且正确的设计决定。

#### `preserve`

访问 reference node 本身，但不进入其目标 definition。

适用于：

- generator；
- reference occurrence 检查；
- dependency collection；
- preserving schema structure；
- validation missing reference。

#### `follow`

访问 reference node 后，继续进入目标 definition。

适用于：

- reachable schema analysis；
- capability analysis；
- 展开后的语义检查；
- recursive structure inspection。

Reference 是否展开不应由 traversal 隐式决定。当前实现把它变成显式选项，为未来设计留下了合理空间。

---

### 2.2 Cycle protection 基本合理

当前实现使用当前 reference chain 的访问记录防止递归环路，而不是使用整个 document 级别的全局 visited set。

这种方式能够正确处理：

```text
A -> B -> A
```

同时仍允许下面的结构分别访问 `User`：

```text
Order.billingUser -> User
Order.shippingUser -> User
```

这是一种 path-based cycle detection，而不是 global deduplication。

该设计符合 occurrence traversal 的基本语义。

---

### 2.3 `via` 提供了比字符串 path 更丰富的上下文

当前 traversal 通过类似下面的关系描述节点是如何被访问到的：

```ts
{
  kind: ("field", fieldName);
}
{
  kind: ("unionMember", index);
}
{
  kind: ("referenceResolution", referenceName);
}
```

这比单纯查看 path 的最后一个字符串更可靠。

未来它可以用于：

- diagnostics；
- target capability analysis；
- loss report；
- schema tree UI；
- reference graph；
- structured logging；
- transformation context。

---

### 2.4 Validation 已开始复用 traversal

未知 reference 检查已经通过公共 walker 实现，而不是在 validation 中维护另一套 SchemaNode switch。

这是 traversal 设计是否有价值的重要验证。

它说明 traversal 已经开始承担：

> Schema IR 上统一结构访问协议

这一职责。

接下来应继续推动其他只读分析复用 traversal，但在扩散使用前，需要先稳定其语义。

---

## 3. 核心问题与风险

---

## 3.1 P0：Document traversal 与 reference follow 的语义混合

当前 `walkSchemaDocument()` 的行为大致是：

1. 遍历全部 definitions；
2. 遍历 root；
3. 在 `references: "follow"` 时，再从 reference occurrence 进入对应 definition。

例如：

```text
definitions:
  Address
  User -> Address

root -> User
```

一次 traversal 可能访问：

```text
Address definition
User definition
  Address through User
root reference User
  User through root
    Address through User
```

这个行为不一定错误，但它同时混合了多种不同的 traversal 模型。

### 可能的 traversal 模型

#### Document structural traversal

遍历文档中物理存在的所有节点。

目标：

- 每个 definition 被声明级访问；
- root 被访问；
- reference 默认不展开；
- 适合 lint、format、文档检查。

#### Root-reachable semantic traversal

只从 root 开始，并根据配置展开 reference。

目标：

- 找到实际可达类型；
- 忽略未使用 definitions；
- 适合 generator、capability analysis。

#### Per-occurrence traversal

每次 reference occurrence 都展开目标 definition。

目标：

- 对每个使用位置进行上下文相关分析；
- 同一 definition 可能访问多次；
- 适合 target-specific loss analysis。

#### Once-per-definition traversal

从 root 展开引用，但每个 definition 最多进入一次。

目标：

- dependency graph；
- reachable definition collection；
- 避免大型 schema 重复遍历。

### 当前风险

如果 API 不明确区分这些模式，下面的功能可能出现统计错误或语义歧义：

- node count；
- capability count；
- unsupported feature count；
- unknown node count；
- target loss report；
- schema complexity；
- reachable definition analysis；
- dependency extraction。

### 建议

不要只使用一个 `references` 参数表达所有行为。

可以拆分为正交选项：

```ts
interface SchemaWalkOptions {
  roots?: "root-only" | "definitions-and-root";
  references?: "preserve" | "follow";
  referenceVisits?: "per-occurrence" | "once-per-definition";
}
```

更推荐提供语义明确的入口：

```ts
walkSchemaDocumentStructure(document, visitor);

walkSchemaDocumentFromRoot(document, visitor, {
  references: "follow",
  referenceVisits: "per-occurrence",
});

walkSchemaDefinitions(document, visitor);
```

### 推荐结论

短期应优先拆分：

```ts
walkSchemaDocumentStructure();
walkSchemaDocumentFromRoot();
```

避免让一个函数承担冲突的语义。

---

## 3.2 P0：当前字符串 path 不稳定且存在歧义

当前 path 的构造方式不完全统一。

可能出现：

```text
["root", "users", "elementType"]
["definitions", "User", "address"]
["root", "0"]
```

其中：

```text
["root", "0"]
```

可能表示：

- tuple element 0；
- union member 0；
- 名为 `"0"` 的 object field。

类似地：

```text
["root", "elementType"]
```

可能表示：

- array element；
- 名为 `elementType` 的 object field。

虽然当前 visitor 还可以结合 `via` 消歧，但 path 一旦被写入以下输出，通常不会保留完整 traversal context：

- diagnostic；
- CLI output；
- conversion report；
- JSON report；
- Web UI state；
- logs；
- source map。

### 建议：使用 typed path segments

```ts
type SchemaPathSegment =
  | { kind: "root" }
  | { kind: "definition"; name: string }
  | { kind: "field"; name: string }
  | { kind: "arrayElement" }
  | { kind: "tupleElement"; index: number }
  | { kind: "unionMember"; index: number }
  | { kind: "recordKey" }
  | { kind: "recordValue" };
```

Context 中保存：

```ts
interface SchemaWalkContext {
  path: readonly SchemaPathSegment[];
}
```

再提供统一格式化器：

```ts
formatSchemaPath(path, "human");
formatSchemaPath(path, "json-pointer");
formatSchemaPath(path, "diagnostic");
```

示例：

```text
/root/fields/users/type/elementType
/definitions/User/type/fields/address/type
/root/members/0
```

### 为什么要优先解决

Path 会成为以下能力的共同基础：

- validation；
- loss report；
- transformation diagnostics；
- UI 定位；
- source mapping；
- test assertions；
- schema diff。

一旦大量模块依赖当前字符串数组，再重构成本会显著提高。

---

## 3.3 P0：Field、Tuple Element 和 Definition 不是一等访问对象

当前 visitor 主要访问 `SchemaNode`。

对于 object：

```ts
walkNode(field.type, ...)
```

对于 tuple：

```ts
walkNode(element.type, ...)
```

因此 visitor 无法直接访问完整的：

- `SchemaFieldNode`；
- `SchemaTupleElement`；
- `SchemaDefinition`；
- `SchemaDocument`。

### 遗失的重要语义

#### Field-level semantics

- field name；
- required；
- nullable；
- metadata；
- description；
- default；
- deprecated；
- field constraints。

#### Tuple-element semantics

- index；
- required；
- metadata；
- future label；
- element-level constraints。

#### Definition-level semantics

- definition name；
- definition metadata；
- declaration path；
- annotations；
- visibility；
- source mapping。

当前 visitor 可能只能这样工作：

```ts
enter(context) {
  if (context.via?.kind === "field") {
    // 只能拿到 fieldName
    // 若需要 required，只能回到 parent.fields 中再次查找
  }
}
```

这会造成：

- 重复查找；
- 逻辑分散；
- visitor 实现复杂；
- field wrapper 语义被忽略；
- constraint IR 难以挂接。

### 建议

为 wrapper IR element 增加独立 hooks：

```ts
interface SchemaWalkVisitor {
  enterDocument?(context: SchemaDocumentWalkContext): SchemaWalkControl;
  leaveDocument?(context: SchemaDocumentWalkContext): void;

  enterDefinition?(context: SchemaDefinitionWalkContext): SchemaWalkControl;
  leaveDefinition?(context: SchemaDefinitionWalkContext): void;

  enterField?(context: SchemaFieldWalkContext): SchemaWalkControl;
  leaveField?(context: SchemaFieldWalkContext): void;

  enterTupleElement?(context: SchemaTupleElementWalkContext): SchemaWalkControl;

  leaveTupleElement?(context: SchemaTupleElementWalkContext): void;

  enterNode?(context: SchemaNodeWalkContext): SchemaWalkControl;
  leaveNode?(context: SchemaNodeWalkContext): void;
}
```

不需要把 field 强行变成 `SchemaNode`。

更合理的方式是：

> 保持 IR 类型边界，但让 traversal 承认 wrapper 也是可访问的 IR element。

---

## 3.4 Reference context 的概念需要拆分

当 traversal follow 一个 reference 时，当前 context 中可能出现：

- path 仍指向 reference occurrence；
- parent 是 reference node；
- containingDefinition 变成 target definition。

例如：

```text
definition Order:
  customer: reference User
```

进入 `User` 后，可能同时存在：

- occurrence path：`definitions/Order/customer`；
- lexical definition：`User`；
- source definition：`Order`；
- target definition：`User`；
- parent：reference `User`。

当前 `containingDefinition` 无法清晰表达这些不同概念。

### 建议：增加 reference stack

```ts
interface SchemaReferenceFrame {
  reference: SchemaReferenceNode;
  sourcePath: readonly SchemaPathSegment[];
  sourceDefinition?: SchemaDefinition;
  targetDefinition: SchemaDefinition;
}
```

Context 中明确区分：

```ts
interface SchemaWalkContext {
  lexicalDefinition?: SchemaDefinition;
  referenceStack: readonly SchemaReferenceFrame[];
}
```

这样可以稳定表达：

- 当前节点声明在哪个 definition 中；
- reference 从哪里发生；
- reference 指向哪个 definition；
- 当前经过了几层 reference；
- 是否处于递归展开中。

### 未来价值

这对以下功能尤其重要：

- recursive type diagnostics；
- cycle visualization；
- dependency graph；
- context-sensitive loss report；
- reference inlining；
- source mapping；
- generator naming strategy。

---

## 3.5 Visitor 缺少控制能力

当前 visitor 主要只有前序 `enter`，缺少：

- `leave`；
- `skipChildren`；
- `stop`；
- accumulator；
- structured result。

### 缺少 `leave` 的影响

难以实现：

- post-order aggregation；
- scope push/pop；
- structural hash；
- subtree fingerprint；
- tree rendering；
- bottom-up analysis；
- transformation preparation。

### 无法跳过子树

如果 visitor 已经确认某个节点无需继续分析，仍必须遍历整个 subtree。

这会影响：

- 性能；
- target-specific analysis；
- definition filtering；
- unknown subtree handling。

### 建议控制类型

```ts
type SchemaWalkControl = "continue" | "skip-children" | "stop";
```

Visitor：

```ts
interface SchemaWalkVisitor {
  enterNode?(context: SchemaNodeWalkContext): SchemaWalkControl | void;

  leaveNode?(context: SchemaNodeWalkContext): void;
}
```

### Reducer 可以作为上层 utility

```ts
const result = reduceSchemaDocument(
  document,
  initialState,
  (state, context) => nextState,
);
```

Walker 和 reducer 不需要互相替代。

推荐层次：

```text
walkSchemaDocument
  -> traversal primitive

reduceSchemaDocument
  -> accumulator helper

collectSchemaNodes
  -> common analysis helper
```

---

## 3.6 Duplicate definitions 下 reference lookup 行为不明确

当前 definition lookup 如果使用普通 `Map<string, SchemaDefinition>`，重复 definition name 通常会导致后者覆盖前者。

例如：

```text
definitions:
  User
  User
```

validation 可以检测重复，但 public traversal 调用者不一定先运行 validation。

在 invalid document 上：

```ts
walkSchemaDocument(document, visitor, {
  references: "follow",
});
```

reference 最终 follow 哪个 `User`，会成为隐式行为。

### 建议

Definition index 不应静默丢失 ambiguity。

可以使用：

```ts
ReadonlyMap<string, readonly SchemaDefinition[]>;
```

Reference resolution 状态：

```ts
type SchemaReferenceResolution =
  | { status: "resolved"; definition: SchemaDefinition }
  | { status: "missing"; name: string }
  | {
      status: "ambiguous";
      name: string;
      definitions: readonly SchemaDefinition[];
    };
```

### 推荐默认行为

- 唯一匹配：允许 follow；
- missing：不 follow，并通知 visitor；
- ambiguous：不 follow，并通知 visitor；
- traversal 默认不 throw；
- validation 决定它是否构成 error。

这种设计更适合工具型项目，因为项目需要分析和解释 invalid input，而不是遇到问题立即终止。

---

## 3.7 Unresolved reference 在 follow 模式下不应静默停止

如果 reference 没有对应 definition，当前 traversal 可能只是停止进入 target。

这会让调用方误以为 traversal 已经完整展开。

### 建议

提供 callback：

```ts
interface SchemaWalkVisitor {
  unresolvedReference?(
    context: SchemaUnresolvedReferenceContext,
  ): SchemaWalkControl | void;
}
```

或者在 reference context 中提供：

```ts
type SchemaReferenceTraversalStatus =
  | { status: "not-followed" }
  | { status: "resolved"; definition: SchemaDefinition }
  | { status: "missing"; name: string }
  | { status: "ambiguous"; name: string }
  | { status: "cycle"; name: string };
```

这样 Web UI 和 diagnostics 可以解释：

- 为什么 reference 没有被展开；
- 是 missing、ambiguous 还是 cycle；
- resolution 发生在哪个位置。

---

## 3.8 递归实现可能产生 call stack 风险

当前 traversal 通过函数递归处理：

- object；
- array；
- tuple；
- union；
- record；
- reference resolution。

对正常 schema 一般没有问题，但未来可能处理：

- 自动生成的 JSON Schema；
- 极深嵌套结构；
- 恶意输入；
- 大型组合 schema；
- 大量递归 definitions。

JavaScript 没有稳定的尾递归优化，因此极深输入可能导致 call stack overflow。

### 短期建议

增加：

```ts
interface SchemaWalkOptions {
  maxDepth?: number;
}
```

Context 增加：

```ts
depth: number;
```

超过限制时：

- 停止当前 branch；
- 返回 diagnostic；
- 或触发 visitor callback。

### 中长期建议

如果后续确实遇到大型 schema，再考虑将 walker 改为显式 stack 的 iterative traversal。

当前阶段不必立即重写，但应避免把无限递归行为冻结为公共 API 契约。

---

## 3.9 Mutation 行为没有明确约束

Visitor 当前可能拿到真实 IR 对象引用。

调用者可以在 traversal 过程中修改：

```ts
context.node;
context.document.definitions;
context.parent;
```

这可能导致：

- 当前 traversal 顺序变化；
- definition lookup 与 document 脱节；
- children 被重复或跳过；
- 难以复现的问题；
- validation 过程中意外修改 IR。

### 建议

Context 类型尽量暴露 readonly 视图：

```ts
interface SchemaNodeWalkContext {
  readonly node: Readonly<SchemaNode>;
  readonly document: Readonly<SchemaDocument>;
  readonly path: readonly SchemaPathSegment[];
}
```

同时在文档中明确：

> Traversal visitor 必须被视为只读；修改 IR 的需求应使用独立 transformer。

---

## 4. Traversal 与 Transformation 的边界

当前 traversal 应继续保持只读 walker 的定位。

不要让 visitor 通过 mutation 逐渐演化成 transformer。

未来很快会需要以下转换：

- rename definitions；
- normalize field names；
- lower unsupported nodes；
- inline references；
- extract reusable definitions；
- rewrite shape IR；
- attach constraints；
- split constraints from shape；
- target-specific lowering；
- preserve source mapping。

这些能力应由独立 immutable transformer 提供。

---

## 4.1 推荐的 transformer 模型

```ts
interface SchemaTransformer {
  transformNode?(node: SchemaNode, context: SchemaTransformContext): SchemaNode;
}
```

推荐使用 post-order：

```text
transform children
-> rebuild parent
-> transform rebuilt parent
```

示例：

```ts
function transformSchemaNode(
  node: SchemaNode,
  transformer: SchemaTransformer,
): SchemaNode {
  const transformedChildren = mapSchemaNodeChildren(node, (child) =>
    transformSchemaNode(child, transformer),
  );

  return (
    transformer.transformNode?.(transformedChildren, context) ??
    transformedChildren
  );
}
```

### 重要原则

- 不修改原对象；
- 未变化 subtree 尽量复用原引用；
- definition/reference consistency 需要显式处理；
- transformation 后重新 validation；
- walker 与 transformer 共享 path 和 child enumeration；
- walker 与 transformer 不共用同一个 visitor API。

推荐结构：

```text
Traversal
  - inspection
  - validation
  - collection
  - reporting

Transformation
  - immutable rewrite
  - normalization
  - lowering
  - optimization
```

---

## 5. 抽取统一 Child Enumeration

随着 Schema IR 增长，child relationship 可能在多个模块重复维护：

- traversal；
- transformation；
- equivalence；
- validation；
- capability analysis；
- hashing；
- schema diff；
- serialization；
- normalization。

当前 SchemaNode 类型还不算很多，但如果每个模块都维护一套 switch，未来增加一个 node kind 时很容易漏改。

### 建议抽取

```ts
interface SchemaChild {
  node: SchemaNode;
  via: SchemaWalkVia;
  pathSegment: SchemaPathSegment;
}
```

```ts
function getSchemaNodeChildren(node: SchemaNode): readonly SchemaChild[];
```

供以下功能使用：

```text
walker
transformer
generic validation
capability collection
schema statistics
```

Transformation 还需要：

```ts
function mapSchemaNodeChildren(
  node: SchemaNode,
  mapper: (
    child: SchemaNode,
    relationship: SchemaChildRelationship,
  ) => SchemaNode,
): SchemaNode;
```

### 收益

- 新增 node kind 时有单一维护点；
- walker 和 transformer 不容易分叉；
- traversal order 可以统一测试；
- child relationship 可以独立成为公共内部协议。

---

## 6. 与三层 IR 架构的关系

项目未来包含：

- Value IR；
- Shape / Schema IR；
- Constraint IR。

当前 traversal 专注于 Schema IR 是正确的。

不建议现在创建一个巨大统一 visitor：

```ts
walkAnyIrDocument();
```

三类 IR 的 child relationship、reference 语义和使用场景可能差异很大。

### 推荐共享内容

三类 traversal 可以共享：

- walk control；
- enter / leave convention；
- depth；
- diagnostic location；
- source mapping convention；
- path formatting interface；
- stop / skip semantics。

分别保留：

```ts
walkValueDocument();
walkSchemaDocument();
walkConstraintDocument();
```

### 推荐基础接口

```ts
type IrWalkControl = "continue" | "skip-children" | "stop";

interface IrWalkCommonContext<TPathSegment> {
  readonly depth: number;
  readonly path: readonly TPathSegment[];
}
```

不要为了代码复用而过早合并 IR domain。

---

## 7. 测试计划

当前 traversal 应建立独立测试文件：

```text
tests/core/schema-traversal.test.ts
```

---

## 7.1 Node kind 覆盖

确保访问所有 node kinds：

- scalar；
- literal；
- null；
- unknown；
- reference；
- array；
- tuple；
- record；
- union；
- object。

测试目标：

- 每种节点会被访问；
- children 均会进入；
- 访问上下文正确；
- 不遗漏新增 node kind。

---

## 7.2 Traversal order

锁定并文档化访问顺序：

- definitions 的顺序；
- root 在 definitions 前还是后；
- pre-order；
- post-order；
- object field order；
- tuple element order；
- union member order；
- record key/value 顺序；
- reference node 与 resolved definition 的顺序。

建议使用访问日志断言：

```ts
const visited: string[] = [];

walkSchemaDocument(document, {
  enterNode(context) {
    visited.push(formatSchemaPath(context.path));
  },
});
```

---

## 7.3 Path 测试

覆盖：

- root；
- definition；
- object field；
- array element；
- tuple element；
- union member；
- record key；
- record value；
- resolved reference。

重点验证：

- object field `"0"` 不会与 tuple index `0` 混淆；
- field `"elementType"` 不会与 array child 混淆；
- definition name 与 field name 不会混淆；
- path format 稳定。

---

## 7.4 Context 测试

验证：

- parent；
- via；
- depth；
- lexicalDefinition；
- sourceDefinition；
- targetDefinition；
- referenceStack；
- document；
- definition lookup。

重点场景：

```text
definition A
  -> field b
    -> reference B
      -> object field c
```

---

## 7.5 Reference mode 测试

### Preserve

- 访问 reference node；
- 不进入 definition；
- missing reference 不影响 traversal；
- cycle 不相关。

### Follow

- 正确进入 definition；
- self recursion 终止；
- mutual recursion 终止；
- sibling references 可分别展开；
- per-occurrence 模式允许重复访问；
- once-per-definition 模式正确去重；
- missing reference 触发状态；
- ambiguous reference 触发状态。

---

## 7.6 Document traversal mode 测试

分别验证：

### Structure traversal

- 访问全部 definitions；
- 访问未被 root 使用的 definition；
- reference 默认保持；
- 每个声明节点访问一次。

### Root traversal

- 只访问 root 可达部分；
- 不访问 unreachable definitions；
- follow 策略生效；
- reachable definition collection 正确。

---

## 7.7 Invalid document 测试

覆盖：

- duplicate definition names；
- empty definition name；
- missing reference；
- ambiguous reference；
- self cycle；
- mutual cycle；
- cycle mixed with missing reference；
- malformed nested schema。

Traversal 应能够分析 invalid document，而不是依赖 input 必须先完全合法。

---

## 7.8 Visitor control 测试

验证：

- `skip-children`；
- `stop`；
- `leave` 是否调用；
- skip 后 leave 的定义；
- stop 后是否继续调用 leave；
- visitor 抛出异常时的行为；
- max depth。

这些行为必须在 API 文档中明确并通过测试锁定。

---

## 7.9 Mutation 行为测试

如果 mutation 不被支持，应至少验证和文档化：

- visitor 不应修改 document；
- visitor 不应向 fields 数组追加元素；
- visitor 不应替换 definitions；
- context path 是 readonly；
- traversal 不保证 mutation 后行为。

如果开发环境允许，可以在测试中使用 `Object.freeze()` 检查只读访问。

---

## 8. 推荐 API 草案

以下设计用于表达方向，不要求一次性完整实现。

```ts
export type SchemaWalkControl = "continue" | "skip-children" | "stop";
```

```ts
export type SchemaReferenceVisitMode = "preserve" | "follow";
```

```ts
export type SchemaReferenceRepeatMode =
  "per-occurrence" | "once-per-definition";
```

```ts
export type SchemaPathSegment =
  | { kind: "root" }
  | { kind: "definition"; name: string }
  | { kind: "field"; name: string }
  | { kind: "arrayElement" }
  | { kind: "tupleElement"; index: number }
  | { kind: "unionMember"; index: number }
  | { kind: "recordKey" }
  | { kind: "recordValue" };
```

```ts
export interface SchemaReferenceFrame {
  readonly reference: SchemaReferenceNode;
  readonly sourcePath: readonly SchemaPathSegment[];
  readonly sourceDefinition?: SchemaDefinition;
  readonly targetDefinition: SchemaDefinition;
}
```

```ts
export interface SchemaNodeWalkContext {
  readonly document: SchemaDocument;
  readonly node: SchemaNode;
  readonly parent?: SchemaNode;
  readonly path: readonly SchemaPathSegment[];
  readonly depth: number;
  readonly lexicalDefinition?: SchemaDefinition;
  readonly referenceStack: readonly SchemaReferenceFrame[];
  readonly via?: SchemaWalkVia;
}
```

```ts
export interface SchemaWalkVisitor {
  enterDocument?(context: SchemaDocumentWalkContext): SchemaWalkControl | void;

  leaveDocument?(context: SchemaDocumentWalkContext): void;

  enterDefinition?(
    context: SchemaDefinitionWalkContext,
  ): SchemaWalkControl | void;

  leaveDefinition?(context: SchemaDefinitionWalkContext): void;

  enterField?(context: SchemaFieldWalkContext): SchemaWalkControl | void;

  leaveField?(context: SchemaFieldWalkContext): void;

  enterTupleElement?(
    context: SchemaTupleElementWalkContext,
  ): SchemaWalkControl | void;

  leaveTupleElement?(context: SchemaTupleElementWalkContext): void;

  enterNode?(context: SchemaNodeWalkContext): SchemaWalkControl | void;

  leaveNode?(context: SchemaNodeWalkContext): void;

  unresolvedReference?(
    context: SchemaUnresolvedReferenceContext,
  ): SchemaWalkControl | void;

  referenceCycle?(
    context: SchemaReferenceCycleContext,
  ): SchemaWalkControl | void;
}
```

---

## 9. 分阶段实施计划

---

## Phase 1：稳定 traversal contract

### 目标

在更多模块依赖 traversal 前，先明确其核心语义。

### 工作项

1. 拆分 document structure traversal 与 root traversal；
2. 引入 typed path；
3. 明确 traversal order；
4. 明确 reference follow 后的访问次数；
5. 增加 traversal 独立测试文件；
6. 为现有 API 补充文档。

### 完成标准

- traversal modes 有清晰命名；
- path 无歧义；
- reference visit behavior 有测试；
- 所有 SchemaNode kind 有直接测试；
- validation 继续正常使用 traversal。

### 优先级

最高。

---

## Phase 2：补齐 visitor 结构

### 工作项

1. 增加 `leaveNode`；
2. 增加 `skip-children`；
3. 增加 `stop`；
4. 增加 `depth`；
5. 增加 definition hooks；
6. 增加 field hooks；
7. 增加 tuple element hooks；
8. context 改为 readonly。

### 完成标准

- 能支持前序和后序分析；
- visitor 不需要回到 parent 中反查 field；
- visitor 能跳过 subtree；
- visitor 能提前停止 traversal。

---

## Phase 3：完善 reference resolution

### 工作项

1. 引入 reference stack；
2. 区分 lexical/source/target definition；
3. missing reference callback；
4. ambiguous reference callback；
5. cycle callback；
6. per-occurrence 与 once-per-definition；
7. duplicate definition 不再静默覆盖。

### 完成标准

- invalid document 上 reference 行为可解释；
- recursion context 可被 diagnostics 和 UI 使用；
- dependency analysis 可以直接建立在 traversal 上。

---

## Phase 4：抽取 child mechanics

### 工作项

1. `getSchemaNodeChildren()`；
2. child relationship 类型；
3. `mapSchemaNodeChildren()`；
4. traversal 改用统一 child enumeration；
5. equivalence 与 analysis 逐步复用。

### 完成标准

- 新增 SchemaNode kind 时，child relationship 只有一个主要维护点；
- walker 和 transformer 不会遗漏不同节点；
- traversal order 集中管理。

---

## Phase 5：实现 immutable transformer

### 工作项

1. post-order transform；
2. immutable node reconstruction；
3. structural sharing；
4. definition rename strategy；
5. reference consistency；
6. transform diagnostics；
7. transform 后 validation；
8. normalization 迁移到 transformer。

### 完成标准

能够安全支持：

- target lowering；
- normalization；
- reference inline；
- definition extraction；
- constraint split；
- future optimization passes。

---

## 10. 不建议现在做的事项

### 10.1 不要立即创建统一 All-IR Visitor

Value IR、Schema IR、Constraint IR 应分别演化。

现在只共享基础 convention，不共享巨大 node union。

---

### 10.2 不要让 traversal visitor 修改 IR

Mutation 会让 traversal 行为不可预测。

修改 IR 应交给 immutable transformer。

---

### 10.3 不要过早优化成复杂 iterator framework

当前重点是语义清晰，不是追求抽象程度。

除非已有具体需求，不需要立即支持：

- async traversal；
- generator iterator；
- parallel traversal；
- plugin middleware；
- generic graph engine。

---

### 10.4 不要急于冻结公共 API

Traversal 目前已经有价值，但 path、reference context 和 visit modes 仍需调整。

在这些问题稳定前，不建议承诺长期兼容。

---

## 11. 与项目当前 Roadmap 的关系

目前不建议因为 traversal 已初步完成，就立即大规模增加 parser 和 generator。

更合理的顺序是：

```text
稳定 Schema IR
-> 稳定 traversal
-> 建立 validation / normalization / capability analysis
-> 建立 conversion loss report
-> 再扩展 parser / generator
```

原因是 parser 和 generator 数量增加后，IR 基础问题的修复成本会迅速上升。

Traversal 是以下功能的基础：

- parser output validation；
- generator input validation；
- target capability matrix；
- unsupported feature reporting；
- deterministic normalization；
- schema comparison；
- round-trip diagnostics；
- conversion loss explainability。

因此 traversal 的改进并不是“内部重构”，而是整个项目确定性转换能力的重要基础。

---

## 12. 建议的近期任务清单

### 必须优先完成

- [ ] 拆分 structure traversal 与 root-reachable traversal
- [ ] 引入 typed path segments
- [ ] 增加独立 `schema-traversal.test.ts`
- [ ] 明确 reference follow 的重复访问语义
- [ ] 增加 unresolved reference 状态
- [ ] 明确 duplicate definition lookup 行为

### 紧接着完成

- [ ] 增加 `leaveNode`
- [ ] 增加 `skip-children`
- [ ] 增加 `stop`
- [ ] 增加 `depth`
- [ ] 增加 definition visitor hooks
- [ ] 增加 field visitor hooks
- [ ] 增加 tuple element visitor hooks
- [ ] context 类型 readonly 化

### 中期完成

- [ ] reference stack
- [ ] per-occurrence / once-per-definition
- [ ] child enumeration
- [ ] reducer helpers
- [ ] schema statistics utility
- [ ] capability collector
- [ ] loss analysis prototype

### 后续完成

- [ ] immutable transformer
- [ ] target lowering passes
- [ ] normalization passes
- [ ] reference inline / extract
- [ ] constraint attachment / split
- [ ] source mapping integration

---

## 13. 最终评价

当前 traversal 实现已经跨过了“临时递归函数”的阶段，开始具备公共 IR 基础设施的价值。

其优势包括：

- reference traversal 策略显式；
- cycle protection 方向正确；
- context 信息具有扩展潜力；
- validation 已实际复用；
- node traversal 逻辑开始集中。

但目前仍存在几个决定长期质量的基础问题：

1. document traversal 与 root traversal 混合；
2. reference follow 造成重复访问但语义未明确；
3. path 不是稳定、无歧义的 IR 地址；
4. field、tuple element、definition 不是一等访问对象；
5. reference context 混合 occurrence 与 declaration；
6. visitor 缺少 leave、skip 和 stop；
7. invalid document 下 resolution 行为不够明确；
8. traversal 独立测试不足；
9. 尚未建立 traversal 与 transformer 的清晰边界。

最关键的建议是：

> 暂时不要继续横向扩展 traversal 使用范围，先稳定 traversal contract，再让 capability analysis、loss report、transformation 和多层 IR 能力建立在它之上。

一旦这套 traversal 协议稳定，它将不仅服务于 validation，还会成为整个 Universal Data Model Converter 中连接 IR、诊断、解释性转换和未来工具生态的重要基础。
