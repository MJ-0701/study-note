import type { PersonaTurnSource } from "../api/personaTurns";

// sprint-5 S4 — sources panel (D-S5-2 third trigger by user).
// 사용자 결정 (Q4 = B → A reversal): chunk 본문 inline 표시 제거. 학습 use-case 에서
// raw PDF chunk text 가 noise (sprint-4 retro 의 PDF page metadata 부재 + chunker 한글
// 가독성 문제 가 표면화). real Claude 응답 markdown 안에 이미 chunk 인용 verbatim 포함
// (sprint-4 ac13 evidence Q-A 패턴) — chunk 본문 inline 은 redundant.
//
// 카드 = ord + pdfBasename (filename only) + score 만. chunks endpoint 도 함께 제거됨.
// chunk 본문 표시 부활은 sprint-6 PDF page metadata + chunker 가독성 개선 후 재고.

export interface SourcesPanelProps {
  sources: PersonaTurnSource[];
}

function pdfBasename(p: string): string {
  if (!p) return "<unknown>";
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] ?? p;
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (sources.length === 0) {
    return (
      <section
        aria-label="sources panel — empty"
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px dashed #d1d5db",
          borderRadius: 8,
          background: "#f9fafb",
          color: "#6b7280",
          fontSize: 14
        }}
      >
        출처 chunk 0건 (isFallback path).
      </section>
    );
  }

  return (
    <section
      aria-label="sources panel"
      style={{
        marginTop: 16,
        padding: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#ffffff"
      }}
    >
      <header
        style={{
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid #f3f4f6"
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#374151" }}>
          출처 · {sources.length}건
        </h2>
      </header>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexWrap: "wrap",
          gap: 8
        }}
      >
        {sources.map((s) => (
          <li
            key={`${s.corpusId}::${s.ord}`}
            style={{
              padding: "8px 12px",
              border: "1px solid #f3f4f6",
              borderRadius: 6,
              background: "#fafafa",
              fontSize: 13,
              color: "#374151",
              display: "flex",
              alignItems: "baseline",
              gap: 8
            }}
          >
            <strong>chunk[{s.ord}]</strong>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              {pdfBasename(s.sourcePdfPath)} · score {s.score.toFixed(4)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
