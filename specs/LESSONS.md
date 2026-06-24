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
