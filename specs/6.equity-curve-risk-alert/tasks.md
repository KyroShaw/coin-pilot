# F-006 资金曲线分析与风险预警 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始任务拆解 |

## 项目信息

- 项目名：`coin-pilot`
- specs 路径：`specs/6.equity-curve-risk-alert/`
- 涉及层：前端 apps/web（含图表）、API packages/api、后端 apps/server、数据库 packages/db、AI（Anthropic Claude）

## 任务列表

### 数据库与设置
- [x] **T-001**：在 `packages/db/src/schema/alert.ts` 定义 `alert_setting` 表（user_id 唯一、loss_threshold 默认 3、profit_threshold 默认 5、时间戳），经 `index.ts` 重导出，`pnpm db:generate` + `db:migrate`。~1h

### API 层（packages/api）
- [x] **T-002**：实现 `equity.curve` 过程——读取当前用户 closed_order，按平仓时间升序累计 PnL，按 `granularity`（day/week）聚合到时间桶；zod 校验 range/granularity。~1h
- [x] **T-003**：实现连续盈亏检测引擎与 `alert.status` 过程——末端连续同号 streak 统计，结合用户阈值输出 loss/profit 的 triggered 与 streak。~1h
- [x] **T-004**：实现 `settings.getThreshold` / `settings.updateThreshold`——读写 `alert_setting`，未配置回落默认值，zod `int().min(2).max(10)` 校验。~30min
- [x] **T-005**：实现 `alert.coachingTip` 过程——汇总近期交易模式特征构造 prompt，调用 `claude-opus-4-8` + `thinking:{type:"adaptive"}` 流式生成冷静复盘提示（模式分析 + 操作建议）。~1h
- [x] **T-006**：在 `packages/api/src/routers/index.ts` 合并新路由，确认全部为 `protectedProcedure` 且按 user 隔离。~15min

### 前端（apps/web）
- [x] **T-007**：新增 TanStack Router 资金曲线路由页骨架，接入 tRPC client 与 TanStack Query。~30min
- [x] **T-008**：用 recharts 渲染盈亏曲线，接入 `equity.curve` 数据。~1h
- [x] **T-009**：实现按天/周视图切换（shadcn ToggleGroup/Tabs 控制 granularity 入参并重查）。~30min
- [x] **T-010**：实现页面顶部预警横幅（shadcn Alert），按 `alert.status` 渲染亏损/盈利预警与 streak。~30min
- [x] **T-011**：实现 AI 冷静提示展示——点击横幅入口调用 `alert.coachingTip`，流式增量渲染。~1h
- [x] **T-012**：实现阈值设置表单——读取/保存阈值，前端约束 2–10 并处理校验错误反馈。~30min

### 集成与测试
- [x] **T-013**：端到端联调——构造连续亏损 3 笔的 closed_order 数据，验证横幅触发与 AI 提示流程贯通。~1h
- [x] **T-014**：验收标准核验 + Ultracite 检查——逐条核对 AC-006-1~4，运行 `pnpm dlx ultracite fix`。~30min

## 依赖关系

- **强依赖 F-005**：所有曲线与连续盈亏计算消费其入库的 `closed_order`；F-005 数据未就绪时本 feature 无法联调，可先以 mock/种子数据并行开发（T-001~T-012）。
- 依赖 F-001：用户身份与账户归属。
- T-002/T-003/T-005 依赖 closed_order 字段口径；T-008~T-011 依赖对应 API 过程（T-002~T-005）就绪。

## 风险点

- **订单数据口径**：closed_order 的已实现盈亏是否已计入手续费/资金费，影响曲线准确性，需与 F-005 对齐字段语义。
- **连续盈亏边界定义**：0 盈亏、同时间戳订单的排序、最近窗口取数边界，需明确规则避免 streak 误判。
- **AI 提示质量**：模式分析需有足够近期数据支撑；prompt 上下文不足或样本太少时提示可能空泛，需设最小样本量与兜底文案。

## 任务统计

- 任务总数：14
- 预估总时长：约 11h 15min
