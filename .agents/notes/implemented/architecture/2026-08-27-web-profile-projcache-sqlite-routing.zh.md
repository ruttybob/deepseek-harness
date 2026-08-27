# Agent Note: web profile 将 Projection cache 路由到逐记录 sqlite

Status: implemented

[English](2026-08-27-web-profile-projcache-sqlite-routing.md) | 中文

## Problem

dsh-yfd 热循环工单一起交付了两个事实。其一，web profile 把每个 Projection-cache 检查点持久化为一个整域 JSON 文件（`<storage root>/session_projcache.json`）：每次刷写都重写整个文件，写入成本随所有已存储会话的总量增长，而不是随正在检查点的那个会话增长，并且互不相关的会话共享同一个持久介质。其二，源码启动甚至无法为组合变更做演练：vendor 的 cordis 把 `FiberState` 声明为 `const enum`，而逐文件转译器（tsx）会擦除 const enum，导致 profile 启动在 ESM 链接阶段失败，`dsh --profile web --dump-config` 什么都打印不出来。

## Decision

web profile 的 `packages/bundle/web-app/cordis.patch.yml` 新增两行配置，除此之外不做任何改动：一行 `storage-sqlite` 在 `<storage root>/projcache.db` 注册 sqlite 后端；`storage-domain` 行在重述 `backend: json` 之外加上逐域路由 `routes: { session_projcache: sqlite }`。storage-domain 设施在打开时按路由解析每个域的介质，于是每个 Projection-cache 检查点都落成自己的持久记录（sqlite 介质中每会话一行），其余所有域继续使用 json 后端。没有改动任何消费方、域声明或后端代码：哪个域走哪种介质是部署配置，而 sqlite 后端本来就是已交付的存储包。

演练阻塞点则是一处 vendor 分叉，已作为 vendor/README.md 的本地修改 19 记录：`cordis/src/fiber.ts` 把 `FiberState` 声明为普通运行时枚举。vendor 源码按源码启动约定经 tsx 启动，逐文件转译会擦除 `const enum` 对象，任何对 `FiberState` 的跨模块值导入（profile 启动路径）都会 ESM 链接失败。普通枚举保住了运行时对象；内联常量的消费方毫无损失。

## Alternatives considered

- **把默认介质切换为 sqlite**（把 sqlite 变成 storage-domain 的默认值，或修改域声明）：会把所有部署的持久布局一起挪动——而不只是热循环——并悄悄迁移其他域的数据。路由把变更限定在需要它的组合上；json 默认值对冷且小的域仍是正确介质。
- **给 session-projection-cache 自己的介质 Config 字段**：把介质决策复制了一份，而这件事 storage-domain 设施已经持有，造成同一事实的两个真源（路由与消费方配置）可能互相矛盾。域的介质由 storage-domain 负责路由。
- **转而构建 vendor 源码而非修枚举**（源码启动前先编译 cordis）：真实的构建步骤会给每次源码启动重新加上编译关卡，与「逐文件转译是受支持路径」的源码启动决策相悖。运行时枚举只有一行 vendor 差异，且对消费方没有可见损失。

## Consequences

- web profile 的检查点成为逐记录的持久写入：刷写一个会话不再重写其他所有会话的存储状态，检查点写入保持 O(会话) 而不是 O(域)。
- 回滚是纯配置：删掉 `routes` 行后，`storage-sqlite` 行仍注册但不再被路由，json 再次像 base 组合那样服务所有域。
- 各部署的介质出现分叉：web profile 的 Projection cache 位于 `projcache.db`，其他部署仍保留 `session_projcache.json`。文档写明介质由路由决定；读取介质的工具必须跟随 storage-domain 的路由，而不是假设某个文件名。
- 一个 vendor 文件与上游分叉（本地修改 19），vendor 同步后必须重新套用；按 vendoring 约定该分叉已记录在 `vendor/README.md`。
