# F-005 已平仓订单复盘 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始设计 |

## 项目架构

- **架构类型**：pnpm + Turborepo TypeScript monorepo。
- **涉及层**：
  - 前端 `apps/web`：React 19 + TanStack Router（文件式路由 `apps/web/src/routes/`）+ Vite + TailwindCSS + `@coin-pilot/ui`（shadcn/ui）。新增订单复盘相关路由与组件。
  - 后端入口 `apps/server`：Hono + tRPC 适配器（保持轻薄，仅挂载路由与 context）；流式复盘报告经此对外暴露。
  - API 层 `packages/api`：tRPC。复用 `src/index.ts` 的 `router`/`publicProcedure`/`protectedProcedure` 原语；新增功能路由 `src/routers/order.ts` 与 `src/routers/review.ts`，在 `routers/index.ts` 合并。**复盘相关全部为 `protectedProcedure`**。
  - 数据库 `packages/db`：Drizzle ORM + PostgreSQL。新增领域 schema `src/schema/order.ts`（含 `closed_order`、`order_rationale`、`review_report`），从 `schema/index.ts` 重导出。
  - **Binance 集成**：复用/扩展 F-001 的 Binance 客户端（解密凭据 → 签名请求），新增已平仓订单拉取能力。
  - **加密解密**：复用 F-001 的 AES-256-GCM 解密工具，仅在服务端内存中短暂还原明文 Key/Secret 用于 Binance 签名。
  - **AI 集成**：`packages/api` 内的 Claude 客户端（`@anthropic-ai/sdk`），`ANTHROPIC_API_KEY` 经 `@coin-pilot/env` 注入；复盘报告生成走流式。

## 功能模块设计

### 模块 A：订单拉取与签名鉴权（F-005-1）

- **涉及层**：`packages/api`（`routers/order.ts` + Binance 客户端）、F-001 解密工具、`packages/db`。
- **关键设计**：
  - 复用 F-001 的「解密凭据 → HMAC SHA256 签名请求」Binance 客户端能力，新增已平仓订单接口调用（合约 USDT 永续优先：用户成交/订单历史接口，按 `symbol` + 时间窗口查询）。
  - **90 天窗口 + 分页拉取**：Binance 历史接口对单次查询有时间跨度与条数限制，按时间分片（如每片 7 天）+ 分页游标循环拉取，直至覆盖近 90 天。
  - 明文 Key/Secret 仅在内存中存活于签名期间，调用结束即丢弃，绝不入库/日志/响应。
  - 拉取失败（Key 失效、限频、网络）统一转换为友好 `TRPCError`，对内不泄露细节。

### 模块 B：订单入库与盈亏计算（F-005-1、F-005-2）

- **涉及层**：`packages/api`、`packages/db`（`closed_order`）。
- **关键设计**：
  - 将拉取的成交聚合为「已平仓订单」记录：解析 `symbol`、`side`（多/空或买/卖）、`entryPrice`、`exitPrice`、数量、`pnl`（合约优先取 realized PnL；如需则按开平价与方向计算）、`closedAt`。
  - **幂等入库**：以 Binance 订单/成交唯一标识 + `userId` 做唯一约束 upsert，保证重复同步不产生重复行，满足订单一致性（AC-005-1）。
  - `order.list` 提供列表查询（按 `userId` 隔离，按 `closedAt` 倒序），供前端展示与 F-006 资金曲线复用。

### 模块 C：用户逻辑录入（F-005-3）

- **涉及层**：`apps/web`、`packages/api`（`routers/order.ts`）、`packages/db`（`order_rationale`）。
- **关键设计**：
  - 前端在订单列表行内/抽屉提供「开仓逻辑」「平仓逻辑」两段文本输入（`@coin-pilot/ui` 表单组件），带保存态与可编辑态。
  - `order.saveRationale` 按 `(userId, orderId)` upsert 持久化，仅本人可读写。
  - 逻辑文本作为 AI 复盘的主观输入来源。

### 模块 D：AI 复盘报告生成（F-005-4，流式 + effort=high）

