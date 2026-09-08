# Agent Note: 会话打开永远不会滞留在 `loading`，也不会死于其 baseline

Status: implemented

[English](2026-09-08-session-open-never-latches-loading.md) | 中文

## Problem

在一个 turn 仍在流式输出时打开会话，打开快照会携带活跃的 Assistant attempt。baseline 中只要有一个 chunk 未通过无损 JSON 校验，`Session.installWindow` 的折叠就会抛出普通 `TypeError`；该错误从 `Session.doOpen` 逃逸（非 `RemoteFailure` 错误被重新抛出），落入 `followCurrent` 的 `void session.open()`，成为未处理的 rejection，`openState` 永远滞留在 `'loading'`：transcript 一直显示"Loading history…"，而控制面仍然存活，刷新和等待都无法恢复。同样的重新抛出意味着任何非 `RemoteFailure` 的打开失败都会被静默丢弃——包括从未完成的 transport 打开，因为它没有任何 deadline 来终止。

## Decision

`Session.open` 从不 reject，`openState` 不会滞留在 `'loading'`。`Session.doOpen` 与 `ClientAssistantStream.replace` 中的三条规则共同保证这一点：

- 展开失败的 baseline 降级为仅持久条目：记录失败日志，活跃 attempt 保持采纳，后续 live suffix 与持久 settlement 仍经正常折叠到达。只有重建的前缀不渲染。
- 打开与一个 deadline 竞速（`SessionOptions.openTimeoutMs`，默认 15 秒，与 connection generation-ready 同一量级）。超时的打开会分离并销毁仍在 pending 的 transport，记录日志，并把 `openState` 落为 `'error'`，携带 `gateway/internal` 的 `openError`；身份守卫会丢弃僵尸 pass 的一切迟到写入。
- 其余失败全部落进快照：Host 标记的 `RemoteFailure` 原样通过；本地故障记录日志并标记为 `gateway/internal`，携带消息与原因。

每条失败路径都会 settle 打开 promise，因此下一次 `open()` 调用可以重新进入——恢复不再依赖发现一个过去不可观察的失败。chat view 早已渲染 `error` 打开状态，消费方无需改动。

## Alternatives considered

**在 `doOpen` 内做带封顶退避的自动重试。** 无需用户操作即可恢复，但它把故障的 Host 藏进重试循环，并在 transport 自身的 carrier 重连梯度旁边叠加第二套计时策略。已推迟为后续工作；可重新进入的 open 保留了这条路。

**修好生产方，让非法 chunk 根本不存在。** 具体偏斜（wire 解码细节，还是 dev bundle 切换导致的校验器新旧不一致）仍未定位，而校验器只能拒绝、无法修复。即使定位并修复了生产方，其他所有卡死路径——无 deadline 的挂起早在 baseline 缺陷之前就存在——依然没有呈现面。

**在抛出点把折叠故障标记为 `RemoteFailure`**（把 `expandAssistantStream` 改为抛带标记的错误类型）。这会把标记负担转嫁给每个生产方，并让 LLM 包耦合 Gateway 的错误词汇；客户端自己拥有对无法分类故障的落地策略。

## Consequences

打开失败通过既有错误横幅对用户可见，而不是一个永远的 spinner；回归测试在 `Session` 对象 seam 上钉住降级 baseline、deadline 与本地故障落地。缓慢的 carrier 重连仍可能超过 15 秒默认值并短暂显示 error 状态；重新打开（stage 移动）即可清除。已知的相邻缺陷——`failEventStream` 在流中途重新抛出非 `RemoteFailure`，以及 `handleBlank` 重新置 blank——仍是未完成的后续工作。
