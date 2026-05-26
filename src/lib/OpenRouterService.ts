export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenRouterToolDeclaration {
  name: string;
  description: string;
  parameters: object;
}

export interface OpenRouterToolStepResult {
  name?: string;
  arguments?: string;
  finalAnswer?: string;
}

const MODELS = [
  "deepseek/deepseek-v4-flash:free"
];

function getRendererOpenRouterApiKey(): string {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key is missing (VITE_OPENROUTER_API_KEY)");
  }
  return apiKey;
}

async function callOpenRouterFromRenderer(payload: object) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getRendererOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://neurochatia.vercel.app",
      "X-Title": "NeuroChat",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`OpenRouter call failed: ${msg}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error("OpenRouter returned empty choices");
  }
  return data;
}

export async function chatWithOpenRouter(messages: OpenRouterMessage[]) {
  if (window.neurochatElectron?.ai?.chatWithOpenRouter) {
    return window.neurochatElectron.ai.chatWithOpenRouter(messages);
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      console.log(`[OpenRouter] Attempting with model: ${model}`);
      const data = await callOpenRouterFromRenderer({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      console.log(`[OpenRouter] Success with model: ${model}`);
      return data.choices[0].message.content;
    } catch (err) {
      console.error(`[OpenRouter] Exception with model ${model}:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("All OpenRouter models failed or were rate limited");
}

export async function completeOpenRouterStepWithTools(
  prompt: string,
  tools: OpenRouterToolDeclaration[],
): Promise<OpenRouterToolStepResult> {
  if (window.neurochatElectron?.ai?.completeOpenRouterStepWithTools) {
    return window.neurochatElectron.ai.completeOpenRouterStepWithTools(prompt, tools);
  }

  const data = await callOpenRouterFromRenderer({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    tools: tools.map((tool) => ({ type: "function", function: tool })),
    tool_choice: "auto",
  });
  const message = data.choices?.[0]?.message;
  const call = message?.tool_calls?.[0];
  if (call?.function?.name) {
    return { name: call.function.name, arguments: call.function.arguments ?? "{}" };
  }
  return { finalAnswer: message?.content ?? "" };
}
