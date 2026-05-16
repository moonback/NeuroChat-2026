import { afterEach, describe, expect, it, vi } from "vitest";

class FakeEmbeddingWorker {
  static instances: FakeEmbeddingWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly messages: unknown[] = [];
  terminated = false;

  constructor(readonly url: URL, readonly options?: WorkerOptions) {
    FakeEmbeddingWorker.instances.push(this);
  }

  postMessage(message: { id: number; type: "embed"; text: string }) {
    this.messages.push(message);
    queueMicrotask(() => {
      this.onmessage?.({
        data: { id: message.id, type: "embedding", vector: [0.25, 0.5, 0.75] },
      } as MessageEvent);
    });
  }

  terminate() {
    this.terminated = true;
  }
}

describe("VectorStore embedding worker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    FakeEmbeddingWorker.instances = [];
  });

  it("generates embeddings through a module worker instead of importing Transformers on the main thread", async () => {
    vi.stubGlobal("Worker", FakeEmbeddingWorker);
    const { generateEmbedding } = await import("../lib/vectorStore");

    const embedding = await generateEmbedding("bonjour neurochat");

    expect(embedding).toEqual([0.25, 0.5, 0.75]);
    expect(FakeEmbeddingWorker.instances).toHaveLength(1);
    expect(FakeEmbeddingWorker.instances[0].url.pathname).toContain("embeddingWorker.ts");
    expect(FakeEmbeddingWorker.instances[0].options).toEqual({
      type: "module",
      name: "neurochat-embedding-worker",
    });
    expect(FakeEmbeddingWorker.instances[0].messages).toEqual([
      { id: 1, type: "embed", text: "bonjour neurochat" },
    ]);
  });

  it("returns null when workers are unavailable", async () => {
    vi.stubGlobal("Worker", undefined);
    const { generateEmbedding } = await import("../lib/vectorStore");

    await expect(generateEmbedding("fallback unavailable")).resolves.toBeNull();
  });
});
