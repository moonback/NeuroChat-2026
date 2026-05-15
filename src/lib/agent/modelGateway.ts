import { GoogleGenAI } from "@google/genai";
import { chatWithOpenRouter, type OpenRouterMessage } from "../OpenRouterService";
import type { AgentModelGateway, AgentStep } from "./types";

export interface OpenRouterGatewayOptions {
  modelSystemPrompt?: string;
  maxPromptChars?: number;
}

export class OpenRouterAgentGateway implements AgentModelGateway, NativeToolCallingGateway {
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

  async completeStepWithTools(prompt: string, tools: Array<{ name: string; description: string; parameters: object }>): Promise<AgentStep> {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API Key missing");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neurochatia.vercel.app",
        "X-Title": "NeuroChat",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        tools: tools.map((tool) => ({ type: "function", function: tool })),
        tool_choice: "auto",
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter tools call failed: ${response.status}`);
    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const call = message?.tool_calls?.[0];
    if (call?.function?.name) {
      return { thought: "Tool selected by provider", toolCall: { name: call.function.name, arguments: JSON.parse(call.function.arguments ?? "{}") } };
    }
    return { thought: "Final answer by provider", finalAnswer: message?.content ?? "" };
  }
}

export interface GeminiGatewayOptions {
  model?: string;
  systemInstruction?: string;
}

export class GeminiAgentGateway implements AgentModelGateway, NativeToolCallingGateway {
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

  async completeStepWithTools(prompt: string, tools: Array<{ name: string; description: string; parameters: object }>): Promise<AgentStep> {
    const resp = await this.ai.models.generateContent({
      model: this.model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: this.systemInstruction,
        temperature: 0.2,
        tools: [{ functionDeclarations: tools.map((tool) => ({ name: tool.name, description: tool.description, parameters: tool.parameters })) }],
      },
    });
    const call = resp.functionCalls?.[0];
    if (call?.name) {
      return { thought: "Tool selected by provider", toolCall: { name: call.name, arguments: (call.args as Record<string, unknown>) ?? {} } };
    }
    return { thought: "Final answer by provider", finalAnswer: resp.text ?? "" };
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
