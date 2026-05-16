/**
 * Typed Event Bus for NeuroChat Runtime
 * Decouples core logic from React UI and allows observability.
 */

type RuntimeEvents = {
  'session:start': { provider: string; userName: string };
  'session:stop': { reason?: string };
  'session:status': { status: string };
  'media:mic:active': { active: boolean };
  'media:camera:active': { active: boolean };
  'media:screen:active': { active: boolean };
  'media:audio:level': { level: number };
  'ai:request': { type: 'text' | 'audio' | 'video'; provider: string };
  'ai:response': { type: 'text' | 'audio'; length: number };
  'agent:task:start': { taskId: string; goal: string };
  'agent:task:end': { taskId: string; success: boolean };
  'agent:tool:call': { tool: string; args: any };
  'memory:write': { type: 'episodic' | 'semantic' | 'learning'; size: number };
  'error': { message: string; code?: string; fatal: boolean };
};

type Handler<T> = (data: T) => void;

class EventBus {
  private handlers: { [K in keyof RuntimeEvents]?: Handler<RuntimeEvents[K]>[] } = {};

  on<K extends keyof RuntimeEvents>(event: K, handler: Handler<RuntimeEvents[K]>): () => void {
    if (!this.handlers[event]) {
      (this.handlers as any)[event] = [];
    }
    this.handlers[event]!.push(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof RuntimeEvents>(event: K, handler: Handler<RuntimeEvents[K]>): void {
    if (!this.handlers[event]) return;
    (this.handlers as any)[event] = this.handlers[event]!.filter(h => h !== handler);
  }

  emit<K extends keyof RuntimeEvents>(event: K, data: RuntimeEvents[K]): void {
    if (!this.handlers[event]) return;
    this.handlers[event]!.forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for ${event}:`, err);
      }
    });
  }
}

export const runtimeEvents = new EventBus();
