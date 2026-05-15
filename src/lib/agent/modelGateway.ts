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

export interface FallbackGatewayOptions {
  continueOnError?: (error: unknown) => boolean;
}

export class FallbackAgentGateway implements AgentModelGateway {
  constructor(
    private readonly gateways: AgentModelGateway[],
    private readonly options: FallbackGatewayOptions = {},
  ) {}

  async complete(prompt: string, signal?: AbortSignal): Promise<string> {
    if (this.gateways.length === 0) {
      throw new Error("FallbackAgentGateway requires at least one gateway");
    }

    let lastError: Error | null = null;
    for (const gateway of this.gateways) {
      try {
        return await gateway.complete(prompt, signal);
      } catch (error: unknown) {
        const shouldContinue = this.options.continueOnError ? this.options.continueOnError(error) : true;
        if (!shouldContinue) {
          throw error instanceof Error ? error : new Error(String(error));
        }
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error("All gateways failed");
  }
}
