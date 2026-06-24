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
