import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  loadConversationHistory,
  getCurrentSession,
  addConversationTurn,
  buildMemoryContext,
  clearConversationHistory,
  getConversationStats,
  resetAutomaticLearningRunnerForTesting,
  setAutomaticLearningRunnerForTesting,
  shouldTriggerLearningCycle,
} from "../lib/conversationMemory";
import { getLearningStorage } from "../lib/learning/storage";

describe("Conversation Memory System", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    resetAutomaticLearningRunnerForTesting();
  });

  afterEach(() => {
    resetAutomaticLearningRunnerForTesting();
  });

  it("should start with empty conversation history", () => {
    const history = loadConversationHistory();
    expect(history).toEqual([]);
  });

  it("should create a new session for a child", () => {
    const session = getCurrentSession("Marie");
    expect(session.childName).toBe("Marie");
    expect(session.turns).toEqual([]);
    expect(session.startTime).toBeGreaterThan(0);
  });

  it("should add conversation turns", () => {
    addConversationTurn("Marie", "child", "Bonjour !");
    addConversationTurn("Marie", "companion", "Salut Marie ! Comment vas-tu ?");

    const session = getCurrentSession("Marie");
    expect(session.turns).toHaveLength(2);
    expect(session.turns[0].speaker).toBe("child");
    expect(session.turns[0].message).toBe("Bonjour !");
    expect(session.turns[1].speaker).toBe("companion");
  });

  it("should build memory context from conversation history", () => {
    addConversationTurn("Marie", "child", "J'aime les dinosaures");
    addConversationTurn("Marie", "companion", "C'est super ! Quel est ton dinosaure préféré ?");

    const context = buildMemoryContext("Marie");
    expect(context).toContain("Marie: J'aime les dinosaures");
    expect(context).toContain("Toi: C'est super !");
  });

  it("should return welcome message for first conversation", () => {
    const context = buildMemoryContext("Marie");
    expect(context).toContain("première conversation");
  });

  it("should limit turns in memory to MAX_TURNS_IN_MEMORY", () => {
    // Add 25 turns (more than the limit of 20)
    for (let i = 0; i < 25; i++) {
      addConversationTurn("Marie", i % 2 === 0 ? "child" : "companion", `Message ${i}`);
    }

    const session = getCurrentSession("Marie");
    expect(session.turns.length).toBeLessThanOrEqual(20);
  });

  it("should clear all conversation history", () => {
    addConversationTurn("Marie", "child", "Test message");
    clearConversationHistory();

    const history = loadConversationHistory();
    expect(history).toEqual([]);
  });

  it("should get conversation statistics", () => {
    addConversationTurn("Marie", "child", "Message 1");
    addConversationTurn("Marie", "companion", "Response 1");
    addConversationTurn("Marie", "child", "Message 2");

    const stats = getConversationStats("Marie");
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalTurns).toBe(3);
    expect(stats.lastConversationDate).toBeInstanceOf(Date);
  });

  it("should handle multiple children separately", () => {
    addConversationTurn("Marie", "child", "Message from Marie");
    addConversationTurn("Paul", "child", "Message from Paul");

    const marieSession = getCurrentSession("Marie");
    const paulSession = getCurrentSession("Paul");

    expect(marieSession.turns).toHaveLength(1);
    expect(paulSession.turns).toHaveLength(1);
    expect(marieSession.turns[0].message).toBe("Message from Marie");
    expect(paulSession.turns[0].message).toBe("Message from Paul");
  });



  it("should identify learning cycle trigger intervals", () => {
    expect(shouldTriggerLearningCycle(0, 50)).toBe(false);
    expect(shouldTriggerLearningCycle(49, 50)).toBe(false);
    expect(shouldTriggerLearningCycle(50, 50)).toBe(true);
    expect(shouldTriggerLearningCycle(100, 50)).toBe(true);
    expect(shouldTriggerLearningCycle(50, 0)).toBe(false);
  });

  it("should trigger automatic learning at configured turn intervals", async () => {
    const runner = vi.fn().mockResolvedValue(undefined);
    setAutomaticLearningRunnerForTesting(runner);
    await getLearningStorage("Marie").updateConfig({ triggerAfterTurns: 2, enabled: true });

    addConversationTurn("Marie", "child", "Message 1");
    addConversationTurn("Marie", "companion", "Message 2");

    await waitFor(() => expect(runner).toHaveBeenCalledWith("Marie"));
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("should continue same session if on same day", () => {
    const session1 = getCurrentSession("Marie");
    addConversationTurn("Marie", "child", "First message");

    const session2 = getCurrentSession("Marie");
    expect(session2.startTime).toBe(session1.startTime);
    expect(session2.turns).toHaveLength(1);
  });
});
