import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";

// sprint-5 S4 — response panel. marked + DOMPurify 로 안전 렌더 (XSS 방지, plan K4).
// 사용자 D-S5-2 결정 (S3 review 발견): "응답 복사" 버튼 1개 (학습 도구 use-case).
//
// markdown "정상" 정의 (plan AC7): raw 마크 토큰 (`|`, `**`, ` ``` `, `###`, `-`) 이
// 시각적으로 변환됨 — table 행 분리 / heading 큰 글자 / 굵은 강조 / 코드 블록 monospace.

export interface ResponsePanelProps {
  /** PersonaTurnService 의 result.response (markdown 텍스트). */
  responseText: string;
}

export function ResponsePanel({ responseText }: ResponsePanelProps) {
  const html = useMemo(() => {
    // marked.parse 가 sync (gfm 옵션 default ON) 또는 async 모드 가능. sprint-5 는 sync.
    const raw = marked.parse(responseText, { gfm: true, breaks: false, async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [responseText]);

  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (copyState !== "copied") return;
    const t = setTimeout(() => setCopyState("idle"), 1500);
    return () => clearTimeout(t);
  }, [copyState]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(responseText);
      setCopyState("copied");
    } catch {
      // 권한 거부 또는 비-secure-context 에서 실패 가능 — silent (button 라벨 변화 0)
    }
  }

  return (
    <section
      aria-label="response panel"
      style={{
        marginTop: 24,
        padding: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#ffffff"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: "1px solid #f3f4f6"
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#374151" }}>
          디공이 응답
        </h2>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="응답 본문 클립보드 복사"
          style={{
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 500,
            color: copyState === "copied" ? "#065f46" : "#374151",
            background: copyState === "copied" ? "#d1fae5" : "#f3f4f6",
            border: "1px solid",
            borderColor: copyState === "copied" ? "#a7f3d0" : "#e5e7eb",
            borderRadius: 6,
            cursor: "pointer",
            transition: "background 0.15s ease"
          }}
        >
          {copyState === "copied" ? "복사됨 ✓" : "응답 복사"}
        </button>
      </header>

      {/* eslint-disable-next-line react/no-danger */}
      <article
        className="response-markdown"
        // markdown rendered via marked + DOMPurify sanitized — XSS 안전
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          color: "#1f2937",
          fontSize: 15,
          lineHeight: 1.7
        }}
      />
    </section>
  );
}
