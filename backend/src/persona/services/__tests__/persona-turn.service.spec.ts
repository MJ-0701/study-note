import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ClaudeCliProvider } from "../../providers/claude-cli.provider";
import { PersonaTurnService } from "../persona-turn.service";
import { PersonaService } from "../persona.service";
import type { RetrievalService, RetrievedChunk } from "../retrieval.service";

function makeRetrieval(chunks: RetrievedChunk[]): Pick<RetrievalService, "retrieveTopK"> {
  return {
    retrieveTopK: async () => chunks
  };
}

const FIXTURE_ENV_KEYS = [
  "STUDY_NOTE_LLM_FIXTURE",
  "STUDY_NOTE_LLM_REAL_OPT_IN"
] as const;

let savedEnv: Record<string, string | undefined> = {};
beforeEach(() => {
  savedEnv = {};
  for (const k of FIXTURE_ENV_KEYS) {
    savedEnv[k] = process.env[k];
  }
  process.env.STUDY_NOTE_LLM_FIXTURE = "1";
  delete process.env.STUDY_NOTE_LLM_REAL_OPT_IN;
});
afterEach(() => {
  for (const k of FIXTURE_ENV_KEYS) {
    if (savedEnv[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = savedEnv[k];
    }
  }
});

function buildService(chunks: RetrievedChunk[]): PersonaTurnService {
  const persona = new PersonaService();
  const retrieval = makeRetrieval(chunks) as RetrievalService;
  // fixture path doesn't reach spawn; if a code regression routes to real,
  // throwing immediately surfaces it without a real subprocess.
  const provider = new ClaudeCliProvider(() => {
    throw new Error("real spawn must not run when fixture branch is taken");
  });
  return new PersonaTurnService(persona, retrieval as RetrievalService, provider);
}

function buildServiceWithSpawnTracker(chunks: RetrievedChunk[]): {
  service: PersonaTurnService;
  spawnCalls: () => number;
} {
  const persona = new PersonaService();
  const retrieval = makeRetrieval(chunks) as RetrievalService;
  let calls = 0;
  const trackedSpawn = ((..._args: unknown[]) => {
    calls++;
    throw new Error("provider.generate (real spawn) must not be reached on this branch");
  }) as unknown as typeof import("node:child_process").spawn;
  const provider = new ClaudeCliProvider(trackedSpawn);
  const service = new PersonaTurnService(persona, retrieval as RetrievalService, provider);
  return { service, spawnCalls: () => calls };
}

describe("PersonaTurnService", () => {
  it("happy path — wraps provider FIXTURE response with persona invariant cues", async () => {
    const chunks: RetrievedChunk[] = [
      {
        ord: 0,
        corpusId: "cmovexample0001abcd",
        sourcePdfPath: "/tmp/de.pdf",
        text: "반가산기는 ...",
        score: 0.91
      },
      {
        ord: 1,
        corpusId: "cmovexample0002efgh",
        sourcePdfPath: "/tmp/de.pdf",
        text: "전가산기는 ...",
        score: 0.78
      }
    ];
    const svc = buildService(chunks);
    const result = await svc.execute({
      subject: "digital-engineering",
      queryText: "반가산기 설명해줘",
      k: 3
    });

    assert.equal(result.personaName, "디공이");
    assert.equal(result.subject, "digital-engineering");
    assert.equal(result.k, 3);
    assert.equal(result.retrievalCount, 2);
    assert.equal(result.sources.length, 2);
    assert.equal(result.isFallback, false);
    assert.equal(result.provider, "claude-cli-fixture");
    assert.equal(result.modelName, "claude-cli@stub-fixture");

    assert.match(result.response, /^\[디공이\]/, "response header must start with [디공이]");
    assert.match(result.response, /provider:/, "response must include provider banner");
    assert.match(result.response, /FIXTURE:/, "fixture raw text must survive wrapping");
    assert.match(result.response, /chunk\[0\]/, "wrapper must list chunk[0] source");
    assert.match(result.response, /chunk\[1\]/, "wrapper must list chunk[1] source");
    assert.match(
      result.response,
      /pdf=de\.pdf/,
      "wrapper must include the PDF basename for each source (ADR 0004 (b) 출처 명시)"
    );
    assert.match(result.response, /\?$/m, "wrapper must trail a follow-up question");
  });

  it("empty retrieval — graceful degrade with 출처: 없음 + ingest 안내", async () => {
    const svc = buildService([]);
    const result = await svc.execute({
      subject: "digital-engineering",
      queryText: "반가산기 설명해줘",
      k: 5
    });

    assert.equal(result.isFallback, true);
    assert.equal(result.retrievalCount, 0);
    assert.equal(result.sources.length, 0);
    assert.match(result.response, /^\[디공이\]/);
    assert.match(result.response, /출처: 없음/);
    assert.match(result.response, /npm run ingest:pdf/);
    assert.match(result.response, /FIXTURE:/);
  });

  it("unsupported subject — throws (sprint-3 scope guard)", async () => {
    const svc = buildService([]);
    await assert.rejects(
      () =>
        svc.execute({
          subject: "c-language",
          queryText: "포인터 설명해줘",
          k: 3
        }),
      /unsupported subject: c-language/
    );
  });

  it("empty retrieval in REAL mode — bypasses provider.generate (no spawn, no cloud send)", async () => {
    // Force real mode but expect the spawn tracker to record 0 calls because
    // PersonaTurnService must short-circuit empty retrieval into a deterministic
    // fixture refusal (ADR 0004 (b): 출처 없는 임의 teaching 금지).
    delete process.env.STUDY_NOTE_LLM_FIXTURE;
    process.env.STUDY_NOTE_LLM_REAL_OPT_IN = "1";

    const { service, spawnCalls } = buildServiceWithSpawnTracker([]);
    const result = await service.execute({
      subject: "digital-engineering",
      queryText: "반가산기 설명해줘",
      k: 5
    });

    assert.equal(spawnCalls(), 0, "spawn must not be called on empty-retrieval real mode");
    assert.equal(result.isFallback, true);
    assert.equal(result.provider, "claude-cli-fixture", "must report fixture-refusal provider, not claude-cli");
    assert.match(result.response, /출처: 없음/);
    assert.match(result.response, /npm run ingest:pdf/);
    assert.match(result.response, /FIXTURE:/);
  });
});
