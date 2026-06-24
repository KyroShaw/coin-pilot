# F-003 宏观消息追踪 — 需求规格

## 概述

本 feature 为 coin-pilot 提供宏观消息追踪能力：定期从第三方新闻 API（CryptoPanic）收集影响全球金融 / 加密市场的热点事件，由 Claude AI 为每条消息生成一句话「加密市场影响摘要」，并以简报形式按时间倒序展示，支持按标签（宏观 / 监管 / 市场）筛选。

目标是让用户在一个页面内快速掌握当下与加密行情高度相关的外部消息及其潜在影响，辅助复盘与决策。本 feature 依赖 F-001（账号 / 登录）提供的用户体系，并复用 F-002 一致的定时拉取调度机制。

## 项目信息

- 项目名（PROJECT_NAME）：`coin-pilot`
- 架构类型（ARCH_TYPE）：pnpm + Turborepo TypeScript monorepo
- 涉及包 / 应用：`apps/web`（前端展示）、`apps/server`（后端入口 + 定时调度）、`packages/api`（tRPC `news` 路由）、`packages/db`（Drizzle + PostgreSQL，`news_item` 表）、`packages/env`（CryptoPanic / Anthropic 密钥校验）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始需求 |

## 用户故事

- 作为一名加密货币交易者，我想要在一个页面看到近期影响市场的热点消息，以便快速了解当前市场的外部驱动因素。
- 作为一名时间有限的用户，我想要每条消息都附带一句话 AI 影响摘要，以便不必读完原文就能判断其对加密市场的潜在影响。
- 作为一名关注特定领域的用户，我想要按「宏观 / 监管 / 市场」标签筛选消息，以便只看与我关注方向相关的内容。
- 作为一名注重时效的用户，我想要消息按时间倒序排列并能看到上次更新时间，以便判断信息的新鲜度。

## 功能需求

- **[F-003-1] 接入第三方新闻 API 收集热点消息**
  - 通过定时调度（与 F-002 一致的机制）周期性调用 CryptoPanic API 拉取热点消息。
  - 拉取频率 ≤ 30 分钟一次；CryptoPanic API Key 经 `@coin-pilot/env` 注入，禁止散读 `process.env`。
  - 入库前按去重键（CryptoPanic 消息 id，回退用 `url` 规范化）去重，避免重复条目。
  - 单次拉取失败不影响已入库历史数据；记录失败并保留上次成功的 `updatedAt`。

- **[F-003-2] AI 对消息进行加密市场影响摘要（一句话）**
  - 对每条新入库且尚无摘要的消息，调用 Claude（`@anthropic-ai/sdk`）生成一句话「加密市场影响摘要」。
  - 高频低复杂度任务，默认使用 `claude-haiku-4-5` 控制成本与延迟；如需更强分析可回退 `claude-opus-4-8`。
  - 摘要结果缓存于 `news_item.aiSummary`，同一条消息不重复调用 AI。
  - `ANTHROPIC_API_KEY` 经 `@coin-pilot/env` 注入。

- **[F-003-3] 按时间倒序展示，支持标签筛选**
  - 列表按 `publishedAt` 倒序展示；每条展示标题、来源、发布时间、原文外链与 AI 影响摘要。
  - 支持按标签（宏观 / 监管 / 市场）筛选，可单选或不筛选（全部）。
  - 提供分页 / 加载更多，避免一次返回过多数据。
  - 外链使用 `target="_blank"` 时附 `rel="noopener"`。

## 非功能需求

- **性能**
  - 消息列表页响应时间 < 2s。
  - 行情 / 消息类数据刷新周期 ≤ 30 分钟。
  - 列表查询走分页与数据库索引（`publishedAt`、`tags`），避免全表扫描。
- **刷新与时效**
  - 定时调度按 ≤ 30 分钟拉取，前端展示「上次更新时间」。
- **错误处理**
  - CryptoPanic 或 Claude 调用失败时展示友好提示并显示上次更新时间，不暴露内部异常细节。
  - AI 摘要生成失败时，消息仍可展示（摘要位显示「摘要生成中 / 暂不可用」），下次调度重试生成。
- **API 限频与重试**
  - 尊重 CryptoPanic 速率限制：控制调用频率、单次拉取条数；对 429 / 5xx 采用指数退避重试，超过上限则跳过本轮。
  - AI 调用按需触发（仅对无摘要的新消息），控制并发，避免突发成本与限频。
- **兼容性 / 规范**
  - 前端 React 19 + TanStack Router 文件式路由（`apps/web/src/routes/`），TailwindCSS + `@coin-pilot/ui`（shadcn/ui）。
  - 所有 tRPC 输入用 zod（4.1.13）经 `.input(z.object({...}))` 校验。
  - 代码遵循 Biome / Ultracite（Tab 缩进、双引号）。

## 验收标准

- [ ] **[AC-003-1]** 每日至少展示 10 条有效消息（去重后、可正常展示的条目）。
- [ ] **[AC-003-2]** 每条消息附带 AI 影响摘要（`aiSummary` 非空，或在生成失败时给出占位且下轮可补全）。
- [ ] **[AC-003-3]** 支持按标签（宏观 / 监管 / 市场）筛选，筛选结果与所选标签一致。

## 依赖

- **外部服务**
  - CryptoPanic API（第三方新闻数据源，需 API Key，存在速率限制）。
  - Anthropic Claude（`@anthropic-ai/sdk`，`claude-haiku-4-5`，可回退 `claude-opus-4-8`）生成一句话摘要。
- **内部包**
  - `packages/db`：Drizzle ORM + PostgreSQL（pg 驱动），新增 `news_item` 表。
  - `packages/api`：tRPC（`router`/`publicProcedure`/`protectedProcedure`/`createContext`），新增 `news` 路由。
  - `packages/env`：基于 zod 的 `@coin-pilot/env`，校验 `CRYPTOPANIC_API_KEY`、`ANTHROPIC_API_KEY`。
- **跨 feature 依赖**
  - F-001：账号 / 登录与 `ctx.session`。
  - F-002：复用一致的定时拉取调度机制。
- **库 / 运行时**
  - zod 4.1.13（输入校验）。

## 开放问题

- **标签分类映射规则**：CryptoPanic 返回的原始 filter / category 与本 feature 的「宏观 / 监管 / 市场」三类如何映射，需要在 design 阶段确定映射表（关键词 / 来源 / CryptoPanic filter → 内部标签）；当 AI 摘要阶段可顺带做轻量归类时，是否由 AI 辅助打标签待定。其余无重大开放问题。
