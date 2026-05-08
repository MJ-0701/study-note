import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  PERSONA_DIGITAL_ENGINEERING,
  PersonaService
} from "../persona.service";

describe("PersonaService", () => {
  it("returns the 디공이 archetype for digital-engineering", () => {
    const svc = new PersonaService();
    const archetype = svc.archetypeFor("digital-engineering");
    assert.ok(archetype, "expected archetype for digital-engineering");
    assert.equal(archetype.name, "디공이");
    assert.equal(archetype.subject, "digital-engineering");
    assert.match(archetype.tonePolicy, /친근한 멘토/);
  });

  it("returns null for unsupported subjects (sprint-3 scope guard)", () => {
    const svc = new PersonaService();
    assert.equal(svc.archetypeFor("c-language"), null);
    assert.equal(svc.archetypeFor("information-communication"), null);
    assert.equal(svc.archetypeFor("computer-introduction"), null);
  });

  it("system prompt includes invariant cues 출처/사용자 수준/시험 핵심", () => {
    const svc = new PersonaService();
    const prompt = svc.systemPromptFor(PERSONA_DIGITAL_ENGINEERING);
    assert.match(prompt, /출처/, "prompt must mention 출처 invariant");
    assert.match(prompt, /사용자 수준/, "prompt must mention 사용자 수준 invariant");
    assert.match(prompt, /시험 핵심/, "prompt must mention 시험 핵심 invariant");
    assert.match(prompt, /디공이/, "prompt must mention persona name 디공이");
    assert.match(prompt, /친근한 멘토/, "prompt must mention 친근한 멘토 tone");
  });
});