- **涉及层**：`packages/api`（`routers/review.ts` + Claude 客户端）、`packages/db`（`review_report`）、`apps/server`（流式透传）、`apps/web`（流式渲染）。
- **关键设计**：
  - 模型 `claude-opus-4-8`，参数 `thinking: { type: "adaptive" }` + `output_config: { effort: "high" }`，**流式输出**，以满足 < 30s 体验并规避长推理超时（AC-005-2）。
  - **Prompt 三维度结构**：系统/用户提示固定要求报告至少覆盖「执行质量」「风险控制」「改进建议」三个维度（即优点、问题、建议），结合用户录入的开/平仓逻辑与该笔/该批订单的客观成交数据（开平价、方向、盈亏、持仓时间）。
  - 生成完成后将报告（Markdown 文本）落库到 `review_report`，便于再次查看与导出，避免重复生成成本。
  - 流式经 tRPC subscription / SSE 由 `apps/server` 透传到前端，前端逐段渲染。

### 模块 E：Markdown 导出（F-005-5）

- **涉及层**：`apps/web`、`packages/api`（`routers/review.ts`）。
- **关键设计**：
  - 报告本体即以 Markdown 文本生成与存储，前端「一键复制」直接写入剪贴板；「导出」生成 `.md` Blob 触发下载。
  - `review.export` 可按需返回报告 Markdown 全文（已落库时直接读取，满足 AC-005-4）。

## 接口契约

> 全部为 `protectedProcedure`（无 session 抛 `TRPCError UNAUTHORIZED`）；凡有输入均经 `zod` 校验；读用 `.query()`，写用 `.mutation()`，流式用 subscription/SSE。

- `order.sync`（mutation）
  - input: `z.object({})`
  - 行为：解密凭据 → 90 天分片分页拉取 Binance 已平仓订单 → 幂等 upsert 入库。
  - output 概要：`{ syncedCount: number, total: number, lastSyncedAt: Date }`（不含任何密钥）。

- `order.list`（query）
  - input: `z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(100).default(50) })`
  - output 概要：`{ items: Array<{ id, symbol, side, entryPrice, exitPrice, pnl, closedAt, hasRationale: boolean }>, nextCursor?: string }`。

- `order.saveRationale`（mutation）
  - input: `z.object({ orderId: z.string(), entryRationale: z.string().max(2000), exitRationale: z.string().max(2000) })`
  - output 概要：`{ saved: true, orderId: string }`（按 `(userId, orderId)` upsert）。

- `review.generate`（流式 — subscription / SSE）
  - input: `z.object({ orderIds: z.array(z.string()).min(1).max(50) })`
  - 行为：聚合订单客观数据 + 用户逻辑 → 调用 `claude-opus-4-8`（adaptive thinking + effort high）流式生成 → 边推流边落库。
  - output 概要：流式文本块；结束事件携带 `{ reportId: string }`。

- `review.export`（query）
  - input: `z.object({ reportId: z.string() })`
  - output 概要：`{ markdown: string, generatedAt: Date }`（仅返回本人报告）。

## 数据模型

`packages/db/src/schema/order.ts`，从 `schema/index.ts` 重导出。迁移由 `pnpm db:generate` 生成至 `packages/db/src/migrations`，再 `pnpm db:migrate` 应用；`DATABASE_URL` 取自 `apps/server/.env`。

- 表 `closed_order`（已平仓订单 —— **F-006 资金曲线复用此表**）
  - `id`：uuid 主键，默认随机。
  - `userId`：text/uuid，引用 Better-Auth 用户（不改 auth 表）。
  - `exchangeOrderId`：text，Binance 侧唯一标识；与 `userId` 组成**唯一约束**用于幂等去重。
  - `symbol`：text，交易对（如 `BTCUSDT`）。
  - `side`：text，方向（`LONG`/`SHORT` 或 `BUY`/`SELL`）。
  - `entryPrice`：numeric，开仓价。
  - `exitPrice`：numeric，平仓价。
  - `quantity`：numeric，成交数量。
  - `pnl`：numeric，已实现盈亏。
  - `openedAt`：timestamp，开仓时间（可空，便于 F-006 持仓时长/曲线计算）。
  - `closedAt`：timestamp，平仓时间（建索引，供列表排序与资金曲线时间轴）。
  - `createdAt` / `updatedAt`：timestamp，默认 now。

