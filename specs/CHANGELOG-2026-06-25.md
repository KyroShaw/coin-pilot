# 变更日志 — 2026-06-25

coin-pilot 全部 6 个 feature（specs/1~6）开发完成。数据库迁移 0000–0007，迁移为单一事实来源（禁 `db:push`）。AI 经 `@anthropic-ai/sdk`（opus-4-8 推理 / haiku-4-5 摘要）；`ANTHROPIC_API_KEY` / `CRYPTOPANIC_API_KEY` 当前为占位，AI/新闻实时联调待真实 key。

## Feature 1：用户账号与 Binance API 绑定

### 新增
- Better-Auth 邮箱密码登录；绑定 Binance 只读 API Key（拒绝含交易/提现权限的 Key）。
- API Key/Secret 以 AES-256-GCM 加密落库，响应/日志均脱敏（仅返回末四位）。

### 关键文件
- `packages/api/src/lib/crypto.ts` — AES-256-GCM 加解密（+ 单测）
- `packages/api/src/lib/binance.ts` — HMAC 签名 + 账户拉取 + 按用户解密复用
- `packages/api/src/routers/binance.ts` — `bind`/`status`/`unbind`（protectedProcedure）
- `packages/db/src/schema/binance.ts` — `binance_credential`（迁移 0000）
- `apps/web/src/routes/_auth/binance.tsx`

## Feature 2：板块轮动感知

### 新增
- Binance 公开 24h 行情 → Claude 结构化归类（板块 + 热度 + 龙头），事务落库统一 `snapshotId`；定时刷新 ≤30min，失败保留旧快照。

### 关键文件
- `packages/api/src/lib/claude.ts` — 共享 Anthropic 客户端
- `packages/api/src/services/sector.ts` — 刷新编排
- `packages/api/src/routers/sector.ts` — `sector.getAll`（只读缓存 + stale）
- `packages/db/src/schema/sector.ts`（迁移 0001）
- `apps/server/src/scheduler.ts` — 定时器 + 内部刷新端点
- `apps/web/src/routes/_auth/sectors.tsx` — Market Pulse 热力图

## Feature 3：宏观消息追踪

### 新增
- CryptoPanic 拉取（429/5xx 退避）+ 标签映射 + 去重入库；Claude haiku 一句话摘要（缓存）；游标分页倒序 + 标签筛选。

### 关键文件
- `packages/api/src/lib/cryptopanic.ts` — 拉取 + `mapTags`/`urlHash`（+ 单测）
- `packages/api/src/services/news.ts` — 去重入库 + 摘要补全
- `packages/api/src/routers/news.ts` — `news.list`/`news.refresh`
- `packages/db/src/schema/news.ts`（迁移 0002）
- `apps/web/src/routes/_auth/news.tsx`

## Feature 4：Binance Alpha 跟踪

### 新增
- Alpha 项目抓取（UA/超时/退避）+ 纯规则盘整判定（`change30d<-30 且 volatility7d<10`，+ 单测）；按 name upsert 保 id 稳定；定投关注。

### 关键文件
- `packages/api/src/lib/alpha-rules.ts` — 盘整规则（+ 单测）
- `packages/api/src/services/alpha.ts` — 抓取 + 写库降级
- `packages/api/src/routers/alpha.ts` — `alpha.list`/`alpha.toggleWatch`
- `packages/db/src/schema/alpha.ts`（迁移 0004/0005）
- `apps/web/src/routes/_auth/alpha.tsx`

## Feature 5：已平仓订单复盘

### 新增
- 合约 `income(REALIZED_PNL)` 跨币种 7 天切片同步（幂等）；逻辑录入；Claude opus 三维度复盘报告（流式内部生成→落库），复制/导出 Markdown。

### 关键文件
- `packages/api/src/services/order.ts` — 同步（复用 F-001 解密）
- `packages/api/src/services/review.ts` — 三维度复盘生成
- `packages/api/src/routers/order.ts` / `review.ts`
- `packages/db/src/schema/order.ts` — `closed_order`/`order_rationale`/`review_report`（迁移 0006）
- `apps/web/src/routes/_auth/orders.tsx`

## Feature 6：资金曲线与风险预警

### 新增
- 复用 `closed_order` 累计盈亏曲线（天/周聚合，+ 单测）；连续盈亏检测；触发预警 + Claude 冷静提示；阈值可配（2–10）。

### 关键文件
- `packages/api/src/lib/equity.ts` — `detectStreaks`/`buildEquityCurve`（+ 单测）
- `packages/api/src/services/coaching.ts` — 冷静提示（样本兜底）
- `packages/api/src/routers/equity.ts` — `equity`/`alert`/`settings`
- `packages/db/src/schema/alert.ts` — `alert_setting`（迁移 0007）
- `apps/web/src/routes/_auth/equity.tsx` — recharts 曲线

## 工具链 / 数据

- 引入 **Vitest**（`packages/api`，22 单测）；pre-commit 钩子改为 lint-staged 风格。
- 种子脚本 `pnpm -F @coin-pilot/db db:seed`：真实行情板块 + 新闻 + Alpha + 演示订单。
- 移除脚手架示例（todos/dashboard/privateData）；优化前端导航（6 个功能页 + 首页重定向 /sectors）。

> 架构决策与踩坑详见 `specs/LESSONS.md`。
