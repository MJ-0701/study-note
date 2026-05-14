import { Injectable } from "@nestjs/common";

export interface PersonaArchetype {
  subject: string;
  name: string;
  tonePolicy: string;
}

/**
 * Sprint-3 D2 결정: 디지털공학개론 페르소나 1명. 4과목 페르소나 점진 도입
 * (ADR 0004 (f)) 의 첫 case. ADR 0004 follow-up — sprint-3 의 persona_name +
 * persona_tone_policy 와 동일 문자열 (R13 / AC10).
 */
export const PERSONA_DIGITAL_ENGINEERING: PersonaArchetype = {
  subject: "digital-engineering",
  name: "디공이",
  tonePolicy:
    "친근한 멘토 — 사용자가 모르는 가정, 먼저 쉬운 질문으로 수준 탐색 후 PDF 출처 명시하며 하나씩 짚어올림."
};

const SUPPORTED_PERSONAS: Record<string, PersonaArchetype> = {
  [PERSONA_DIGITAL_ENGINEERING.subject]: PERSONA_DIGITAL_ENGINEERING
};

@Injectable()
export class PersonaService {
  /**
   * Look up the persona archetype for a subject. Returns null when the
   * subject is outside sprint-3's persona scope (1 persona only). The
   * unsupported-subject guard belongs to PersonaTurnService.
   */
  archetypeFor(subject: string): PersonaArchetype | null {
    return SUPPORTED_PERSONAS[subject] ?? null;
  }

  /**
   * Compose the system prompt sent to the LLM provider. ADR 0004 (b) invariant:
   * provider-independent persona value. The body therefore enforces three
   * grep-able invariant cues — `출처`, `사용자 수준`, `시험 핵심` — that
   * also appear in the user-visible response by way of PersonaTurnService's
   * formatter (codex Gate 3 round 3 finding 2: invariant cue ownership =
   * wrapper formatter, not provider response body).
   */
  systemPromptFor(persona: PersonaArchetype): string {
    return [
      `당신은 ${persona.subject} 강의의 전용 AI 튜터 페르소나 "${persona.name}" 입니다.`,
      `톤 정책: ${persona.tonePolicy}`,
      "",
      "행동 invariant (ADR 0004 (b), provider-independent):",
      "1. 모든 답변은 retrieved PDF chunks 의 출처를 명시합니다. 출처 없는 임의 teaching 금지.",
      "2. 사용자 수준을 모를 때는 먼저 쉬운 질문 하나로 사용자 수준 을 탐색한 뒤 본격 설명합니다.",
      "3. 답변은 시험 핵심 우선순위로 (1)/(2)/... 번호 매겨 짚어줍니다.",
      "4. retrieval 결과가 비어 있으면 임의 teaching 거부 + 사용자에게 ingest 안내.",
      "",
      `사용자가 묻는 질문에 ${persona.name} 의 톤으로 답하세요.`
    ].join("\n");
  }
}
