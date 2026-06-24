# F-001 用户账号与 Binance API 绑定 — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始设计 |

## 项目架构

- **架构类型**：pnpm + Turborepo TypeScript monorepo。
- **涉及层**：
  - 前端 `apps/web`：React 19 + TanStack Router（文件式路由 `apps/web/src/routes/`）+ Vite + TailwindCSS + `@coin-pilot/ui`（shadcn/ui）。
  - 后端入口 `apps/server`：Hono + tRPC 适配器（保持轻薄，仅挂载路由与 context）。
  - API 层 `packages/api`：tRPC。核心原语在 `src/index.ts`（`router`/`publicProcedure`/`protectedProcedure`）；`context.ts` 的 `createContext` 解析 Better-Auth session 为 `ctx.session`；功能路由 `src/routers/binance.ts`（本 feature 新增）在 `routers/index.ts` 合并。
  - 鉴权 `packages/auth`：Better-Auth（better-auth 1.6.11），邮箱密码认证。
  - 数据库 `packages/db`：Drizzle ORM + PostgreSQL。新增领域 schema `src/schema/binance.ts`，从 `schema/index.ts` 重导出。
  - 加密工具：`packages/api`（或 `packages/db` 旁的工具模块）内的 AES-256-GCM 加解密工具，主密钥经 `@coin-pilot/env` 注入。

## 功能模块设计

### 模块 A：用户注册/登录（F-001-1）

- **涉及层**：`packages/auth`、`apps/web`、`packages/api`（context）。
- **关键设计**：
  - 复用 Better-Auth 的邮箱密码 provider，登录态由 Better-Auth 管理；**不手改 Better-Auth 的 auth 表**。
  - 前端在 `apps/web/src/routes/` 新增 `login`、`register` 路由，使用 `@coin-pilot/ui` 的表单/按钮组件，调用 Better-Auth 客户端方法。
  - `createContext` 从请求头解析 session 暴露为 `ctx.session`，作为后续 `protectedProcedure` 的鉴权依据。
  - 受保护路由（如绑定页）在前端做路由守卫：无 session 重定向到 `login`。

### 模块 B：Binance 凭据绑定与校验（F-001-2）

- **涉及层**：`packages/api`（`routers/binance.ts`）、`packages/db`、加密工具、`apps/web`。
- **关键设计**：
  - 新增 tRPC procedure：`binance.bind`（绑定）、`binance.status`（查询绑定状态）、`binance.unbind`（解绑），均为 `protectedProcedure`。
  - `binance.bind` 流程：
    1. 接收 `apiKey` + `secretKey`（zod 校验非空）。
    2. 使用明文 Key/Secret 调用 Binance 账户信息接口（`GET /api/v3/account`，带 `timestamp` 与 HMAC SHA256 签名）做连通性校验。
    3. 校验权限：读取账户响应中的权限标志（如 `canTrade` / `canWithdraw`），若具备下单或提现权限则拒绝（最小只读原则）。
    4. 校验通过后，对 `apiKey`、`secretKey` 分别 AES-256-GCM 加密，存入 `binance_credential` 表（按 `userId` upsert）。
    5. 返回脱敏结果（成功标志 + Key 末四位 + 绑定时间），**不返回任何明文**。
  - 拉取账户基本信息的逻辑抽成可复用的 Binance 客户端（解密 → 签名请求），供后续 feature 复用（满足 AC-001-2）。

### 模块 C：加密存储与脱敏（F-001-3）

- **涉及层**：加密工具、`packages/db`、`packages/env`。
- **关键设计**：
  - 加解密工具导出 `encrypt(plaintext): { iv, authTag, ciphertext }` 与 `decrypt({ iv, authTag, ciphertext }): plaintext`，基于 Node `crypto` 的 `aes-256-gcm`。
  - 主密钥（32 字节）来自 `@coin-pilot/env` 校验后的 `ENCRYPTION_MASTER_KEY`，禁止散读 `process.env`。
  - 每次加密生成随机 `iv`，存储 `iv + authTag + ciphertext`；解密时校验 `authTag` 保证完整性。
  - 所有返回给前端的 procedure 只输出脱敏字段；日志中间件/错误处理确保不打印明文。

