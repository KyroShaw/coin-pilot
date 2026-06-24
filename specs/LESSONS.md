# LESSONS — 架构决策与踩坑记录

> 开发时必读。仅记录非显而易见的决策、踩坑、跨 feature 影响、环境/依赖特殊处理。

## 2026-06-24 — F-001 / 数据库迁移策略

- **本地开发数据库**：本地 PostgreSQL 18（Homebrew，superuser `martinshaw`，trust 认证免密码）。专用库 `coin_pilot`，`apps/server/.env` 的 `DATABASE_URL=postgresql://martinshaw@localhost:5432/coin_pilot`。
- **迁移为单一事实来源**：最初用 `pnpm db:push` 直接建基线表，会与后续 `db:migrate` 冲突（表已存在）。已改为：清空 public schema → `pnpm db:generate` 生成全量迁移 `0000_*` → `pnpm db:migrate` 应用。**后续新增/改表一律走 `db:generate` + `db:migrate`，并提交 `src/migrations/` 下迁移文件**，不要再用 `db:push`（除非临时本地试验）。

## 2026-06-24 — F-001 / 凭据加密

- **AES-256-GCM 主密钥**：`ENCRYPTION_MASTER_KEY`（64 位十六进制 = 32 字节）经 `@coin-pilot/env` 校验注入；加解密工具在 `packages/api/src/lib/crypto.ts`，落库存 `iv + authTag + ciphertext` 三段（十六进制）。**主密钥丢失/变更将导致已存凭据无法解密**，生产需妥善保管与轮换方案。
- **测试隔离 env**：单测导入 `@coin-pilot/env/server` 会触发全部 env 校验。测试里设 `process.env.SKIP_ENV_VALIDATION="true"` 并只注入所需变量即可（见 `crypto.test.ts`）。

## 2026-06-24 — 工具链

- **测试框架**：项目原无测试框架，已在 `packages/api` 引入 **Vitest**（`pnpm -F @coin-pilot/api test`）。后续各包加测试沿用 Vitest。
- **代码审查**：环境无 `codex` CLI。N4 的强制 Codex Review 用 `yd-code-reviewer` skill（两轮审查 + 安全扫描）在 feature 后端完成的检查点统一替代。
- **pre-commit 钩子**：原钩子全仓跑 `ultracite fix`，被脚手架既有违规（drizzle `import * as schema`、schema barrel、shadcn）卡住。已改为 **lint-staged 风格仅检查暂存文件**（`.husky/pre-commit`）。

## 2026-06-24 — Claude AI 集成（共享）

- **SDK 与模型**：`@anthropic-ai/sdk`，封装在 `packages/api/src/lib/claude.ts`。复杂推理用 `REASONING_MODEL=claude-opus-4-8`（adaptive thinking + `output_config.effort`），轻量摘要用 `SUMMARY_MODEL=claude-haiku-4-5`。`ANTHROPIC_API_KEY` 经 `@coin-pilot/env`，仅服务端。
- **结构化输出**：用 `anthropic.messages.parse({ output_config: { format: zodOutputFormat(schema) } })` 取 `response.parsed_output`。注意 `zodOutputFormat` **只接受 1 个参数**（schema），传第二个参数会 TS2554。结构化输出不支持数值/长度约束，范围校验放代码侧。
- **占位密钥**：`.env` 中 `ANTHROPIC_API_KEY=sk-ant-REPLACE_ME` 为占位，AI 功能联调前需替换为真实 key。新增需 key 的 env 变量请同步加入 `packages/env/src/server.ts` 校验。

## 2026-06-24 — F-002 板块轮动

- **刷新架构**：`packages/api/src/services/sector.ts` 编排（行情→AI 归类→龙头匹配→事务落库，统一 `snapshotId`）。失败写 `sector_refresh_log` 并**保留上一成功快照**（不删旧数据）。`apps/server/src/scheduler.ts` 用 `setInterval`（`SECTOR_REFRESH_INTERVAL_MS` 默认 25min，env 上限 30min 满足 AC-002-3）+ 并发互斥；内部端点 `POST /internal/sector/refresh` 用 `INTERNAL_REFRESH_TOKEN`（header `x-internal-token`）保护，供外部 cron 兜底。
- **读取即缓存**：`sector.getAll` 只读最新成功 `snapshotId`，用户请求不触发外部调用；`stale` = 距上次刷新 > 30min。后续 feature 的定时类任务可复用此「调度+快照+stale」模式。

## 2026-06-24 — F-003 宏观消息

- **CryptoPanic**：`packages/api/src/lib/cryptopanic.ts`，v1 `posts/?auth_token=...&public=true`；429/5xx 指数退避重试 3 次；`mapTags`（关键词→macro/regulation/market，market 兜底）与 `urlHash`（缺 id 时去重兜底）为纯函数、已单测。
- **去重与摘要缓存**：`onConflictDoNothing(externalId)` 去重；摘要仅对 `aiSummary IS NULL` 生成（haiku、并发 5、`allSettled` 单条失败跳过下轮重试），同条只调一次 AI。
- **游标分页**：`(publishedAt, id)` 复合游标，`desc(publishedAt), desc(id)`，cursor 编码 `ISO__id`；前端 `useInfiniteQuery(trpc.news.list.infiniteQueryOptions(input, { getNextPageParam: p => p.nextCursor }))`，tag 入参变化即重查。
- **drizzle text[]**：`text("tags").array().notNull().default(sql\`'{}'::text[]\`)`；GIN 索引 `index(...).using("gin", table.tags)`，数组筛选用 `arrayContains(col, [tag])`；倒序索引 `table.col.desc()`。
- **调度复用**：`apps/server/src/scheduler.ts` 加 `triggerNewsRefresh` + `startNewsScheduler`（独立互斥，复用 `SECTOR_REFRESH_INTERVAL_MS`）；内部端点 `POST /internal/news/refresh`。**注意**：格式化器会把「暂未被重新赋值的 `let`」改成 `const`——加可变模块级标志时，先连同赋值一起写（或整文件重写），避免被改成 const 后报错。

