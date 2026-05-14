export interface ClassScheduleEntry {
  id: string;
  label: string;
  kind: "class" | "final";
  note: string;
}

export const classSchedule: ClassScheduleEntry[] = [
  {
    id: "2026-04-30",
    label: "4월 30일(목)",
    kind: "class",
    note: "중간 이후 첫 수업"
  },
  {
    id: "2026-05-02",
    label: "5월 2일(토)",
    kind: "class",
    note: "중간 이후 두 번째 수업"
  },
  { id: "2026-05-07", label: "5월 7일(목)", kind: "class", note: "목요일 수업" },
  { id: "2026-05-09", label: "5월 9일(토)", kind: "class", note: "토요일 수업" },
  { id: "2026-05-14", label: "5월 14일(목)", kind: "class", note: "목요일 수업" },
  { id: "2026-05-16", label: "5월 16일(토)", kind: "class", note: "토요일 수업" },
  { id: "2026-05-21", label: "5월 21일(목)", kind: "class", note: "목요일 수업" },
  { id: "2026-05-23", label: "5월 23일(토)", kind: "class", note: "토요일 수업" },
  { id: "2026-05-28", label: "5월 28일(목)", kind: "class", note: "목요일 수업" },
  { id: "2026-05-30", label: "5월 30일(토)", kind: "class", note: "토요일 수업" },
  { id: "2026-06-04", label: "6월 4일(목)", kind: "class", note: "목요일 수업" },
  { id: "2026-06-06", label: "6월 6일(토)", kind: "class", note: "토요일 수업" },
  { id: "2026-06-11", label: "6월 11일(목)", kind: "class", note: "기말 직전 수업" },
  {
    id: "2026-06-13",
    label: "6월 13일(토)",
    kind: "final",
    note: "기말고사 + 종강 예정"
  }
];

export const scheduleRangeLabel = "4월 30일(목) - 6월 13일(토)";
