import { generateEmbedding, cosineSimilarity } from "../vectorStore";
import type { SkillDefinition } from "./types";

export interface IndexedSkill {
  skill: SkillDefinition;
  vector: number[];
}

/**
 * SkillRetriever manages a semantic index of available skills
 * to provide only the most relevant tools for a given query.
 */
export class SkillRetriever {
  private indexedSkills: IndexedSkill[] = [];
  private isIndexing = false;

  /**
   * Indexes a list of skills. This should be called when skills are registered or updated.
   */
  async index(skills: SkillDefinition[]): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;
    
    console.log(`[SkillRetriever] Indexing ${skills.length} skills...`);
    const newIndexed: IndexedSkill[] = [];
    
    // We process skills sequentially to avoid rate limits on the embedding API
    for (const skill of skills) {
      const text = `
        Skill: ${skill.name}
        Description: ${skill.description}
        Category: ${skill.category}
        Examples: ${skill.examples?.map(e => e.explanation).join(". ") || ""}
      `.trim();
      
      try {
        const vector = await generateEmbedding(text);
        if (vector) {
          newIndexed.push({ skill, vector });
        }
      } catch (err) {
        console.error(`[SkillRetriever] Failed to index skill ${skill.name}:`, err);
      }
    }
    
    this.indexedSkills = newIndexed;
    this.isIndexing = false;
    console.log(`[SkillRetriever] Successfully indexed ${this.indexedSkills.length} skills.`);
  }

  /**
   * Retrieves the top-K relevant skills for a query.
   */
  async retrieve(query: string, topK = 6): Promise<SkillDefinition[]> {
    if (this.indexedSkills.length === 0) {
      console.warn("[SkillRetriever] No skills indexed.");
      return [];
    }

    const queryVector = await generateEmbedding(query);
    if (!queryVector) {
      console.warn("[SkillRetriever] Failed to generate embedding for query. Falling back to all skills.");
      return this.indexedSkills.map(s => s.skill).slice(0, topK);
    }

    const scored = this.indexedSkills.map(indexed => ({
      skill: indexed.skill,
      score: cosineSimilarity(queryVector, indexed.vector)
    }))
    .filter(s => s.score > 0.1) // Low threshold to ensure we get something if it's even slightly relevant
    .sort((a, b) => b.score - a.score);

    const results = scored.slice(0, topK).map(s => s.skill);
    console.log(`[SkillRetriever] Retrieved ${results.length} relevant skills.`);
    return results;
  }

  /**
   * Check if indexing has been performed.
   */
  hasIndex(): boolean {
    return this.indexedSkills.length > 0;
  }
}