## 接口契约

> 全部为 `protectedProcedure`（无 session 抛 `TRPCError UNAUTHORIZED`），输入经 `zod` 校验。

- `binance.bind`
  - input: `z.object({ apiKey: z.string().min(1), secretKey: z.string().min(1) })`
  - output 概要：`{ bound: true, apiKeyLast4: string, boundAt: Date }`（绝不含明文）
  - 行为：连通性 + 只读权限校验 → 加密 upsert。

- `binance.status`
  - input: `z.object({})`（或无输入）
  - output 概要：`{ bound: boolean, apiKeyLast4?: string, boundAt?: Date }`

- `binance.unbind`
  - input: `z.object({})`
  - output 概要：`{ unbound: boolean }`

- （内部，非对外 procedure）`getBinanceAccountInfo(userId)`：解密凭据 → 调用 Binance 账户接口，返回账户基本信息，供 `bind` 校验及后续 feature 复用。

## 数据模型

`packages/db/src/schema/binance.ts`，从 `schema/index.ts` 重导出：

- 表 `binance_credential`
  - `id`：uuid 主键，默认随机。
  - `userId`：text/uuid，外键关联 Better-Auth 用户表（引用，不改 auth 表）；唯一约束（一个用户一条凭据）。
  - `apiKeyCipher`：text，AES-256-GCM 密文（apiKey）。
  - `apiKeyIv`：text，apiKey 的 iv。
  - `apiKeyAuthTag`：text，apiKey 的 authTag。
  - `secretKeyCipher`：text，密文（secretKey）。
  - `secretKeyIv`：text，secretKey 的 iv。
  - `secretKeyAuthTag`：text，secretKey 的 authTag。
  - `apiKeyLast4`：text，Key 末四位（脱敏展示用，可选）。
  - `createdAt` / `updatedAt`：timestamp，默认 now。

> 迁移由 `pnpm db:generate` 生成至 `packages/db/src/migrations`，再 `pnpm db:migrate` 应用；`DATABASE_URL` 从 `apps/server/.env` 读取。

## 安全考虑

- **加密**：AES-256-GCM，随机 iv，存储 `iv + authTag + ciphertext`；解密校验 authTag 防篡改。
- **密钥管理**：主密钥仅存环境变量，经 `@coin-pilot/env` 校验注入；不入库、不进日志、不返回前端。
- **鉴权**：绑定/查询/解绑全部 `protectedProcedure`，依赖 `ctx.session`，无 session 抛 `UNAUTHORIZED`；服务端按 `ctx.session.user.id` 限定只能操作本人凭据，防止越权。
- **最小权限**：绑定时校验 Binance Key 为只读，拒绝含下单/提现权限的 Key。
- **脱敏输出**：响应仅含 `bound`、`apiKeyLast4`、`boundAt`，明文 Key/Secret 仅在内存中短暂存在（加密前、签名时）。
- **日志**：禁止打印请求体中的 Key/Secret；错误信息对外友好、对内不含敏感数据。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 凭据加密算法 | AES-256-GCM（采用） vs AES-256-CBC vs 仅哈希 | GCM 提供认证加密（机密性 + 完整性 authTag）；哈希不可逆无法用于签名调用，CBC 无内建完整性校验。 |
| 密钥管理 | 环境变量主密钥（采用） vs KMS vs 明文存库 | 符合项目约定（`@coin-pilot/env` 注入），实现简单、密钥与数据分离；KMS 为后续可演进项，明文存库不可接受。 |
| Binance 请求签名 | HMAC SHA256（采用，Binance 强制） | Binance REST 签名接口要求 `timestamp` + HMAC SHA256(query, secret)；无其它选项。 |
| 鉴权方案 | Better-Auth session + `protectedProcedure`（采用） | 与项目既有架构一致，session 经 `createContext` 暴露为 `ctx.session`；避免重复造轮子。 |
| 用户表 | 复用 Better-Auth auth 表（采用） | 项目约定不手改 Better-Auth 表；`binance_credential` 通过 `userId` 引用关联。 |
| 绑定校验时机 | 绑定时一次性连通+权限校验（采用） | 满足 AC-001-2 即时反馈；周期性校验留待后续 feature。 |
