---
description: coin-pilot TypeScript monorepo 的命名、格式、import 与注释规范
paths: ["**"]
---

# 编码风格

格式化与 lint 由 **Biome（通过 Ultracite）** 强制执行（`biome.json` 继承 `ultracite/biome/core` + `ultracite/biome/react`）。提交前运行 `pnpm check` 检查、`pnpm fix` 自动修复。完整的代码质量规则见 `.claude/CLAUDE.md` / 根目录 `AGENTS.md`，本文件只补充项目特有约定。

## 格式（不要与格式化工具对抗）

- **缩进**：制表符 Tab（`formatter.indentStyle: "tab"`）。
- **引号**：JS/TS 使用双引号（`javascript.formatter.quoteStyle: "double"`）。
- **import**：自动整理（`assist.source.organizeImports: on`），不要手动排序。
- **Tailwind 类名**：`clsx`、`cva`、`cn` 调用中的类名会自动排序，交给 Biome 修复。

## 语言约定

- 全部使用 TypeScript，仅 ESM（`"type": "module"`）。用 `import`/`export`，不要用 `require`。
- 默认 `const`，仅在需要重新赋值时用 `let`，永远不用 `var`。
- 优先 `unknown` 而非 `any`；不可变/字面量值用 `as const`。
- 用 `for...of` 替代 `.forEach()`；用可选链（`?.`）与空值合并（`??`）。
- 提交代码中不保留 `console.log` / `debugger`。
- 抛出 `Error` 对象（或如 `TRPCError` 的类型化错误），不要抛字符串。

## 命名

- 文件：kebab-case（`sign-in-form.tsx`、`mode-toggle.tsx`、`auth-client.ts`）。
- React 组件：PascalCase 导出；hook 使用 `useXxx`。
- Drizzle 表 / tRPC 路由：camelCase（`todoRouter`、`todo`）。
- 工作区包统一作用域为 `@coin-pilot/*`，跨包始终按包名引入，绝不用相对路径跨包引用。

## 注释

- 优先写自解释的代码；注释解释「为什么」，而非「做了什么」。
- 仅对不直观的业务逻辑或临时绕过方案添加注释。
