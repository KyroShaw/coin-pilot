# F-003 宏观消息追踪 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始任务拆解 |

## 项目信息

- 项目名：`coin-pilot`
- specs 路径：`specs/3.macro-news-tracking/`
- 关联文档：`requirements.md`、`design.md`

## 任务列表

### A. 环境与数据模型
- [x] **T-001**：在 `@coin-pilot/env` 增加并校验 `CRYPTOPANIC_API_KEY`、`ANTHROPIC_API_KEY`（zod）。~15min
- [x] **T-002**：新增 `packages/db/src/schema/news.ts` 定义 `news_item` 表（`externalId` 唯一、`publishedAt` / `tags` 索引、`aiSummary` 可空），经 `schema/index.ts` 重导出。~30min
- [x] **T-003**：运行 `pnpm db:generate` 生成 migration 并提交。~15min

### B. 数据拉取与处理（packages/api 服务）
- [x] **T-004**：实现 CryptoPanic 拉取服务（调用 API、映射字段、限频与 429/5xx 指数退避重试）。~1h
- [x] **T-005**：实现去重入库（按 `externalId` upsert，回退规范化 url 哈希）。~30min
- [x] **T-006**：实现标签归类（CryptoPanic filter / 关键词 / 来源 → macro/regulation/market 映射表）。~30min
- [x] **T-007**：实现 AI 一句话摘要服务（`@anthropic-ai/sdk` + `claude-haiku-4-5`，对 `aiSummary IS NULL` 受控并发生成并写回缓存，失败跳过下轮重试）。~1h

### C. tRPC 接口
- [x] **T-008**：在 `packages/api/src/routers/news.ts` 实现 `news.list`（zod：tag/limit/cursor，游标分页，倒序，返回 updatedAt），并在 `routers/index.ts` 合并；用 `protectedProcedure`。~30min
- [x] **T-009**：实现 `news.refresh` mutation 串联「拉取→去重入库→摘要→归类」流水线（幂等）。~30min

### D. 定时调度
- [x] **T-010**：复用 F-002 调度机制，在 `apps/server` 注册 ≤ 30 分钟周期任务触发流水线。~30min

### E. 前端展示
- [x] **T-011**：新增简报路由页（`apps/web/src/routes/`），调用 `news.list` 渲染倒序卡片（标题/来源/时间/AI 摘要/外链 `rel="noopener"`），含「上次更新时间」与拉取失败友好提示。~1h
- [x] **T-012**：实现标签筛选（全部/宏观/监管/市场）与「加载更多」游标分页。~30min

### F. 集成与测试
- [x] **T-013**：核验验收标准 AC-003-1（每日 ≥10 条）、AC-003-2（每条带摘要 / 占位可补全）、AC-003-3（标签筛选一致）。~30min
- [x] **T-014**：去重 / 摘要缓存 / 限频重试的单元测试，并运行 `pnpm dlx ultracite check`。~30min

## 依赖关系

- T-001 → T-002 → T-003（环境与表结构先行）。
- T-004 依赖 T-001；T-005/T-006 依赖 T-002、T-004；T-007 依赖 T-002（及 T-001 密钥）。
- T-008/T-009 依赖 T-002、T-004~T-007。
- T-010 依赖 T-009（流水线就绪）。
- T-011/T-012 依赖 T-008。
- T-013/T-014 依赖前述全部。

## 风险点

- **CryptoPanic 限频**：速率限制可能触发 429 导致拉取失败；需限频 + 指数退避 + 超限跳过本轮，并保留上次 `updatedAt`。
- **摘要成本**：AI 调用按条触发，消息量上升时成本 / 延迟增加；用 haiku + 仅对无摘要消息生成 + 受控并发 + 缓存控制。
- **标签准确性**：filter / 关键词映射可能误分类，影响筛选体验；需维护映射表并预留人工 / AI 辅助校正空间（见开放问题）。
