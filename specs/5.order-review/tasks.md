# F-005 已平仓订单复盘 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始任务拆解 |

## 项目信息

- **Feature 编号 / 名称**：F-005 已平仓订单复盘
- **specs 路径**：`specs/5.order-review/`
- **涉及技术层**：前端 `apps/web`、后端 `apps/server`、API 层 `packages/api`、数据库 `packages/db`、AI 集成（`@anthropic-ai/sdk` / `claude-opus-4-8`）、Binance 集成（只读）、加密解密（复用 F-001）。
- **强依赖**：F-001（账号 + 已绑定只读 Binance API Key + 凭据解密能力）。

## 任务列表

### 数据层

- [ ] **T-001**：在 `packages/db/src/schema/order.ts` 定义 `closed_order`、`order_rationale`、`review_report` 三张表（含字段、`(userId, exchangeOrderId)` 唯一约束、`closedAt` 索引），并经 `schema/index.ts` 重导出。~1h
- [ ] **T-002**：执行 `pnpm db:generate` 生成迁移并 `pnpm db:migrate` 应用，校验表结构。~15min

### 订单拉取与入库（F-005-1、F-005-2）

- [ ] **T-003**：扩展 Binance 客户端，复用 F-001 解密能力，新增已平仓订单拉取（合约 USDT 永续优先），实现 90 天时间分片 + 分页游标循环。~1h
- [ ] **T-004**：实现盈亏/方向解析与聚合，将成交映射为 `closed_order` 记录（含 `entryPrice`/`exitPrice`/`pnl`/`closedAt`）。~1h
- [ ] **T-005**：实现 `routers/order.ts` 的 `order.sync`（幂等 upsert 入库）与 `order.list`（按用户隔离、分页、倒序），并在 `routers/index.ts` 合并。~1h
- [ ] **T-006**：前端新增订单列表路由与组件（`apps/web/src/routes/`），展示交易对/方向/开平价/盈亏/平仓时间，盈亏配色，调用 `order.sync`/`order.list`，含拉取失败友好提示。~1h

### 用户逻辑录入（F-005-3）

- [ ] **T-007**：实现 `order.saveRationale`（按 `(userId, orderId)` upsert）procedure，zod 校验文本长度。~30min
- [ ] **T-008**：前端为每笔订单提供「开仓逻辑/平仓逻辑」录入与编辑 UI（`@coin-pilot/ui`），保存态/可编辑态。~1h

### AI 复盘报告（F-005-4、F-005-5）

- [ ] **T-009**：实现 Claude 客户端封装（`@anthropic-ai/sdk` + `@coin-pilot/env`），`claude-opus-4-8` + adaptive thinking + effort=high + 流式；编写三维度（执行质量/风险控制/改进建议）Prompt 模板。~1h
- [ ] **T-010**：实现 `routers/review.ts` 的 `review.generate`（流式 subscription/SSE，聚合订单数据 + 用户逻辑，边推流边落库 `review_report`）与 `apps/server` 流式透传。~1h
- [ ] **T-011**：实现 `review.export`（返回本人报告 Markdown）；前端流式渲染报告 + 一键复制剪贴板 + 导出 `.md` 下载。~1h

### 集成与测试

- [ ] **T-012**：联调端到端流程（绑定 → 同步 → 录入逻辑 → 生成报告 → 导出），并核验 **[AC-005-1]** 订单数量与 Binance 一致、不漏不重。~1h
- [ ] **T-013**：核验 **[AC-005-2]** 报告生成 < 30s（实测流式时延）、**[AC-005-3]** 报告含三维度、**[AC-005-4]** 复制/导出可用；补充安全核查（鉴权、用户隔离、密钥不外泄）。~1h
- [ ] **T-014**：运行 `pnpm dlx ultracite fix` 通过 Biome 校验，整理类型与错误处理。~30min

## 依赖关系

- **T-003 ~ T-013 多数任务依赖 F-001 完成**（需账号、已绑定只读 API Key 与凭据解密能力）。
- T-001 → T-002 → T-005（schema/迁移先于入库）。
- T-003 → T-004 → T-005 → T-006（拉取 → 解析 → procedure → 前端）。
- T-007 → T-008（逻辑 procedure 先于前端录入）。
- T-009 → T-010 → T-011（Claude 封装 → 生成 → 导出/前端）。
- T-012/T-013 依赖前述全部功能任务完成。

## 风险点

- **Binance 接口口径**：合约 vs 现货「已平仓」语义不同，realized PnL 与开/平仓配对易出错（见 design 技术决策与 requirements 开放问题）；分片分页边界处理不当可能漏单，影响 AC-005-1。
- **报告时延 < 30s**：opus + 高 effort 推理较慢，必须依赖流式输出与合理 Prompt/订单数量上限保证 AC-005-2；需实测兜底。
- **Token 成本**：批量复盘上下文长、effort=high 成本高，需限制单次订单数量（≤50）并落库复用，避免重复生成。
