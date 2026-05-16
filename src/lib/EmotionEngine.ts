
export type UserEnergyState = "calme" | "neutre" | "élevée" | "agitation";
export type UserMoodInference = "calme" | "joyeux" | "stressé" | "triste" | "neutre" | "focus";

export interface EmotionMetrics {
  energy: UserEnergyState;
  mood: UserMoodInference;
  confidence: number; // 0-1
  trend: "stable" | "increasing" | "decreasing";
  isStagnated: boolean;
}

export class EmotionEngine {
  private audioHistory: number[] = [];
  private motionHistory: number[] = [];
  private lastState: EmotionMetrics | null = null;
  private isStagnated: boolean = false;
  private readonly HISTORY_SIZE = 60; 

  addAudioSignal(level: number) {
    this.audioHistory.push(level);
    if (this.audioHistory.length > this.HISTORY_SIZE) this.audioHistory.shift();
  }

  addMotionSignal(intensity: number) {
    this.motionHistory.push(intensity);
    if (this.motionHistory.length > this.HISTORY_SIZE) this.motionHistory.shift();
  }

  setStagnation(stagnated: boolean) {
    this.isStagnated = stagnated;
  }

  private calculateAverage(history: number[]): number {
    if (history.length === 0) return 0;
    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  private getTrend(history: number[]): "stable" | "increasing" | "decreasing" {
    if (history.length < 10) return "stable";
    const firstHalf = this.calculateAverage(history.slice(0, history.length / 2));
    const secondHalf = this.calculateAverage(history.slice(history.length / 2));
    const diff = secondHalf - firstHalf;
    if (Math.abs(diff) < 0.05) return "stable";
    return diff > 0 ? "increasing" : "decreasing";
  }

  getMetrics(): EmotionMetrics {
    const avgAudio = this.calculateAverage(this.audioHistory);
    const avgMotion = this.calculateAverage(this.motionHistory);
    const audioTrend = this.getTrend(this.audioHistory);

    // 1. Détermination de l'énergie
    let energy: UserEnergyState = "neutre";
    if (avgAudio > 0.35) energy = "agitation";
    else if (avgAudio > 0.12) energy = "élevée";
    else if (avgAudio < 0.02) energy = "calme";

    // 2. Inférence de l'humeur avec logique de "Focus"
    let mood: UserMoodInference = "neutre";
    if (this.isStagnated && avgAudio < 0.05) mood = "focus";
    else if (energy === "agitation" && avgMotion > 0.25) mood = "stressé";
    else if (energy === "calme" && avgMotion < 0.04) mood = "calme";
    else if (energy === "élevée" && avgMotion > 0.15) mood = "joyeux";

    // 3. Calcul de confiance (cohérence des signaux)
    // Si audio élevé mais motion nulle, la confiance baisse (bruit de fond ?)
    let confidence = 1.0;
    if (energy === "agitation" && avgMotion < 0.02) confidence = 0.5;

    const metrics: EmotionMetrics = {
      energy,
      mood,
      confidence,
      trend: audioTrend,
      isStagnated: this.isStagnated
    };

    this.lastState = metrics;
    return metrics;
  }

  getSystemContext(): string {
    const m = this.getMetrics();
    const trendStr = m.trend === "stable" ? "" : ` (en ${m.trend === "increasing" ? "augmentation" : "baisse"})`;
    const focusStr = m.mood === "focus" ? " | L'utilisateur semble en état de concentration profonde (Deep Work)." : "";
    
    return `CONTEXTE ÉMOTIONNEL : Énergie ${m.energy}${trendStr}, Humeur probable ${m.mood}. Confiance de détection ${Math.round(m.confidence * 100)}%.${focusStr}`;
  }
}
