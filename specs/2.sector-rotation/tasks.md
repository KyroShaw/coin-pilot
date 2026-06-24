# 板块轮动感知 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始任务拆解 |

## 项目信息

- 项目名：`coin-pilot`
- 架构类型：pnpm + Turborepo TypeScript monorepo
- specs 路径：`specs/2.sector-rotation/`

## 任务列表

### 数据层（packages/db）

- [x] **T-001**：在 `packages/db/src/schema/sector.ts` 定义 `sector_snapshot`、`sector_leader`（及可选 `sector_refresh_log`）表，含 `snapshotId`、`updatedAt`，并经 `schema/index.ts` 重导出。~1h
- [x] **T-002**：执行 `pnpm db:generate` 生成 migration 并 `pnpm db:migrate` 应用，校验表结构。~30min

### 行情采集与 AI 汇总（apps/server）

- [x] **T-003**：实现 Binance 公开行情采集函数（拉取 24h ticker、筛选 USDT 交易对、提取价格/涨跌幅/成交量），含错误处理。~1h
- [x] **T-004**：实现 Claude 板块归类与热度汇总服务，使用 `claude-opus-4-8`，结构化 JSON 输出并用 zod 校验；密钥经 `@coin-pilot/env`。~1h
- [x] **T-005**：实现龙头币种匹配逻辑（为各板块成分币种匹配最新行情并选出至少 1 个龙头）。~30min
- [x] **T-006**：实现刷新作业编排（采集 → AI 汇总 → 龙头匹配 → 落库统一 `snapshotId`），失败保留旧快照并记录日志。~1h

### 定时调度（apps/server / packages/env）

- [x] **T-007**：在 `@coin-pilot/env` 增加 `SECTOR_REFRESH_INTERVAL_MS`（默认 25 分钟）与内部刷新 token 配置。~15min
- [x] **T-008**：在 `apps/server` 注册 node 定时器驱动刷新作业（含并发互斥），并暴露受 token 保护的内部刷新 HTTP 端点。~1h

### API 层（packages/api）

- [x] **T-009**：新增 `src/routers/sector.ts`，实现 `sector.getAll`（`protectedProcedure`、zod 输入校验、读取最新成功快照），并在 `routers/index.ts` 合并。~1h

### 前端（apps/web）

- [x] **T-010**：在 `apps/web/src/routes/` 新增首页板块区路由/组件，调用 `sector.getAll`，用 `@coin-pilot/ui` 渲染热度排名榜与龙头卡片（价格、涨跌幅）。~1h
- [x] **T-011**：实现更新时间展示与降级提示（`stale` 或失败时显示友好提示 + 上次更新时间）。~30min

### 集成与测试

- [x] **T-012**：端到端联调（触发刷新 → 落库 → 前端展示），核验 [AC-002-1] 至少 5 板块每板块至少 1 龙头、[AC-002-2] 标注更新时间。~1h
- [x] **T-013**：验证刷新周期 ≤ 30 分钟（[AC-002-3]）与失败降级路径，运行 `pnpm dlx ultracite check` 校验代码规范。~30min

## 依赖关系

- T-002 依赖 T-001（schema 先于 migration）。
- T-005、T-006 依赖 T-003、T-004（采集与 AI 汇总先于编排）。
- T-008 依赖 T-006、T-007（调度依赖刷新作业与配置）。
- T-009 依赖 T-001/T-002（读取已落库快照）。
- T-010、T-011 依赖 T-009（前端依赖 tRPC 接口）。
- T-012、T-013 依赖前述全部任务。
- 全功能依赖 F-001（账号/登录）提供会话。

## 风险点

- **Binance 接口限频**：全市场 ticker 拉取可能触发限频；通过服务端缓存快照、控制刷新频率（≤ 30 分钟）与单次拉取降低风险。
- **板块归类准确性**：AI 归类缺乏权威「币种→板块」映射，可能出现归类偏差或不稳定（见 requirements 开放问题）；可后续引入第三方分类数据辅助。
- **AI 调用成本与延迟**：opus 复杂推理调用成本与耗时较高；通过仅在定时刷新中调用、用户请求只读缓存来控制。
- **刷新失败导致数据陈旧**：连续刷新失败会使 `stale` 持续为 true；通过日志与降级提示暴露，保证用户知情。

## 预估总时长

约 11 小时（13 个任务）。
