import { GoogleGenAI } from "@google/genai";
import { chatWithOpenRouter, type OpenRouterMessage } from "../OpenRouterService";
import type { AgentModelGateway, AgentStep } from "./types";

export interface OpenRouterGatewayOptions {
  modelSystemPrompt?: string;
  maxPromptChars?: number;
}

export class OpenRouterAgentGateway implements AgentModelGateway {
  private readonly systemPrompt: string;
  private readonly maxPromptChars: number;

  constructor(options: OpenRouterGatewayOptions = {}) {
    this.systemPrompt = options.modelSystemPrompt ?? "You are a strict JSON planner. Always output a JSON object only, without markdown.";
    this.maxPromptChars = Math.max(1000, options.maxPromptChars ?? 24000);
  }

  async complete(prompt: string, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw new Error("OpenRouter gateway aborted before completion");
    const trimmedPrompt = prompt.length > this.maxPromptChars ? prompt.slice(prompt.length - this.maxPromptChars) : prompt;
    const messages: OpenRouterMessage[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: trimmedPrompt },
    ];
    return chatWithOpenRouter(messages);
  }
}

export interface GeminiGatewayOptions {
  model?: string;
  systemInstruction?: string;
}

export class GeminiAgentGateway implements AgentModelGateway {
  private readonly ai: GoogleGenAI;
  private readonly model: string;
  private readonly systemInstruction: string;

  constructor(options: GeminiGatewayOptions = {}) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is required for GeminiAgentGateway");
    this.ai = new GoogleGenAI({ apiKey });
    this.model = options.model ?? "gemini-2.5-flash";
    this.systemInstruction = options.systemInstruction ?? "You are a strict JSON planner. Output only JSON.";
  }

  async complete(prompt: string): Promise<string> {
    const resp = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction: this.systemInstruction, temperature: 0.2 },
    });
    return resp.text ?? "";
  }
}

export interface NativeToolCallingGateway {
  completeStepWithTools(prompt: string, tools: Array<{ name: string; description: string; parameters: object }>, signal?: AbortSignal): Promise<AgentStep>;
}

export class FallbackAgentGateway implements AgentModelGateway {
  constructor(private readonly gateways: AgentModelGateway[]) {}

  async complete(prompt: string, signal?: AbortSignal): Promise<string> {
    if (this.gateways.length === 0) throw new Error("FallbackAgentGateway requires at least one gateway");
    let lastError: Error | null = null;
    for (const gateway of this.gateways) {
      try {
        return await gateway.complete(prompt, signal);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error("All gateways failed");
  }
}
