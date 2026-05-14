export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chatWithOpenRouter(messages: OpenRouterMessage[]) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API Key is missing (VITE_OPENROUTER_API_KEY)");
  }

  // Use a free performant model as requested
  const model = "minimax/minimax-m2.5:free";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://neurochatai.vercel.app", // Optional, for OpenRouter rankings
      "X-Title": "NeuroChat", // Optional
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenRouter error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