## 2026-06-24 — F-004 Binance Alpha

- **刷新按 name upsert（关键）**：`alpha_project` 整体刷新若用删+插会因 `user_alpha_watch` 外键 `onDelete cascade` 丢掉用户关注。改为 **name 唯一 + onConflictDoUpdate(name)**，项目 id 稳定、关注不丢。后续任何「关联用户数据的快照表」刷新都应保持父行 id 稳定。
- **盘整规则**：纯函数 `packages/api/src/lib/alpha-rules.ts`（`change30d < -30 且 volatility7d < 10`，阈值常量、严格小于），8 单测覆盖临界。`volatility7d` 优先用 7 日价格序列 `(max-min)/min`，无序列时回退 `|change7d|`（OQ-3）。
- **抓取**：`services/alpha.ts` 端点 `bapi/.../alpha/all/token/list` **需对照线上核验**（A1 中风险）；UA/超时/429-5xx 退避；失败写 `alpha_scrape_status(failed)` 保留旧快照。每日调度 `startAlphaScheduler`（DAY_MS）+ `POST /internal/alpha/refresh`。
- **seed**：`pnpm db:seed` 已含 8 个 Alpha 项目（4 盘整/4 非），用于无真实抓取端点时的演示。
- **@coin-pilot/ui 缺组件**：暂无 Popover/Tooltip/Table，依据展示用 `useState` 内联展开面板替代，避免引入新 ui 依赖。
- **路由导航**：新功能页须在 `apps/web/src/components/header.tsx` 的 `links` 加入口，否则页面不可达（曾导致板块页看不到）。

## 2026-06-24 — F-005 订单复盘

- **复盘流式范围**：现有 tRPC 仅 `httpBatchLink`（无 subscription/SSE link）。`review.generate` 实现为 **mutation**：服务端用 `anthropic.messages.stream(...).finalMessage()`（opus-4-8 + adaptive thinking + `effort high`）内部流式生成规避超时 → 落库 `review_report` → 返回完整 markdown；前端 `<pre whitespace-pre-wrap>` 渲染 + clipboard 复制 + Blob 导出 .md。**浏览器逐字流式后续可加 SSE/subscription link**。
- **订单同步口径**：基于合约 `GET /fapi/v1/income?incomeType=REALIZED_PNL` 跨币种、90 天按 7 天切片、`(userId,exchangeOrderId)` 唯一 `onConflictDoNothing` 幂等。**income 不含 entry/exit 价与 side**，故为占位（演示由 seed 补全）；如需补全用 `/fapi/v1/userTrades` 按 symbol 拉取（OQ）。futures base = `fapi.binance.com`，签名同 HMAC。
- **用户数据隔离**：order/review 全 `protectedProcedure`；saveRationale 先校验订单归属再 upsert；review.generate 仅聚合 `userId AND inArray(orderIds)` 的订单；export 仅本人。后续 F-006 复用 `closed_order`（已含 `(userId,closedAt)` 索引）。
- **三维度 prompt**：system prompt 固定 `## 执行质量 / ## 风险控制 / ## 改进建议`，满足 AC-005-3。
- **seed 用户作用域数据**：`closed_order` 按首个已注册用户灌（无用户则跳过）。先注册账号再 `pnpm db:seed` 才会有演示订单。seed 用 `onConflictDoUpdate(set: sql\`excluded.*\`)` 才能在重跑时刷新已存在行（`DoNothing` 不更新）。

## 2026-06-25 — F-006 资金曲线与风险预警

- **复用 closed_order**：曲线/streak 直接消费 F-005 的 `closed_order`（不建订单表）。`lib/equity.ts` 纯函数 `detectStreaks`（末端连续同号、0 中断）+ `buildEquityCurve`（按 closedAt 升序累计 + day/week 桶聚合，UTC 周一为周起点），6 单测覆盖临界。
- **路由组织**：`routers/equity.ts` 一个文件导出 `equityRouter`/`alertRouter`/`settingsRouter` 三个，分别合并为 `equity`/`alert`/`settings` 命名空间。阈值未配置回落 3/5，`updateThreshold` zod `int().min(2).max(10)` + `(userId)` upsert。
- **冷静提示**：`services/coaching.ts` 仅预警后按需，样本 <3 返回兜底文案不调 AI；opus-4-8 adaptive thinking 流式内部生成（同 F-005 mutation 模式）。
- **图表**：前端引入 **recharts**（`pnpm -F web add recharts`），`LineChart` 渲染 cumulativePnl，深色 contentStyle，曲线终值正绿负红。无 shadcn Alert/Tabs，预警横幅与天/周/preset 切换用自定义按钮。
- **演示连亏**：seed 把最近 3 笔订单设为亏损以触发默认阈值(3)的亏损预警横幅。
