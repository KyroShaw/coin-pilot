# 板块轮动感知 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始技术设计 |

## 项目架构

本功能横跨 monorepo 的多个层，整体数据流为：**定时调度 → 行情采集（Binance）+ AI 汇总（Claude）→ 落库快照（packages/db）→ tRPC 读取（packages/api）→ 前端展示（apps/web）**。

涉及层：

- **前端 `apps/web`**：React 19 + TanStack Router 文件式路由（`apps/web/src/routes/`），TailwindCSS 与共享 `@coin-pilot/ui`（shadcn/ui）。负责板块列表、热度排名、龙头币种卡片及更新时间/降级提示的展示。
- **后端 `apps/server`**：Hono + tRPC 适配器（保持轻薄）。同时承载定时调度入口（node 定时器或暴露受保护的刷新触发端点供外部 cron 调用）。
- **API 层 `packages/api`**：tRPC，新增 `src/routers/sector.ts` 并在 `routers/index.ts` 合并；核心原语来自 `src/index.ts`，会话来自 `context.ts` 的 `ctx.session`。读取接口用 `protectedProcedure`，输入用 `zod` 校验。
- **数据库 `packages/db`**：Drizzle ORM + PostgreSQL。新增 schema `src/schema/sector.ts` 经 `schema/index.ts` 重导出，存放板块快照与龙头币种。
- **AI 集成**：Claude（`@anthropic-ai/sdk`），用于板块归类与热度汇总；密钥经 `@coin-pilot/env`。
- **定时调度**：服务端周期任务驱动刷新作业，周期 ≤ 30 分钟。

## 功能模块设计

### 1. 板块数据采集与缓存（采集服务）

- **涉及层**：`apps/server`（调度触发）、`packages/db`（落库）、外部 Binance API。
- **关键设计**：刷新作业从 Binance 公开行情 REST API 拉取全市场 24h ticker 数据（如 `/api/v3/ticker/24hr`），筛选 USDT 计价的主流交易对，提取价格、涨跌幅、成交量等字段，作为后续 AI 汇总与龙头展示的原始输入。采集结果与 AI 汇总结果一并写入新的快照版本（`snapshotId` + `createdAt`），实现「读取即缓存」，用户请求不触发外部调用。

### 2. AI 汇总生成（板块归类与热度）

- **涉及层**：AI 集成（Claude）、`apps/server`（在刷新作业内调用）。
- **关键设计**：将采集到的行情摘要（币种、涨跌幅、成交量变化）作为输入，调用 Claude 生成板块列表（板块名、归类的成分币种、热度评分与简短描述）。模型选择 `claude-opus-4-8`（需要对市场进行归类与推理，属于复杂推理场景，可启用 `thinking: {type:"adaptive"}` + `output_config.effort`）。输出要求结构化 JSON，服务端用 zod 二次校验后落库。若 AI 调用失败，跳过本次更新，保留上一快照。

### 3. 龙头币种行情（行情聚合）

- **涉及层**：`packages/db`（存储）、Binance API（数据源）。
- **关键设计**：对 AI 给出的每个板块，从采集数据中为其成分币种匹配最新价格与 24h 涨跌幅，挑选龙头（按成交额或市场代表性排序，至少 1 个）。龙头行情与板块同属一个 `snapshotId`，保证一致性。

### 4. 定时刷新（调度作业）

- **涉及层**：`apps/server`、`packages/api`。
- **关键设计**：采用服务端定时机制，落地方案为在 `apps/server` 启动时注册一个 node 定时器（间隔来自 `@coin-pilot/env` 的 `SECTOR_REFRESH_INTERVAL_MS`，默认 25 分钟，确保 ≤ 30 分钟），执行刷新作业；同时暴露一个仅服务端密钥可触发的刷新端点（`POST /internal/sector/refresh`，校验内部 token），便于外部 cron 兜底触发。作业具备并发互斥（同一时刻仅一个刷新在跑）与失败保留旧快照的能力。

### 5. 前端展示组件

- **涉及层**：`apps/web`。
- **关键设计**：新增首页板块区路由/组件（`apps/web/src/routes/`），通过 tRPC 调用 `sector.getAll` 获取板块、龙头与更新时间。使用 `@coin-pilot/ui` 卡片/列表组件渲染热度排名榜与龙头币种（价格、涨跌幅，涨绿跌红）。顶部展示「更新于 {updatedAt}」；当返回 `stale=true` 或拉取失败时，展示友好降级提示并仍显示上次数据与时间。

