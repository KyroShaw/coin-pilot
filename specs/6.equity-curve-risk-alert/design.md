# F-006 资金曲线分析与风险预警 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始技术设计 |

## 项目架构

本 feature 跨以下层：

- **前端 apps/web**：TanStack Router 路由页（`apps/web/src/routes/`）渲染资金曲线（图表库）、按天/周切换、预警横幅、AI 冷静提示展示与阈值设置表单；调用 tRPC client。
- **API 层 packages/api**：新增 `src/routers/equity.ts`，于 `routers/index.ts` 合并；全部使用 `protectedProcedure`，输入 zod 校验。承载曲线聚合、连续盈亏检测、AI 提示生成、阈值读写。
- **后端 apps/server**：Hono + tRPC（轻薄），承载 tRPC handler 与 AI 流式响应转发。
- **数据库 packages/db**：Drizzle ORM + PostgreSQL；新增 `src/schema/alert.ts`（阈值设置，可选曲线缓存），经 `index.ts` 重导出；**复用 F-005 的 `closed_order` 表**，不重复建订单表。
- **AI 集成**：服务端经 `@anthropic-ai/sdk` 调用 `claude-opus-4-8` + `thinking:{type:"adaptive"}`，可流式；`ANTHROPIC_API_KEY` 经 `@coin-pilot/env`。

## 功能模块设计

### 1. 盈亏曲线聚合计算（消费 closed_order）
- **涉及层**：packages/api（查询 + 聚合）、packages/db（closed_order 读取）。
- **关键设计**：按当前用户读取 closed_order，依平仓时间升序排列，累计单笔已实现盈亏得到时间序列的累计 PnL 点位；按请求的粒度（天/周）将点位归并到时间桶（按平仓时间 truncate 到 day/week，桶内取期末累计值或区间增量）。计算在服务端完成，前端只接收聚合后的轻量数组。

### 2. 按天/周视图切换
- **涉及层**：前端 + packages/api（`granularity` 入参）。
- **关键设计**：前端切换按钮（shadcn `ToggleGroup`/`Tabs`）控制 `granularity: "day" | "week"`，作为 tRPC `equity.curve` 入参；切换即重新请求或命中本地查询缓存（TanStack Query）。

### 3. 连续盈亏检测引擎
- **涉及层**：packages/api。
- **关键设计**：取用户已平仓订单按平仓时间排序，从最近一笔向前遍历，统计「当前末端连续同号序列」长度——连续亏损 streak 与连续盈利 streak。单笔正负以已实现盈亏判定（0 盈亏视为中断连续，打破 streak）。与用户阈值比较，输出当前是否处于亏损/盈利预警状态及 streak 长度。算法 O(n)，无需扫描全历史可仅取近期窗口（如近 N 笔，N 取 max(阈值, 上限)）。

### 4. 预警横幅
- **涉及层**：前端。
- **关键设计**：页面顶部根据 `alert.status` 返回的 `triggered`/`type`/`streak` 渲染告警横幅（shadcn `Alert`，亏损用 destructive 变体、盈利用提示变体）；横幅内含「查看冷静复盘」入口，点击拉取/流式 AI 提示。

### 5. AI 冷静提示生成
- **涉及层**：packages/api（构造 prompt + 调用 SDK）、apps/server（流式转发）、前端（增量渲染）。
- **关键设计**：仅在预警状态触发时调用。服务端汇总近期交易模式特征（下单频率、方向分布、单笔盈亏分布、持仓时长、连续亏损序列）作为结构化上下文，构造 prompt 调用 `claude-opus-4-8` + `thinking:{type:"adaptive"}`，请求模型输出「模式分析 + 操作建议」。采用流式（`stream:true`）以满足 <30s 流畅体验，前端逐块渲染。不持久化提示原文（或仅短期缓存，避免重复计费）。

### 6. 阈值设置
- **涉及层**：前端（设置表单）、packages/api（读写）、packages/db（alert_setting）。
- **关键设计**：设置页提供连续亏损 / 连续盈利两个数值输入（步进 1，范围 2–10）；保存调用 `settings.updateThreshold`，zod 校验 `int().min(2).max(10)`；未配置时回落默认值（亏损 3 / 盈利 5）。

## 接口契约（tRPC）

所有过程位于 `packages/api/src/routers/equity.ts`，均为 `protectedProcedure`，由 `ctx.session.user.id` 隔离数据。

