---
description: coin-pilot 的分支、commit 与 PR 规范
paths: ["**"]
---

# Git 工作流

## Commit

- 使用 **Conventional Commits**：`type(scope): summary`（历史记录如 `feat: init`）。
- 常用 type：`feat`、`fix`、`chore`、`refactor`、`docs`、`test`、`build`、`ci`。
- scope 可选但推荐 —— 用包/应用名：`feat(web): ...`、`fix(api): ...`、`chore(db): ...`。
- 标题用祈使句，≤ 约 72 字符；非简单改动在正文中说明「为什么」。

## 提交前钩子

- 已配置 **Husky**（`pnpm prepare` 安装钩子）。不要用 `--no-verify` 绕过。
- 钩子会运行 Biome/Ultracite 检查 —— 用 `pnpm fix` 修复问题，而非跳过。

## 分支

- 每个工作单元从默认分支切出：`feat/<简短描述>`、`fix/<简短描述>`、`chore/<简短描述>`。
- 功能开发不要直接提交到默认分支。

## Pull Request

- PR 保持聚焦、体量适中便于评审。
- 开 PR 前确保 `pnpm check` 与 `pnpm check-types` 通过。
- 绝不提交 `node_modules`、构建产物（`dist`、`.turbo`）、生成文件（`apps/web/src/routeTree.gen.ts`）或 `.env*`。
