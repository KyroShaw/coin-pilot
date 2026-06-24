# Binance Alpha 项目跟踪 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始任务拆解 |

## 项目信息

- Feature 编号：F-004
- Feature 名称：Binance Alpha 项目跟踪
- specs 路径：specs/4.binance-alpha-tracking/
- 涉及层：前端 apps/web、API 层 packages/api、后端 apps/server、数据库 packages/db、抓取服务、定时调度

## 任务列表

### 数据层

- [x] T-001: 在 `packages/db/src/schema/alpha.ts` 定义 `alpha_project`（含 price/change7d/change30d/isConsolidating/consolidationSnapshot/updatedAt）与 `user_alpha_watch`（唯一索引），并经 `index.ts` 重导出 ~1h
- [x] T-002: 添加抓取状态记录（`alpha_scrape_status` 单例表或字段：lastRunAt/lastStatus/lastError），运行 `pnpm db:generate` 生成 migration 并 `db:migrate` ~30min

### 抓取与规则

- [x] T-003: 实现页面抓取与解析模块（HTTP 抓取 + 解析，user-agent、超时、退避重试、字段校验）~1h
- [x] T-004: 实现底部盘整规则计算引擎（change30d < -30% 且 近 7 日波动 < 10%，阈值可配置，输出 consolidationSnapshot）~1h
- [x] T-005: 实现写库与降级逻辑（成功整体更新快照 + updatedAt；失败保留旧数据并记录抓取状态/告警）~1h

### 定时调度

- [x] T-006: 实现每日定时抓取任务（cron 触发、并发互斥、调用抓取→规则→写库），挂载到 apps/server ~1h

### API 层

- [x] T-007: 新建 `packages/api/src/routers/alpha.ts`，实现 `alpha.list`（publicProcedure，返回项目 + updatedAt + lastScrapeStatus + 按用户 isWatched），zod 校验 ~1h
- [x] T-008: 实现 `alpha.toggleWatch`（protectedProcedure，基于 ctx.session 幂等增删 user_alpha_watch），并在 `routers/index.ts` 合并 alpha 路由 ~30min

### 前端

- [x] T-009: 在 `apps/web/src/routes/` 新增 Alpha 项目列表路由与页面（shadcn/ui 表格展示名称/价格/change7d/change30d），顶部展示上次更新时间 ~1h
- [x] T-010: 实现盘整高亮与"判断依据"展示（Popover/Tooltip 展示快照数值与阈值），抓取失败降级提示横幅 ~30min
- [x] T-011: 实现"定投关注"切换按钮（调用 alpha.toggleWatch，登录态处理与乐观更新）~30min

### 集成与测试

- [x] T-012: 规则引擎单元测试（边界值：跌幅 30%、波动 10% 临界；满足/不满足组合）~30min
- [x] T-013: 抓取降级与 API 集成测试（抓取失败保留旧数据、list 返回 updatedAt/状态、toggleWatch 鉴权与幂等）~1h
- [x] T-014: 端到端验收核验（AC-004-1 每日更新、AC-004-2 依据可见、AC-004-3 关注增删）+ `pnpm dlx ultracite fix` ~30min

## 依赖关系

- T-001 → T-002 → T-003/T-004/T-005（抓取与规则依赖 schema）
- T-004 被 T-005 调用；T-003/T-004/T-005 → T-006（定时任务编排抓取与规则）
- T-001/T-002 → T-007/T-008（API 读写依赖表结构）
- T-007/T-008 → T-009/T-010/T-011（前端依赖 tRPC 接口）
- T-004 → T-012；T-005/T-007/T-008 → T-013；全部 → T-014
- 跨 Feature：T-001（user_alpha_watch.userId）与 T-008 依赖 F-001 账号/登录

## 风险点

- 页面结构变更导致抓取失败：Binance Alpha 无官方 API，HTML/接口结构可能变动，解析需多路径与字段校验，配合告警便于及时修复选择器。
- 数据稳定性（A1 中风险）：单次抓取失败须降级，保留上次快照并展示上次更新时间，不得呈现空白或错误。
- 合规与频控：每日仅一次抓取，需设置真实 user-agent、超时与退避，避免对源站造成压力或被封禁。
- 历史价格依赖：7/30 日涨跌幅与 7 日波动需历史价格序列，若源页面不提供需补充行情来源或累积每日快照（见 requirements 开放问题 OQ-3）。
