export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const MODELS = [
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct-v0.3:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "huggingfaceh4/zephyr-7b-beta:free",
];

export async function chatWithOpenRouter(messages: OpenRouterMessage[]) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key is missing (VITE_OPENROUTER_API_KEY)");
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      console.log(`[OpenRouter] Attempting with model: ${model}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://neurochatia.vercel.app",
          "X-Title": "NeuroChat",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (response.status === 429) {
        console.warn(`[OpenRouter] Rate limited (429) on ${model}, trying next...`);
        continue;
      }

      if (response.status === 404) {
        console.warn(`[OpenRouter] Model not found or no endpoints (404) for ${model}, trying next...`);
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`[OpenRouter] Error with ${model}: ${msg}`);
        continue;
      }

      const data = await response.json();
      if (!data.choices || data.choices.length === 0) {
        throw new Error("OpenRouter returned empty choices");
      }

      console.log(`[OpenRouter] Success with model: ${model}`);
      return data.choices[0].message.content;
    } catch (err) {
      console.error(`[OpenRouter] Exception with model ${model}:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("All OpenRouter models failed or were rate limited");
}