const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: "mean"; normalize: boolean }
) => Promise<{ data: Float32Array | number[] }>;

interface EmbeddingRequest {
  id: number;
  type: "embed";
  text: string;
}

interface EmbeddingResponse {
  id: number;
  type: "embedding";
  vector: number[] | null;
  error?: string;
}

const workerScope = self as unknown as {
  postMessage(message: EmbeddingResponse): void;
  addEventListener(type: "message", listener: (event: MessageEvent<EmbeddingRequest>) => void): void;
};

let embeddingPipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = import("@xenova/transformers")
      .then(async ({ pipeline, env }) => {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        return (await pipeline("feature-extraction", EMBEDDING_MODEL)) as FeatureExtractionPipeline;
      })
      .catch((error) => {
        embeddingPipelinePromise = null;
        throw error;
      });
  }
  return embeddingPipelinePromise;
}

async function generateWorkerEmbedding(text: string): Promise<number[] | null> {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  const embedding = Array.from(output.data);
  return embedding.length > 0 ? embedding : null;
}

workerScope.addEventListener("message", async (event) => {
  const request = event.data;
  if (!request || request.type !== "embed") return;

  try {
    const vector = await generateWorkerEmbedding(request.text);
    workerScope.postMessage({ id: request.id, type: "embedding", vector });
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      type: "embedding",
      vector: null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
