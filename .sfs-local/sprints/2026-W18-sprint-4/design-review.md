---
phase: design-review
status: completed
sprint_id: "2026-W18-sprint-4"
division: design
created_at: "2026-05-02T00:27:04+09:00"
verdict: partial
follow_up_status: implemented
---

# Design Review — Lecture Note Reader Responsive UX

## Scope

- Home dashboard, subject summary, week note, subject intake routes.
- iPad/tablet/mobile primary usage.
- Lecture-note reading flow, quick-note action usefulness, and local JSON intake discoverability.
- Source basis: `src/main.ts`, `src/styles.css`, sprint plan/implement/log evidence.

## Verdict

`partial`

The current prototype is directionally correct: subjects are separated, week notes exist, local JSON import is subject-scoped, quick-note actions were added, and CSS has real responsive breakpoints. But the design is still closer to a desktop docs reader than a tablet/mobile study tool. Before the next G4 product review, the main risk is not visual polish; it is action hierarchy and mobile navigation cost.

## What Works

- Subject and week separation now matches the user's mental model: home -> subject total summary -> week note.
- The source policy is visible and keeps raw professor PDFs out of the public reader.
- Keyword cards now have actions, so they are not only passive status cards.
- Missing keywords produce a fill-in template, which is the right direction for lecture-note completion.
- Responsive CSS exists for 1100px, 820px, and 520px, and key controls have 44px touch targets.

## Findings

### P1 — Home and side navigation over-prioritize intake over studying

Evidence:

- `src/main.ts:438-442` maps home sidebar subject links to subject intake pages.
- `src/main.ts:463-467` maps "All subjects" links to intake pages, not subject summaries.
- `src/main.ts:503-506` and `src/main.ts:509-514` show study status and subject cards, but the sidebar's subject affordance still means "자료 투입".

Why it matters:

Most users will open this on a tablet/mobile to read before an exam, not to author JSON. Primary navigation should answer "어느 과목 공부할까?" before "어느 과목 자료 넣을까?"

Recommendation:

- Make subject summary links the primary subject navigation.
- Move 자료 투입 into a secondary action per subject or a compact management section.
- On home, consider primary CTA: "최근 공부하던 과목" or "보강 필요한 주차 보기", with intake as secondary.

### P1 — Tablet/mobile navigation can bury the content

Evidence:

- `src/main.ts:453-467` renders current subject links, all week links, dashboard, guide, and every subject intake link inside the same sidebar.
- `src/styles.css:948-962` and `src/styles.css:981-996` convert the sidebar to a static top block on tablet/mobile.

Why it matters:

On iPad/mobile, a long top navigation block appears before the lecture content. As weeks increase, users may need to scroll past navigation every time before reading.

Recommendation:

- Replace mobile sidebar with a compact header: subject switcher + current page tabs.
- Collapse "All subjects" and intake links behind a details/menu control on <= 1100px.
- Keep week navigation horizontally scannable or section-local, not always above the whole page.

### P2 — Quick-note feedback appears too far from some triggers

Evidence:

- Subject hero action is at `src/main.ts:807-812`.
- Generated subject quick-note panel renders after the keyword section at `src/main.ts:839-847`.

Why it matters:

The action says "10분 정리노트 만들기", but the result appears below summary, weekly notes, and keyword cards. The scroll helper reduces this, but the information architecture still makes the generated note feel like a section result, not the primary outcome.

Recommendation:

- Render the subject-level quick note directly under the hero or in a fixed bottom-sheet style panel on mobile.
- Keep keyword-triggered notes close to the keyword section, but subject-triggered notes should appear near the subject action.

### P2 — Week cards remain mostly passive on the subject page

Evidence:

- `src/main.ts:984-991` renders a week card with only "주차 note 보기".
- The actual week quick-note action exists only after navigating into the week page.

Why it matters:

The user explicitly pushed against passive exposure. From the subject total summary, each week card should let a student either open the full week or immediately generate a compressed note.

Recommendation:

- Add "이번 주차 정리노트" as a secondary button inside each week card.
- Preserve "주차 note 보기" as the full detail path.

### P2 — Mixed Korean/English labels slow scanning

Evidence:

- `src/main.ts:420` footer is English.
- `src/main.ts:503-506`, `src/main.ts:510`, `src/main.ts:552-556`, `src/main.ts:816` use English labels such as Subjects, Weeks, Coverage, Enter subject, Fixture integrity, and keywords covered.
- `src/main.ts:1043` uses "Generated note · ready/needs-fill".

Why it matters:

The user and likely classmates are studying Korean lecture material. Mixed labels make the UI feel like an engineering prototype rather than a usable exam note.

Recommendation:

- Convert user-visible labels to Korean.
- Keep schema/dev terms only in the intake guide or code examples.

### P3 — Touch/focus states are incomplete

Evidence:

- Cards and actions have hover states, and touch targets have `min-height: 44px`.
- There is no explicit `:focus-visible` treatment in `src/styles.css`.

Why it matters:

Hover polish does not help touch users, and keyboard/focus feedback matters on iPad keyboard cases and accessibility.

Recommendation:

- Add `:focus-visible` rings for links/buttons/file labels.
- Add `:active` feedback for action buttons and cards that behave like links.

## Recommended Next Design Slice

1. Rework navigation around reading first:
   - home subject links -> subject summaries
   - intake -> secondary management action
2. Add mobile/tablet navigation compaction:
   - subject switcher
   - current subject tabs
   - collapsible all-subject/intake management
3. Reposition quick-note output:
   - subject note near subject hero
   - week note available from week cards
4. Run a Korean label pass over user-visible UI copy.
5. Add focus-visible and active interaction states.

## Verification Target After Rework

- `npm run build`
- viewport smoke at 390px, 768px, 1024px, and desktop width
- manual flow:
  - home -> 디지털공학개론 총정리
  - subject -> 10분 정리노트
  - subject -> week card quick note
  - subject -> 자료 투입
  - keyword missing -> 보강 템플릿

## Follow-up Implementation

Implemented on 2026-05-02T00:49:09+09:00.

- Reading-first navigation: subject links now open subject summaries; intake moved to collapsible `자료 관리`.
- Tablet/mobile compaction: sidebar becomes a sticky horizontal scroller under 1100px, with management links behind `<details>`.
- Quick-note placement: subject output renders under the hero, week output can be triggered from week cards, keyword output stays near keyword cards.
- Korean label pass: reviewed English prototype labels and raw user-visible statuses were converted.
- Interaction feedback: `:focus-visible` and `:active` rules added.

Verification:

- `npm run build` passed.
- Source/bundle smoke confirmed the design-review rework.
- English prototype-label smoke found no reviewed labels remaining.
- Responsive/focus smoke confirmed compact nav and touch/focus rules.
- Local dev server returned HTTP 200.
