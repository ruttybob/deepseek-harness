# Agent Note: A session opening can never latch `loading` or die on its baseline

Status: implemented

English | [中文](2026-09-08-session-open-never-latches-loading.zh.md)

## Problem

Opening a session while a turn streams carried the active Assistant attempt in the opening snapshot. One baseline chunk failing the lossless-JSON validation made `Session.installWindow`'s fold throw a plain `TypeError`, which escaped `Session.doOpen` (non-`RemoteFailure` errors rethrew) into `followCurrent`'s `void session.open()`. The result was an unhandled rejection with `openState` latched `'loading'` forever: the transcript showed "Loading history…" while the control plane stayed live, and neither reload nor waiting healed it. The same rethrow meant any non-`RemoteFailure` opening failure — including a transport opening that never settled, with no deadline to end it — was silently lost.

## Decision

`Session.open` never rejects and `openState` never latches `'loading'`. Three rules in `Session.doOpen` and `ClientAssistantStream.replace` own this:

- A baseline whose compact stream fails expansion degrades to the durable entries alone: the failure is logged, the live attempt stays adopted, and the live suffix plus the durable settlement still arrive through the normal fold. Only the reconstructed prefix is unrendered.
- The opening races a deadline (`SessionOptions.openTimeoutMs`, default 15 s — the connection generation-ready scale). A timed-out opening detaches and disposes the still-pending transport, logs, and lands `openState: 'error'` with a `gateway/internal` `openError`; the identity guard drops every late write of the zombie pass.
- Any remaining failure lands in the snapshot: Host-marked `RemoteFailure` values pass through verbatim, local faults are logged and marked as `gateway/internal` with their message and cause.

Every failure path settles the open promise, so the next `open()` call re-enters — recovery no longer requires discovering a failure that was previously unobservable. The `error` open state was already rendered by the chat view, so no consumer change was needed.

## Alternatives considered

**Auto-retry with capped backoff inside `doOpen`.** Recovery without user action, but it hides wedged hosts behind retry loops and stacks a second timing policy next to the transport's own carrier-reconnect ladder. Deferred as a follow-up; the re-entrant open keeps that door open.

**Fixing the producer so invalid chunks never exist.** The exact skew (wire decode nuance versus stale/fresh validator across a dev bundle swap) is still unpinned, and a validator can only reject, never repair. Even a proven producer fix would leave every other wedge path — the deadline-less hang predates the baseline defect — without a surface.

**Marking fold faults as `RemoteFailure` at the throw site** (expanding `expandAssistantStream` into a marked error type). Moves the marking burden to every producer and couples the LLM package to Gateway error vocabulary; the client owns its landing policy for faults it cannot classify.

## Consequences

Opening failures are user-visible through the existing error banner instead of a permanent spinner, and the regression suite pins the degraded baseline, the deadline, and the local-fault landing at the `Session` object seam. A slow carrier reconnect can still exceed the 15 s default and show a transient error state; re-opening (stage movement) clears it. The known adjacent defects — `failEventStream` rethrowing non-`RemoteFailure` mid-stream and `handleBlank` re-blanking — remain open follow-ups.
