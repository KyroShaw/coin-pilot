# F-003 宏观消息追踪 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始设计 |

## 项目架构

本 feature 跨以下层，遵循 `.claude/rules`（backend-api、database、frontend、security）：

- **前端（`apps/web`）**：React 19 + TanStack Router 文件式路由（`apps/web/src/routes/`）；消息简报页通过类型安全 tRPC 客户端读取数据，使用 `@coin-pilot/ui`（shadcn/ui）与 Tailwind 渲染倒序列表与标签筛选。
- **后端 API（`packages/api`）**：在 `src/routers/news.ts` 定义 `news` 路由并于 `routers/index.ts` 合并；复用 `src/index.ts` 的 `router`/`publicProcedure`/`protectedProcedure`；输入用 zod 校验。业务逻辑（拉取、去重、摘要、归类）下沉到 `packages/api`，`apps/server` 仅接 Hono → tRPC 适配器与调度触发。
- **数据库（`packages/db`）**：Drizzle ORM + PostgreSQL，新增 `src/schema/news.ts`（`news_item` 表）并经 `schema/index.ts` 重导出；通过 `pnpm db:generate` / `db:migrate` 管理。
- **AI**：经 `@anthropic-ai/sdk` 调用 Claude `claude-haiku-4-5` 生成一句话摘要；密钥经 `@coin-pilot/env`。
- **定时调度**：复用与 F-002 一致的调度机制，由 `apps/server` 侧周期（≤ 30 分钟）触发「拉取 → 去重入库 → 补摘要 → 归类」流水线。

## 功能模块设计

### 1. CryptoPanic 拉取与去重入库
- **涉及层**：定时调度、`packages/api`（拉取服务）、`packages/db`（写入）、`packages/env`（密钥）。
- **关键设计**：调度触发拉取服务，调用 CryptoPanic API（携带 `CRYPTOPANIC_API_KEY`）；将响应映射为内部结构（`source`、`url`、`publishedAt`、原始 filter）。以去重键 `externalId`（CryptoPanic 消息 id）为唯一约束，回退用规范化 `url` 的哈希。写入用 upsert（`ON CONFLICT (externalId) DO NOTHING/UPDATE`），避免重复条目。失败时记录并保留上次 `updatedAt`。

### 2. AI 一句话摘要生成与缓存
- **涉及层**：定时调度、`packages/api`（AI 服务）、`packages/db`（缓存写回）、AI。
- **关键设计**：流水线在入库后查询 `aiSummary IS NULL` 的消息，逐条（受控并发）调用 Claude `claude-haiku-4-5`，prompt 约束输出为「一句话、聚焦对加密市场的潜在影响」。结果写回 `news_item.aiSummary` 作为缓存，同一条不重复调用 AI。生成失败的条目跳过、下轮重试，不阻塞展示。

### 3. 标签归类与筛选
- **涉及层**：`packages/api`（归类逻辑）、`packages/db`（`tags` 列）。
- **关键设计**：基于映射规则把 CryptoPanic 原始 filter / 关键词 / 来源映射到内部标签集合「宏观 / 监管 / 市场」，存为 `tags`（`text[]`）。查询时按所选标签用数组包含过滤（`arrayContains`）。映射表集中维护，便于调整。

### 4. 倒序展示组件（前端）
- **涉及层**：前端（`apps/web`）。
- **关键设计**：新增简报路由页，调用 `news.list`（标签 + 分页参数）。列表按 `publishedAt` 倒序渲染卡片：标题、来源、发布时间、AI 摘要、原文外链（`target="_blank"` + `rel="noopener"`）。顶部标签筛选（全部 / 宏观 / 监管 / 市场）与「加载更多」分页；展示「上次更新时间」；拉取失败展示友好提示。函数组件、hook 顶层调用、`key` 用消息 id。

### 5. 定时刷新
- **涉及层**：定时调度、`apps/server`。
- **关键设计**：复用 F-002 调度机制，按 ≤ 30 分钟周期触发模块 1 → 2 → 3 流水线；调度任务幂等（去重 + 摘要缓存保证重复执行安全）。

## 接口契约（tRPC）

`news` 路由（`packages/api/src/routers/news.ts`）：

