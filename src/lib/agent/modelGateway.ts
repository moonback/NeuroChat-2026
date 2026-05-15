import { chatWithOpenRouter, type OpenRouterMessage } from "../OpenRouterService";
import type { AgentModelGateway } from "./types";

export interface OpenRouterGatewayOptions {
  modelSystemPrompt?: string;
  maxPromptChars?: number;
}

export class OpenRouterAgentGateway implements AgentModelGateway {
  private readonly systemPrompt: string;
  private readonly maxPromptChars: number;

  constructor(options: OpenRouterGatewayOptions = {}) {
    this.systemPrompt =
      options.modelSystemPrompt ??
      "You are a strict JSON planner. Always output a JSON object only, without markdown.";
    this.maxPromptChars = Math.max(1000, options.maxPromptChars ?? 24000);
  }

  async complete(prompt: string, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) {
      throw new Error("OpenRouter gateway aborted before completion");
    }

    const trimmedPrompt = prompt.length > this.maxPromptChars
      ? prompt.slice(prompt.length - this.maxPromptChars)
      : prompt;

    const messages: OpenRouterMessage[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: trimmedPrompt },
    ];

    if (signal) {
      const response = await Promise.race([
        chatWithOpenRouter(messages),
        new Promise<string>((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("OpenRouter gateway aborted")), { once: true });
        }),
      ]);
      return response;
    }

    return chatWithOpenRouter(messages);
  }
}
