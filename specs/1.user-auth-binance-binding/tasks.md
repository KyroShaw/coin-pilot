# F-001 用户账号与 Binance API 绑定 — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始任务 |

## 项目信息

- 项目名（PROJECT_NAME）：`coin-pilot`
- 架构类型（ARCH_TYPE）：pnpm + Turborepo TypeScript monorepo
- specs 路径：`specs/1.user-auth-binance-binding/`

## 任务列表

### 分组一：账号体系（F-001-1）

- [ ] **T-001**：在 `packages/auth` 配置/确认 Better-Auth 邮箱密码 provider（注册、登录、登出、session）。~1h
- [ ] **T-002**：在 `apps/web/src/routes/` 新增 `login`、`register` 路由页面，使用 `@coin-pilot/ui` 表单组件接入 Better-Auth 客户端。~1h
- [ ] **T-003**：为受保护页面添加前端路由守卫（无 session 重定向到 `login`），确认 `createContext` 暴露 `ctx.session`。~30min

### 分组二：加密与数据模型（F-001-3）

- [ ] **T-004**：在 `@coin-pilot/env` 增加并校验 `ENCRYPTION_MASTER_KEY`（32 字节）环境变量。~15min
- [ ] **T-005**：实现 AES-256-GCM 加解密工具 `encrypt`/`decrypt`（返回/接收 `iv + authTag + ciphertext`），含单测。~1h
- [ ] **T-006**：在 `packages/db/src/schema/binance.ts` 定义 `binance_credential` 表并从 `schema/index.ts` 重导出。~30min
- [ ] **T-007**：执行 `pnpm db:generate` 生成迁移并 `pnpm db:migrate` 应用。~15min

### 分组三：Binance 绑定与拉取（F-001-2）

- [ ] **T-008**：实现 Binance 客户端工具：HMAC SHA256 签名 + 拉取账户信息（`getBinanceAccountInfo`），含超时与友好错误。~1h
- [ ] **T-009**：实现 `binance.bind` procedure（zod 校验 → 连通性 + 只读权限校验 → 加密 upsert → 返回脱敏结果）。~1h
- [ ] **T-010**：实现 `binance.status` 与 `binance.unbind` procedure（均 `protectedProcedure`，仅脱敏输出），并在 `routers/index.ts` 合并 `binance` 路由。~30min
- [ ] **T-011**：在 `apps/web/src/routes/` 新增绑定页：API Key/Secret 表单、绑定状态展示、解绑，调用上述 procedure。~1h

### 分组四：集成与测试

- [ ] **T-012**：联调全链路（注册→登录→绑定→拉取账户信息→解绑），打通前后端。~30min
- [ ] **T-013**：核验 AC-001-1 / AC-001-2 / AC-001-3，重点检查响应体与日志中无明文 Key/Secret。~30min
- [ ] **T-014**：运行 `pnpm dlx ultracite fix` 与类型检查，修复 lint/格式/类型问题。~15min

## 依赖关系

- T-002、T-003 依赖 T-001。
- T-005 依赖 T-004。
- T-007 依赖 T-006。
- T-008 依赖 T-005（解密凭据用于签名）。
- T-009 依赖 T-005、T-006、T-007、T-008。
- T-010 依赖 T-009。
- T-011 依赖 T-002、T-009、T-010。
- T-012 依赖 T-001~T-011 全部完成。
- T-013 依赖 T-012。
- T-014 可在编码完成后随时执行，建议作为最后一步。

## 风险点

- **Binance API 限制**：测试需有效只读 Key；连通性/权限校验受外部 API 速率限制与网络影响，需设超时与降级提示。
- **只读权限识别**：依赖 Binance 账户响应的权限标志（`canTrade`/`canWithdraw`）；若字段语义变化需调整校验逻辑。
- **明文泄露**：日志、错误堆栈、tRPC 响应是潜在泄露点，T-013 需逐一核验。
- **主密钥管理**：`ENCRYPTION_MASTER_KEY` 缺失/变更会导致已存凭据无法解密，需在环境校验中强制存在并妥善保管。
- **Better-Auth 表约束**：不得手改 auth 表，`binance_credential` 仅通过 `userId` 引用关联。