- `equity.curve`
  - 入参：`{ range: { from: Date; to: Date } | { preset: "7d" | "30d" | "90d" | "all" }, granularity: "day" | "week" }`
  - 出参：`{ points: { ts: Date; cumulativePnl: number; bucketPnl: number }[] }`
- `alert.status`
  - 入参：无（或 `{ accountId?: string }`）
  - 出参：`{ loss: { streak: number; threshold: number; triggered: boolean }, profit: { streak: number; threshold: number; triggered: boolean } }`
- `alert.coachingTip`
  - 入参：`{ type: "loss" | "profit" }`
  - 出参：流式文本（AI 冷静复盘提示，模式分析 + 操作建议）；非流式回退返回 `{ text: string }`
- `settings.getThreshold`
  - 出参：`{ lossThreshold: number; profitThreshold: number }`（未配置回落 3 / 5）
- `settings.updateThreshold`
  - 入参：`{ lossThreshold: number (int, 2–10), profitThreshold: number (int, 2–10) }`
  - 出参：`{ lossThreshold: number; profitThreshold: number }`

zod 概要：`granularity` 用 `z.enum(["day","week"])`；阈值用 `z.number().int().min(2).max(10)`；范围 preset 用 `z.enum([...])`。

## 数据模型（Drizzle 表概要）

新增 `packages/db/src/schema/alert.ts`，经 `index.ts` 重导出。

- **`alert_setting`**（用户阈值，每用户一行）
  - `id`（pk）
  - `user_id`（fk → 用户，唯一约束）
  - `loss_threshold`（integer，默认 3，范围 2–10）
  - `profit_threshold`（integer，默认 5，范围 2–10）
  - `created_at` / `updated_at`
- **`equity_point`（可选缓存）**：若曲线计算成本偏高可缓存聚合结果
  - `id`（pk）、`user_id`、`granularity`、`bucket_ts`、`cumulative_pnl`、`bucket_pnl`、`computed_at`
  - 默认 v1 不引入，曲线实时计算；视性能再启用。

**复用 F-005 的 `closed_order`**：曲线与连续盈亏检测直接读取该表（含平仓时间、已实现盈亏、方向、持仓信息等），本 feature 不重复建订单表，仅依赖其字段口径。

migration：`pnpm db:generate` 生成至 `./src/migrations`，`pnpm db:migrate` 应用；`DATABASE_URL` 来自 `apps/server/.env`。

## 安全考虑

- 所有 tRPC 过程使用 `protectedProcedure`，依赖 Better-Auth 的 `ctx.session`。
- **用户数据隔离**：曲线、预警、设置、AI 上下文均以 `ctx.session.user.id` 过滤；任何入参的 accountId 必须校验归属于当前用户。
- **阈值边界校验**：`settings.updateThreshold` 服务端用 zod `int().min(2).max(10)` 强制校验，前端额外做输入约束，越界请求被拒绝。
- **AI 调用服务端化**：`ANTHROPIC_API_KEY` 经 `@coin-pilot/env` 注入，仅服务端持有；prompt 上下文不包含跨用户数据；流式响应仅回传文本，不泄露密钥或内部实现。

## 技术决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 图表库 | recharts（首选），visx 为备选 | recharts 上手快、与 React 19 + shadcn 风格契合、满足折线/区域曲线与天/周切换；数据量大或需高度定制时再评估 visx |
| 连续盈亏算法 | 从最近一笔向前遍历，统计末端连续同号 streak，0 盈亏中断；仅取近期窗口 | O(n) 简单可验证，贴合「当前是否处于连续亏损/盈利」的语义，避免扫描全历史 |
| AI 模型与触发时机 | `claude-opus-4-8` + `thinking:{type:"adaptive"}`，流式；仅在预警触发后按需调用 | 模式分析为中高复杂度任务需 opus 推理；按需调用控制成本，流式满足 <30s 流畅体验 |
| 曲线计算是否缓存 | v1 实时计算，预留 `equity_point` 缓存表 | 数据量在单用户尺度下实时聚合 < 2s 可达；先简单实现，性能不足再启用缓存 |
| 单笔盈亏口径 | 以 closed_order 的已实现盈亏字段为准 | 与 F-005 入库口径对齐，避免重复定义手续费/资金费处理逻辑 |