- 表 `order_rationale`（用户交易逻辑）
  - `id`：uuid 主键。
  - `userId`：text/uuid，归属用户。
  - `orderId`：uuid，外键关联 `closed_order.id`；与 `userId` 唯一约束。
  - `entryRationale`：text，开仓逻辑。
  - `exitRationale`：text，平仓逻辑。
  - `createdAt` / `updatedAt`：timestamp。

- 表 `review_report`（复盘报告）
  - `id`：uuid 主键。
  - `userId`：text/uuid，归属用户。
  - `orderIds`：jsonb/text[]，本次复盘覆盖的订单 id 列表。
  - `markdown`：text，报告全文（Markdown，含执行质量/风险控制/改进建议三维度）。
  - `model`：text，记录所用模型（如 `claude-opus-4-8`）。
  - `generatedAt`：timestamp，默认 now。

## 安全考虑

- **鉴权**：`order.*` 与 `review.*` 全部 `protectedProcedure`，依赖 `ctx.session`，无 session 抛 `UNAUTHORIZED`。
- **用户数据隔离**：所有查询/写入按 `ctx.session.user.id` 限定，禁止跨用户访问订单、逻辑、报告；`review.export`/`order.list` 仅返回本人数据。
- **API Key 解密仅内存**：复用 F-001 解密能力，明文 Key/Secret 仅在签名调用期间存在于内存，调用结束即释放；绝不入库、不进日志、不出响应。
- **报告不含密钥**：AI 输入仅包含订单成交数据与用户逻辑文本，绝不包含任何凭据；报告输出与落库内容同样不含敏感信息。
- **Binance 签名**：历史/成交接口需 `timestamp` + HMAC SHA256(query, secret)，签名在服务端完成。
- **错误脱敏**：Binance/AI/解密失败统一转友好 `TRPCError`，对内不泄露细节，对外不暴露内部错误。
- **AI 输入控制**：批量复盘限制订单数量（≤50），避免超长上下文与 token 成本失控。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 复盘模型与参数 | `claude-opus-4-8` + adaptive thinking + effort=high + 流式（采用） vs sonnet/低 effort/非流式 | 复盘是高价值推理任务，需 opus + 高 effort 保证质量；流式边生成边展示规避长推理超时并满足 < 30s 体验（AC-005-2）。 |
| 报告 Prompt 结构 | 固定三维度（执行质量/风险控制/改进建议）模板（采用） | 直接满足 AC-005-3「至少 3 个维度」，输出结构稳定、可复用于导出。 |
| 订单拉取方式 | 90 天时间分片 + 分页游标循环（采用） vs 单次全量 | Binance 历史接口有时间跨度与条数上限，分片分页才能覆盖 90 天且不漏单（AC-005-1）。 |
| 入库去重 | `(userId, exchangeOrderId)` 唯一约束 upsert（采用） | 保证多次同步幂等、订单数量与 Binance 一致，不重复。 |
| 报告落库 | 生成后落库 `review_report`（采用） vs 每次现生成 | 复用查看/导出、避免重复 token 成本；满足导出一键读取（AC-005-4）。 |
| Markdown 导出 | 报告本体即 Markdown，前端复制 + Blob 下载（采用） | 报告天然为 Markdown，复制/导出零转换，简单可靠。 |
| 交易类型口径 | 合约 USDT 永续优先（采用） | 合约有明确开/平仓与 realized PnL 语义，盈亏口径清晰；现货配对推导留待后续（见 requirements 开放问题）。 |
| 订单数据归属 | `closed_order` 通用建模，供 F-006 复用（采用） | 避免重复拉取与重复建表，资金曲线直接基于 `closedAt`/`pnl` 计算。 |
