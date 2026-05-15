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

  it("should start with empty conversation history", async () => {
    const history = await loadConversationHistory();
    expect(history).toEqual([]);
  });

  it("should create a new session for a child", async () => {
    const session = await getCurrentSession("Marie");
    expect(session.childName).toBe("Marie");
    expect(session.turns).toEqual([]);
    expect(session.startTime).toBeGreaterThan(0);
  });

  it("should add conversation turns", async () => {
    await addConversationTurn("Marie", "child", "Bonjour !");
    await addConversationTurn("Marie", "companion", "Salut Marie ! Comment vas-tu ?");

    const session = await getCurrentSession("Marie");
    expect(session.turns).toHaveLength(2);
    expect(session.turns[0].speaker).toBe("child");
    expect(session.turns[0].message).toBe("Bonjour !");
    expect(session.turns[1].speaker).toBe("companion");
  });

  it("should build memory context from conversation history", async () => {
    await addConversationTurn("Marie", "child", "J'aime les dinosaures");
    await addConversationTurn("Marie", "companion", "C'est super ! Quel est ton dinosaure préféré ?");

    const context = await buildMemoryContext("Marie");
    expect(context).toContain("Marie: J'aime les dinosaures");
    expect(context).toContain("Toi: C'est super !");
  });

  it("should return welcome message for first conversation", async () => {
    const context = await buildMemoryContext("Marie");
    expect(context).toContain("première conversation");
  });

  it("should limit turns in memory to MAX_TURNS_IN_MEMORY", async () => {
    // Add 25 turns (more than the limit of 20)
    for (let i = 0; i < 25; i++) {
      await addConversationTurn("Marie", i % 2 === 0 ? "child" : "companion", `Message ${i}`);
    }

    const session = await getCurrentSession("Marie");
    expect(session.turns.length).toBeLessThanOrEqual(20);
  });

  it("should clear all conversation history", async () => {
    await addConversationTurn("Marie", "child", "Test message");
    await clearConversationHistory();

    const history = await loadConversationHistory();
    expect(history).toEqual([]);
  });

  it("should get conversation statistics", async () => {
    await addConversationTurn("Marie", "child", "Message 1");
    await addConversationTurn("Marie", "companion", "Response 1");
    await addConversationTurn("Marie", "child", "Message 2");

    const stats = await getConversationStats("Marie");
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalTurns).toBe(3);
    expect(stats.lastConversationDate).toBeInstanceOf(Date);
  });

  it("should handle multiple children separately", async () => {
    await addConversationTurn("Marie", "child", "Message from Marie");
    await addConversationTurn("Paul", "child", "Message from Paul");

    const marieSession = await getCurrentSession("Marie");
    const paulSession = await getCurrentSession("Paul");

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

    await addConversationTurn("Marie", "child", "Message 1");
    addConversationTurn("Marie", "companion", "Message 2");

    await waitFor(() => expect(runner).toHaveBeenCalledWith("Marie"));
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("should continue same session if on same day", async () => {
    const session1 = await getCurrentSession("Marie");
    await addConversationTurn("Marie", "child", "First message");

    const session2 = await getCurrentSession("Marie");
    expect(session2.startTime).toBe(session1.startTime);
    expect(session2.turns).toHaveLength(1);
  });
});
