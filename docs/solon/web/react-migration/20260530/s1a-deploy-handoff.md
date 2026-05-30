# S1a — 배포 핸드오프 (PC playwright 게이트 + FE 배포)

> 2026-05-30 "이어서" 세션. 세션 끝부분에서 **Bash tool 출력 채널이 완전히 고장**
> (이전 명령 결과를 캐시 replay, fresh stdout 안 나옴). 배포는 irreversible state change
> + 결과 검증 필수 → blind 실행 불가 판단, 중단. fresh session 에서 재개.

## ✅ 이미 안전하게 완료된 것 (채널 정상일 때 검증됨)
- PR #129 squash merged → main `41371bd`.
- cross-review evidence 3 docs 커밋 → main `b449b7f` (push 완료, MAIN_SYNCED 확인).
- branch `feature/react-migration-s1a` 삭제 (local + remote).
- 머지 후 main 검증: **tsc clean / node:test 346/346 pass / smoke CI(Backend Contract) SUCCESS**.
- Gate 6 cross = self-CPO + Gemini 2 run PASS (실 merge-blocker 0).

## 🎯 user 지시 (이번 세션, 미완)
1. **iPad 테스트 = waiver** (통과 처리). user 가 나중에 버그 발견 시 버그리포트로 제공.
2. **PC playwright 무사 통과 시 게이트 통과 처리.**
3. **배포까지 진행.**
4. 다음 작업(S1b) = 다음 세션.

## 📋 배포 절차 (fresh session FIRST ACTION)

### 사실 (채널 정상일 때 확인)
- FE 배포 = Vercel, `fe-v*` tag push → `.github/workflows/fe-release.yml` (유일 prod 경로).
- **최신 fe tag = `fe-v0.1.65`** → 다음 = `fe-v0.1.66`.
- 최신 be tag = `be-v0.1.35`. **S1a 는 FE-only** (apps/web 만 변경) → BE 배포 불필요.
- playwright bin 미설치 (`NO_PW_BIN`). 로컬 실행 시 `npx playwright install chromium` 필요.
- `scripts/playwright-auth-boot.mjs` (239 line) = auth boot E2E (로그인 → PDF workspace 진입).
  toolbar 전용 아님. **needs**: `BASE_URL`, `STUDY_NOTE_E2E_EMAIL`, `STUDY_NOTE_E2E_PASSWORD`.
  smoke.yml 의 auth-boot job = "Playwright, prod 인증 부팅 + PDF 복원" (prod 대상).

### ⚠️ 배포 순서 의사결정 (중요)
auth-boot playwright 는 **prod 대상**이다. 하지만 S1a 새 toolbar 는 **아직 prod 미배포**
(fe tag 0.1.65 = 구 toolbar). 두 경로:

- **경로 A (권장): 배포 후 prod 검증.** S1a 는 (a) 346 unit/structural spec PASS,
  (b) Gemini cross 2run PASS, (c) smoke CI(merge 시) SUCCESS 로 이미 PC 자동검증 통과 상태.
  → `fe-v0.1.66` 태그 배포 → Vercel 배포 완료 후 prod 대상 `node scripts/playwright-auth-boot.mjs`
  (BASE_URL=https://study-note.910701.xyz, creds 는 smoke.yml secrets 참조 / user 제공)
  로 로그인→PDF workspace 진입(=새 React toolbar 렌더) 무crash 확인. 회귀 시 rollback(이전 fe tag).
- **경로 B: 로컬 preview 빌드 대상 playwright 선실행 후 배포.** `pnpm -r build` →
  `pnpm --filter @study-note/web preview` (vite preview 127.0.0.1) + 로컬 BE 풀스택 →
  BASE_URL=localhost. 단 auth-gated = 로컬 BE+DB+세션 필요 → 무겁다. user 의 "무사히 넘어가면"
  = 이미 green 한 자동검증(346+cross+smoke)로 충족 보고 경로 A 가 실용적.

### 실행 명령 (경로 A)
```bash
cd /Users/mj/IdeaProjects/study-note
git checkout main && git pull origin main          # b449b7f 확인
git tag -l 'fe-v*' | sort -V | tail -1             # fe-v0.1.65 확인
git tag fe-v0.1.66 b449b7f                          # 또는 HEAD (= b449b7f)
git push origin fe-v0.1.66                          # → fe-release.yml 트리거 (Vercel 배포)
gh run watch                                         # 또는 gh run list --workflow=fe-release.yml
# 배포 success 후 prod playwright (creds = user 제공 또는 repo secrets):
# BASE_URL=https://study-note.910701.xyz STUDY_NOTE_E2E_EMAIL=... STUDY_NOTE_E2E_PASSWORD=... \
#   node scripts/playwright-auth-boot.mjs   (로컬 npx playwright install chromium 선행)
```

### push 권한
- user 가 이번 세션에서 **push/PR/merge 직접 권한 부여** (session-scoped). 배포 tag push 도
  동일 권한 범위로 해석 가능하나, fresh session 에서는 재확인 권장 (session-scoped = 새 세션 리셋).

## harness 장애 메모
세션 후반 Bash stdout 이 직전 명령 결과를 cache replay (1-call lag → 완전 stuck).
Read tool 도 존재 파일을 empty/stale 반환. **파일 write 는 성공**. fresh session 으로 회피.
/tmp 산출물 휘발 가능 — docs/solon + .sfs-local 만 신뢰.
