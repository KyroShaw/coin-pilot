# Binance Alpha 项目跟踪 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始设计 |

## 项目架构

本 Feature 跨以下技术层：

- 前端 apps/web：React 19 + TanStack Router（路由在 `apps/web/src/routes/`）+ Vite + TailwindCSS + shadcn/ui（`@coin-pilot/ui`）。负责 Alpha 项目列表展示、盘整判断依据展示、定投关注切换、降级提示与上次更新时间展示。
- API 层 packages/api：tRPC。新增 `src/routers/alpha.ts` 并在 `routers/index.ts` 合并。核心原语 `router` / `publicProcedure` / `protectedProcedure` 来自 `src/index.ts`，`ctx.session` 来自 Better-Auth。输入用 zod 校验。
- 后端 apps/server：Hono + tRPC（轻薄），承载 tRPC HTTP 入口；定时调度入口亦挂在 server 侧。
- 数据库 packages/db：Drizzle ORM + PostgreSQL。新增 schema `src/schema/alpha.ts`（经 `index.ts` 重导出），存储项目快照与用户关注关系。
- 抓取服务：独立的抓取与解析模块（建议置于 packages/api 内的 `src/services/alpha-scraper.ts` 或独立 worker），负责拉取 Binance Alpha 页面、解析、校验、写库。
- 定时调度：每日一次触发抓取任务（cron 调度），与抓取服务解耦。

数据流：定时调度 → 抓取服务（抓取 + 解析 + 规则计算）→ 写入 `alpha_project` 快照 → 前端经 tRPC `alpha.list` 读取缓存数据；用户通过 `alpha.toggleWatch` 维护 `user_alpha_watch`。

## 功能模块设计

### 1. 页面抓取与解析模块（抓取服务）

- 涉及层：抓取服务、packages/db。
- 关键设计：通过 HTTP 客户端（undici/fetch）请求 Binance Alpha 页面或其内部数据接口，解析出项目名称、当前价格及历史价格/涨跌幅字段。设置合理 user-agent、超时与重试（指数退避）。解析采用多路径与字段校验：缺失关键字段时判定为抓取失败，进入降级流程，不覆盖已有快照。解析结果归一化为统一的项目数据结构后交给规则引擎与写库。

### 2. 缓存与降级模块

- 涉及层：抓取服务、packages/db、前端。
- 关键设计：`alpha_project` 表即为读取缓存（前端永不在请求链路实时抓取）。每次成功抓取后整体更新快照并刷新 `updatedAt`；抓取失败时保留旧数据、记录失败日志/告警，并维护一个最近抓取状态（成功/失败、时间）。前端读取时一并返回 `updatedAt` 与最近抓取状态，用于渲染"上次更新时间"与降级提示横幅。

### 3. 底部盘整规则计算引擎

- 涉及层：抓取服务（计算）、packages/db（持久化）。
- 关键设计：纯规则计算（非 AI）。在抓取写库前对每个项目计算：
  - `change30d`：30 日涨跌幅；条件 `change30d < -30%`（30 日跌幅 > 30%）。
  - 近 7 日波动：`(max7d - min7d) / min7d`；条件 `< 10%`。
  - 两条件同时满足则 `isConsolidating = true`。
  阈值（30% / 10%）从配置读取（`@coin-pilot/env` 或常量模块），便于调整。计算依据（30 日跌幅实际值、近 7 日波动实际值、阈值、计算时间）写入 `consolidationSnapshot`（JSONB），供前端展示判断依据。

### 4. 定投关注标记 CRUD 模块

- 涉及层：packages/api（tRPC）、packages/db、前端。
- 关键设计：`user_alpha_watch` 关联表记录 (userId, alphaProjectId)。`alpha.toggleWatch` 用 `protectedProcedure`，依据 `ctx.session.user.id` 进行增删（幂等：已关注则移除，未关注则添加）。`alpha.list` 返回项目时按当前用户连表标注 `isWatched`。

### 5. 前端列表与判断依据展示模块

- 涉及层：前端 apps/web。
- 关键设计：在 `apps/web/src/routes/` 新增 Alpha 项目页面路由，使用 shadcn/ui 表格/卡片展示名称、价格、change7d、change30d，对 `isConsolidating` 项目高亮并提供"判断依据"弹层（Popover/Tooltip）展示快照数值与阈值。每行提供"定投关注"切换按钮（调用 `alpha.toggleWatch`）。页面顶部展示 `updatedAt`；抓取失败时展示降级提示横幅。项目名等抓取文本通过 React 默认转义渲染，禁止 `dangerouslySetInnerHTML`。

### 6. 每日定时任务模块

