# Gates: plan review card — taller + Cmd/Ctrl+Enter approve

OWNS: packages/client/ui-user-questions/**, GATES.md

Scope: In the deepseek-harness checkout, raise the plan-review card height cap and add Cmd/Ctrl+Enter plan approval to PlanReviewPanel, with regression-safe tests and bilingual README updates, all certified by this ledger.

- [x] G1: PlanReviewPanel card height cap raised to min(72vh, 720px) and the old 520px cap is gone
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('packages/client/ui-user-questions/src/client/PlanReviewPanel.module.css','utf8');if(!s.includes('max-height: min(72vh, 720px)'))process.exit(1);if(s.includes('520px'))process.exit(2);console.log('HEIGHT_OK')"
  EXPECT: HEIGHT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=3f8357568ea020e8f7a8c4b2f2306879a797bcebd9b8358b1985505711e4ef8b; exit=0; EXPECT=matched; output-sha256=cc41aa82438aabff6357ea8ad0444e7830a2ce7deef6c1fbced6d152260e33b6; output-bytes=10; shell=/bin/sh; cwd=/Users/sergeykostrov/pets/harnesses-ai/ya-ow/deepseek-harness; path=f246e4caf507/32 entries

- [x] G2: ui-user-questions package tests pass, including the new keyboard-approval cases
  CHECK: pnpm exec vitest run packages/client/ui-user-questions && echo VITEST_OK
  EXPECT: VITEST_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=4cbb7bade85ca832bc229afcb022ae43ad2f9ed8355102c8f00a8fa00ffb0ad4; exit=0; EXPECT=matched; output-sha256=cd0188e204b8dab2e0725898db7c8c00c6f875468b70e4dd3bcb52553dac534d; output-bytes=1485; shell=/bin/sh; cwd=/Users/sergeykostrov/pets/harnesses-ai/ya-ow/deepseek-harness; path=f246e4caf507/32 entries

- [x] G3: Bilingual README pairing is consistent after the plan-review card update
  CHECK: pnpm run verify-translation-pairing packages/client/ui-user-questions/README.md && echo PAIRING_OK
  EXPECT: PAIRING_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=1be0e12e52da929d305d0ad662e455ed912b8695aaac3f22a1d5dc9f6c62748f; exit=0; EXPECT=matched; output-sha256=9452e0ef1b26de8f42309ca08fb90502f60c1918e54580ef740176209013aa92; output-bytes=202; shell=/bin/sh; cwd=/Users/sergeykostrov/pets/harnesses-ai/ya-ow/deepseek-harness; path=f246e4caf507/32 entries

- [x] G4: Repository typecheck passes with the client build included
  CHECK: pnpm run typecheck && echo TYPECHECK_OK
  EXPECT: TYPECHECK_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=2636a9ce239827a4b560b19b15f8b107d01bbe4fca0c85c3d6db943fe2aceaab; exit=0; EXPECT=matched; output-sha256=c6b75852258d68c4406d1e2d2bb339ba700945b0124305a1d907957377b76915; output-bytes=165140; shell=/bin/sh; cwd=/Users/sergeykostrov/pets/harnesses-ai/ya-ow/deepseek-harness; path=f246e4caf507/32 entries

- [x] G5: Repository lint passes
  CHECK: pnpm run lint && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=ac6cc761eeebee33912900e0eebfe459a099278b21fb21643f9b3faa2663562d; exit=0; EXPECT=matched; output-sha256=d68e2971e3da045d527722a550795730400143a65d27e0bcc6300f4690e73abd; output-bytes=165169; shell=/bin/sh; cwd=/Users/sergeykostrov/pets/harnesses-ai/ya-ow/deepseek-harness; path=f246e4caf507/32 entries

- [ ] G6: Cross-file duplication gate passes
  EVIDENCE: pending

ABANDON: G6 Pre-existing red: baseline probe (git stash of this change, then pnpm run duplication) exits 1 with the same 3 clones this change reports — ui-chat/markdown-labels.ts vs ui-tool/primitive-labels.ts, TrajectoryTable.tsx vs PlanReviewPanel.tsx (the markdownLabels useMemo block, unchanged content, its lines merely shifted 28→45 by this diff), and the PlanReviewPanel.tsx internal pair. The fix is a shared markdown-labels extraction spanning ui-chat/ui-tool/ui-trajectory/ui-user-questions, which is outside this ledger's OWNS. Handoff: extract the labels-builder into a shared client module, update all call sites, then re-run pnpm run duplication.
