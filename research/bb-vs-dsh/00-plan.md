# Research Plan: bb vs deepseek-harness (dsh)

## Mode

`quick` — research brief (500–1,500 words), direct-output: no intermediate user confirmation required.

## Request (raw)

Сравнить bb и deepseek-harness (dsh) в зоне их пересечения и решить, на каком инструменте остановиться. Заявленный критерий пользователя: веб dsh хорошо организован, но всё интегрировано в единое окно чата; не хватает функций bb типа отдельных от чата страниц (дашбордов).

## Decision criteria (user-stated)

1. Web/UI organization quality — dsh favored.
2. Standalone pages outside the chat (dashboards, project/thread overviews) — bb favored, dsh chat-window-centric (to be verified).
3. Overall capability overlap → which gaps are decisive.

## Roster (quick mode)

`research_question` → `bibliography` → `source_verification` → `report_compiler`

## Phases

1. Scoping — research_question refines the request into comparison axes + explicit decision criteria → `01-research-question.md`
2. Evidence — bibliography gathers primary sources: bb CLI (`bb guide`, `bb --help`, plugin/skill listings) and dsh repo (docs/architecture.md, apps/web, packages/web, client-web shell) → `02-bibliography.md`
3. Verification — source_verification checks every load-bearing claim against its cited source, graded verdicts → `03-source-verification.md`
4. Composition — report_compiler writes the brief in Russian, verdict first, claims sourced → `04-brief.md`

## Deliverables

- `research/bb-vs-dsh/00-plan.md` (this file)
- `research/bb-vs-dsh/01-research-question.md`
- `research/bb-vs-dsh/02-bibliography.md`
- `research/bb-vs-dsh/03-source-verification.md`
- `research/bb-vs-dsh/04-brief.md`

## Evidence rules

- Primary evidence: local — bb CLI output (record command + excerpt) and dsh repository docs/code (file paths, line references). These outrank web sources.
- Web sources (via mcp__web-search-prime / mcp__web-reader) only as secondary corroboration; dsh is a local/private repo, bb is the local product — public docs may be thin.
- Every claim in the brief carries a source reference and an evidence grade from `references/source_quality_hierarchy.md`.
- Final brief language: Russian; technical terms stay in original form.