- 涉及层：定时调度、抓取服务。
- 关键设计：每日触发一次抓取任务（cron 表达式，如每日固定 UTC 时间）。任务调用抓取服务执行抓取→解析→规则计算→写库，并更新抓取状态。任务需做并发互斥（避免重复运行），失败仅记录与告警，不抛出影响调度。

## 接口契约（tRPC）

路由文件：`packages/api/src/routers/alpha.ts`，合并入 `routers/index.ts`。

### alpha.list（publicProcedure，读取列表）

- 输入（zod 概要）：
  ```
  z.object({
    onlyConsolidating: z.boolean().optional(),
    onlyWatched: z.boolean().optional(),
  }).optional()
  ```
- 输出（概要）：
  ```
  {
    updatedAt: Date | null,
    lastScrapeStatus: "success" | "failed",
    projects: Array<{
      id: string,
      name: string,
      price: number,
      change7d: number,
      change30d: number,
      isConsolidating: boolean,
      consolidationSnapshot: { change30d: number, volatility7d: number, thresholds: { drop30d: number, volatility7d: number } },
      isWatched: boolean,
    }>
  }
  ```
  （`isWatched` 仅在已登录会话存在时按用户计算，否则为 false。）

### alpha.toggleWatch（protectedProcedure，切换定投关注）

- 输入（zod 概要）：
  ```
  z.object({
    alphaProjectId: z.string(),
  })
  ```
- 输出（概要）：`{ alphaProjectId: string, isWatched: boolean }`
- 行为：基于 `ctx.session.user.id` 幂等切换 `user_alpha_watch` 记录。

## 数据模型（Drizzle 概要）

schema 文件：`packages/db/src/schema/alpha.ts`，经 `index.ts` 重导出；migration 输出 `./src/migrations`，命令 `pnpm db:generate` / `db:migrate`。

### alpha_project

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid (pk) | 主键 |
| name | text | 项目名称 |
| price | numeric | 当前价格 |
| change7d | numeric | 7 日涨跌幅（百分比） |
| change30d | numeric | 30 日涨跌幅（百分比） |
| isConsolidating | boolean | 是否底部盘整 |
| consolidationSnapshot | jsonb | 判断依据快照（30 日跌幅、近 7 日波动、阈值、计算时间） |
| updatedAt | timestamp | 最近一次成功抓取时间 |
| createdAt | timestamp | 创建时间 |

> 可选辅助表 `alpha_scrape_status`（或单行配置表）记录 `lastRunAt` / `lastStatus` / `lastError`，用于降级展示与告警；若仅需最近状态，也可复用单例表。

### user_alpha_watch

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid (pk) | 主键 |
| userId | text (fk → user.id) | 用户（来自 F-001 / Better-Auth） |
| alphaProjectId | uuid (fk → alpha_project.id) | 关注的项目 |
| createdAt | timestamp | 关注时间 |

> 在 (userId, alphaProjectId) 上建唯一索引，保证幂等。

## 安全考虑

- 抓取合规与频控：每日仅抓取一次，设置真实 user-agent、超时与退避重试，避免对 Binance 站点造成压力；尊重 robots 与访问频率，抓取逻辑集中以便审计。
- 用户关注受保护：`alpha.toggleWatch` 使用 `protectedProcedure`，仅允许操作当前会话用户自己的关注记录，防止越权。
- 防 XSS：抓取得到的项目名称等文本不可信，前端一律经 React 默认转义渲染，禁止 `dangerouslySetInnerHTML`；如需富文本须先消毒。
- 数据完整性：解析字段校验，缺失/异常时不写入坏数据，保留上次有效快照。
- 输入校验：所有 tRPC 输入用 zod 校验，拒绝非法 `alphaProjectId`。

## 技术决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 抓取方案/库 | HTTP 抓取（undici/fetch）+ HTML/JSON 解析（cheerio）；如页面强依赖 JS 渲染再评估无头浏览器 | 优先轻量方案，降低运行成本；解析层抽象，便于在页面结构变更时替换选择器 |
| 降级策略 | 抓取失败保留上次成功快照，记录失败状态并前端展示"上次更新时间 + 友好提示" | A1 中风险，保证可用性不被单次失败击穿 |
| 盘整阈值可配置 | 30 日跌幅阈值 30%、近 7 日波动阈值 10% 作为默认，置于配置（`@coin-pilot/env` 或常量） | 业务口径可能调整，避免硬编码 |
| 刷新调度 | 每日一次 cron 触发，互斥执行 | 满足 ≤ 24 小时刷新要求，控制抓取频率与合规 |
| 规则计算方式 | 纯规则计算（非 AI） | 盘整判定为确定性规则，透明可解释；如需项目简介摘要可选用 `claude-haiku-4-5`（本 Feature 非必需） |
| 数据读取 | 前端读数据库快照，不在请求链路实时抓取 | 满足页面 < 2s 性能要求 |