## 接口契约（tRPC）

新增 `sector` 路由（`packages/api/src/routers/sector.ts`）：

- **`sector.getAll`**（`protectedProcedure`，query）
  - 输入：无（或可选 `{ limit?: number }` 控制板块数量，默认 10，最小 5）。
  - 输出概要：
    ```
    {
      updatedAt: Date,          // 最近一次成功刷新时间
      stale: boolean,           // 当前数据是否因刷新失败而过期
      sectors: Array<{
        id: string,
        name: string,           // 板块名
        rank: number,           // 热度排名
        heatScore: number,      // 热度评分
        summary: string,        // AI 汇总描述
        leaders: Array<{
          symbol: string,       // 交易对，如 BTCUSDT
          name: string,
          price: number,
          changePercent24h: number
        }>                      // 至少 1 个
      }>                        // 至少 5 个
    }
    ```
- **（内部，可选）`sector.refresh`**：不经公开 tRPC 暴露，由 `apps/server` 调度作业直接调用采集服务函数，或经受 token 保护的 HTTP 端点触发。

输入校验：所有可选输入用 `zod`（`z.object({ limit: z.number().int().min(5).max(20).optional() })`）；AI 返回的结构化结果在落库前用 zod schema 校验。

## 数据模型（Drizzle 概要）

`packages/db/src/schema/sector.ts`：

- **`sector_snapshot`**（板块快照）
  - `id`（pk）
  - `name`（板块名）
  - `rank`（热度排名，int）
  - `heatScore`（热度评分，numeric）
  - `summary`（AI 汇总文本）
  - `snapshotId`（uuid，标识同一次刷新批次）
  - `createdAt` / `updatedAt`（timestamp，提供更新时间）

- **`sector_leader`**（板块龙头币种）
  - `id`（pk）
  - `sectorSnapshotId`（fk → `sector_snapshot.id`）
  - `symbol`（交易对，如 `BTCUSDT`）
  - `name`
  - `price`（numeric）
  - `changePercent24h`（numeric）
  - `createdAt` / `updatedAt`

- **（可选）`sector_refresh_log`**（刷新日志）：`id`、`snapshotId`、`status`（success/failed）、`source`（binance/claude）、`message`、`createdAt`，用于验证刷新周期与排障。

读取时取最新成功的 `snapshotId` 对应的板块及其龙头，`updatedAt` 取该批次时间。

## 安全考虑

- **行情为公开只读数据**：Binance 公开行情 REST 接口无需用户密钥，不涉及下单权限；仅做读取，符合「Binance API 只读」决策。
- **AI 密钥服务端持有**：`ANTHROPIC_API_KEY` 经 `@coin-pilot/env` 注入，仅在服务端刷新作业中使用，绝不下发到前端。
- **输入校验**：tRPC 输入与 AI 返回结果均用 zod 校验；AI 返回的板块/币种文本在前端渲染时按文本处理，避免注入。
- **内部刷新端点保护**：外部 cron 触发端点需校验内部 token（来自 `@coin-pilot/env`），防止被公开滥用触发高频外部调用。
- **鉴权**：`sector.getAll` 使用 `protectedProcedure`，依赖 F-001 会话。

## 技术决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 定时刷新方案 | `apps/server` 内 node 定时器（默认 25 分钟）+ 可选内部 token 保护的 HTTP 端点供外部 cron 兜底 | 项目内可直接落地，无强外部依赖；间隔 < 30 分钟满足 [AC-002-3]；端点便于运维与重试 |
| AI 模型选择 | 板块归类与热度汇总用 `claude-opus-4-8`（复杂推理，adaptive thinking + effort） | 归类与热度判断需要跨币种综合推理，属复杂任务；非「一句话/汇总」轻量场景，故不用 haiku |
| 缓存策略 | 落库快照「读取即缓存」，用户请求只读最新成功快照，不同步调外部 API | 满足页面 < 2s 与刷新 ≤ 30 分钟，解耦读写，降低外部限频风险 |
| 降级展示 | 刷新失败保留上一成功快照，返回 `stale=true`，前端展示提示 + 上次更新时间 | 满足非功能需求中「拉取失败展示友好提示和上次更新时间」 |
| 数据一致性 | 同一刷新批次使用统一 `snapshotId`，板块与龙头绑定 | 避免板块与龙头时间错配，保证读取一致性 |