- **`news.list`**（`query`）— 读取消息列表，支持标签筛选与分页。
  - 输入（zod 概要）：
    ```
    z.object({
      tag: z.enum(["macro", "regulation", "market"]).optional(), // 不传 = 全部
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().nullish(), // 基于 publishedAt + id 的游标分页
    })
    ```
  - 输出概要：`{ items: NewsItem[]; nextCursor: string | null; updatedAt: Date | null }`，`items` 按 `publishedAt` 倒序。
  - procedure：`protectedProcedure`（依赖 F-001 登录）。

- **`news.refresh`**（`mutation`，可选）— 手动触发一次拉取流水线（供运维 / 调度调用）。输入 `z.object({}).optional()`；procedure 为 `protectedProcedure`（生产中主要由调度调用）。

> 约定：读用 `.query()`、写用 `.mutation()`；所有异步 DB 操作 `await` 并返回；错误抛带恰当 `code` 的 `TRPCError`，不泄露内部细节。

## 数据模型（Drizzle）

`packages/db/src/schema/news.ts` — `news_item` 表（概要）：

| 列 | 类型 | 约束 / 说明 |
| --- | --- | --- |
| `id` | `uuid` / `serial` | 主键 |
| `externalId` | `text` | CryptoPanic 消息 id，**唯一**（去重键）；回退为规范化 url 哈希 |
| `source` | `text` | 来源名称 |
| `url` | `text` | 原文链接，`notNull` |
| `title` | `text` | 标题，`notNull` |
| `publishedAt` | `timestamp` | 原文发布时间，`notNull`，**建索引**（倒序查询） |
| `tags` | `text[]` | 内部标签集合（macro / regulation / market），`default []`，**建索引**（筛选） |
| `aiSummary` | `text` | 一句话 AI 影响摘要，可空（生成前为 null，作为缓存） |
| `createdAt` | `timestamp` | 入库时间，`default now()` |
| `updatedAt` | `timestamp` | 最近更新时间，`default now()` |

- 摘要缓存：`aiSummary` 持久化后不再重复调用 AI；以 `aiSummary IS NULL` 作为待生成集合。
- 经 `schema/index.ts` 重导出；`pnpm db:generate` 生成 migration 并提交。

## 安全考虑

- **第三方密钥服务端持有**：`CRYPTOPANIC_API_KEY`、`ANTHROPIC_API_KEY` 仅在服务端经 `@coin-pilot/env`（zod 校验）读取，绝不进入客户端 bundle，绝不进日志。
- **输入校验**：`news.list` 等所有 procedure 输入用 zod 校验；标签为 enum、分页有上下限。
- **鉴权**：列表 / 刷新用 `protectedProcedure`，无 session 抛 `UNAUTHORIZED`；不信任客户端身份。
- **参数化查询**：用 Drizzle 查询构建器（`eq` / `arrayContains` 等），绝不拼接用户输入到 SQL。
- **外链安全**：原文链接 `target="_blank"` 配 `rel="noopener"`；标题 / 摘要按文本渲染，避免 `dangerouslySetInnerHTML`，防止 XSS。
- **错误信息**：对客户端只暴露友好提示，不泄露第三方 API 异常细节。

## 技术决策

| 决策项 | 选择 | 理由 |
| --- | --- | --- |
| 摘要模型 | `claude-haiku-4-5`（回退 `claude-opus-4-8`） | 一句话摘要为高频低复杂度任务，haiku 成本 / 延迟最低；复杂消息可回退 opus 获更强分析 |
| 去重键 | `externalId`（CryptoPanic 消息 id），回退规范化 `url` 哈希 | id 稳定唯一；无 id 时用 url 规范化哈希兜底，避免重复入库 |
| 标签映射 | CryptoPanic filter / 关键词 / 来源 → macro / regulation / market 映射表 | 集中维护、可调整；与开放问题对应，design 阶段确定映射规则 |
| 摘要缓存 | 写回 `news_item.aiSummary`，以 `IS NULL` 判定待生成 | 同条消息只调用一次 AI，控成本，幂等可重试 |
| 限频与重试 | 控制拉取频率 / 条数；429 / 5xx 指数退避重试，超限跳过本轮；AI 受控并发 | 尊重 CryptoPanic 速率限制，避免封禁与成本激增 |
| 调度机制 | 复用 F-002 一致的定时调度（≤ 30 分钟） | 与项目刷新规范一致，减少重复实现 |
| 分页 | 基于 `publishedAt + id` 的游标分页 | 倒序稳定、无偏移漏读，配合索引性能好 |
