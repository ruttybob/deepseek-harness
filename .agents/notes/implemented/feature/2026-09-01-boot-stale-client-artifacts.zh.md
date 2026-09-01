# Agent Note: 构建期客户端产物的启动时过期检测

Status: implemented

[English](2026-09-01-boot-stale-client-artifacts.md) | 中文

## Problem

Web 表面读取的是构建产物——每个插件包的 `lib/client.js` 与 `apps/web` 的 dist——而三段构建（tsc、tsdown、vite）在某一环被跳过时都不会报错，于是源码被推进后的检出（pull、切分支、单包重建）会带着一套互相不一致的产物启动。症状完全指不出可操作的动作：shell 里打进去的平台模块与刚被服务的插件 bundle 互相矛盾，开发者看到的是 export 形状的 loader 错误（`does not provide an export named 'CallId'`）、`require(...) missed the module table` 诊断或插件加载失败，没有任何提示说明 `pnpm run build` 才是解法。

## Decision

一个共享原语，两处启动时比较。`@deepseek-ai/dsh-client-modules` 导出 `newestSourceUnder`（一组根目录下最新的文件，递归，缺失的根不参与）与 `artifactPredates`（产物恰好在其比该最新文件更旧时算过期；相等即新鲜，因此粗糙的 mtime 分辨率绝不会要求一次多余重建）。

**客户端 bundle**（`packages/client/modules`）：激活 flush 之后，把每份已组合的 `lib/client.js` 与所在包自己的 `src` 树比较。过期 bundle 走既有 `ClientPackageCompositionError` 分组，作为第二个桶出现，携带与缺失 bundle 相同的构建指引，并按包列出最新源文件路径与时间。

**前端 dist**（`packages/bundle/web-app`）：激活时把 `dist` 中最新的文件与前端包自己的 `src` 加上其直接 workspace 依赖的构建产物 `lib` 比较——依赖经前端自身的链接解析、并按 workspace 包树过滤，这正是 Vite 构建链接的集合。报告列出 dist 文件与最新输入。

两处比较只在激活时运行。稳态 reconcile 不参与：开发 watch 进程总处在「源码已写、bundle 未出」的窗口里，活跃会话必须继续使用上一份可用图。不带源码树的包永不过期，这条规则因此在 registry 安装下天然失活；dist 缺失仍是请求期问题，页面到不了静态 fallback 席位的组合本就无需 dist 启动。

## Alternatives considered

**构建戳**（每次构建写入指纹清单，启动时比对）：拒绝——每个包的构建配置都得携带戳，戳自身也会过期，而本方案针对的失败恰是 mtime 现象：检出把源码推向未来。

**全仓最新源码规则**（任一源码比任一产物新即过期）：拒绝——任何 host 侧改动都会要求全量重建，而一个狼来了的检查很快没人再读。

**用 dist sourcemap 的 `sources` 作精确链接集**：拒绝——为避免一处有文档说明的近似而在每次启动解析数 MB 的 map，不划算。

**对 dist 做传递 workspace 依赖闭包**：暂拒——仅被传递链路到达、又没有客户端 bundle 的 workspace 包仍检测不到；有客户端 bundle 的包已被按包比较覆盖。

## Consequences

两种令人困惑的失败模式现在都在进程还握着用户注意力的时刻给出了修法，单包重建也无法再送出一个与所服务 bundle 互相矛盾的 shell。已知缺口是刻意的：上述传递闭包缺口，以及 mtime 语义——时钟偏移或异构文件系统可能要求一次多余重建，代价是重跑一次构建，绝不会产生错误结果。覆盖：`artifact-freshness` 单测、node-half 激活规格中的过期桶，以及 web-app 的 `fresh-dist` 规格——含树外依赖、不可解析依赖与缺失 dist。
