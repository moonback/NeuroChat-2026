
export type UserEnergyState = "calme" | "neutre" | "élevée" | "agitation";
export type UserMoodInference = "calme" | "joyeux" | "stressé" | "triste" | "neutre" | "focus";

export interface EmotionMetrics {
  energy: UserEnergyState;
  mood: UserMoodInference;
  confidence: number; // 0-1
  trend: "stable" | "increasing" | "decreasing";
  isStagnated: boolean;
  /** Breathing rate suggestion in seconds (lower = faster) */
  breathingRate: number;
  /** Emoji representation of current mood */
  moodEmoji: string;
  /** Color hex for the current mood */
  moodColor: string;
  /** Raw audio average (for debugging) */
  rawAudioAvg: number;
  /** Raw motion average (for debugging) */
  rawMotionAvg: number;
}

export class EmotionEngine {
  private audioHistory: number[] = [];
  private motionHistory: number[] = [];
  private moodHistory: UserMoodInference[] = [];
  private lastState: EmotionMetrics | null = null;
  private isStagnated: boolean = false;
  private readonly HISTORY_SIZE = 60; 
  private readonly MOOD_HISTORY_SIZE = 10;

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

  /** Smoothed mood — only change mood if it's been consistent for a few cycles */
  private getSmoothedMood(currentMood: UserMoodInference): UserMoodInference {
    this.moodHistory.push(currentMood);
    if (this.moodHistory.length > this.MOOD_HISTORY_SIZE) this.moodHistory.shift();

    // Find the most frequent mood in recent history
    const counts = new Map<UserMoodInference, number>();
    for (const m of this.moodHistory) {
      counts.set(m, (counts.get(m) || 0) + 1);
    }

    let maxMood = currentMood;
    let maxCount = 0;
    for (const [mood, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        maxMood = mood;
      }
    }

    return maxMood;
  }

  private getMoodEmoji(mood: UserMoodInference): string {
    const map: Record<UserMoodInference, string> = {
      calme: "😌",
      joyeux: "😄",
      stressé: "😰",
      triste: "😔",
      neutre: "😐",
      focus: "🧠",
    };
    return map[mood] || "😐";
  }

  private getMoodColor(mood: UserMoodInference): string {
    const map: Record<UserMoodInference, string> = {
      calme: "#10b981",    // Emerald
      joyeux: "#fbbf24",   // Amber
      stressé: "#ef4444",  // Red
      triste: "#3b82f6",   // Blue
      neutre: "#6366f1",   // Indigo (default)
      focus: "#8b5cf6",    // Purple
    };
    return map[mood] || "#6366f1";
  }

  private getBreathingRate(energy: UserEnergyState, mood: UserMoodInference): number {
    // Slower breathing for calm states, faster for agitated
    if (mood === "focus") return 6;      // Slow, meditative
    if (energy === "calme") return 5;    // Very slow
    if (energy === "neutre") return 4;   // Normal
    if (energy === "élevée") return 2.5; // Faster
    if (energy === "agitation") return 1.5; // Rapid
    return 4;
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

    // 2. Inférence de l'humeur avec logique enrichie
    let rawMood: UserMoodInference = "neutre";
    if (this.isStagnated && avgAudio < 0.05) rawMood = "focus";
    else if (energy === "agitation" && avgMotion > 0.25) rawMood = "stressé";
    else if (energy === "calme" && avgMotion < 0.04) rawMood = "calme";
    else if (energy === "élevée" && avgMotion > 0.15) rawMood = "joyeux";
    else if (energy === "calme" && audioTrend === "decreasing") rawMood = "triste";

    // 3. Smoothing (avoid flickering)
    const mood = this.getSmoothedMood(rawMood);

    // 4. Calcul de confiance (cohérence des signaux)
    let confidence = 1.0;
    if (energy === "agitation" && avgMotion < 0.02) confidence = 0.5;
    if (this.audioHistory.length < 10) confidence *= 0.6;

    const metrics: EmotionMetrics = {
      energy,
      mood,
      confidence,
      trend: audioTrend,
      isStagnated: this.isStagnated,
      breathingRate: this.getBreathingRate(energy, mood),
      moodEmoji: this.getMoodEmoji(mood),
      moodColor: this.getMoodColor(mood),
      rawAudioAvg: avgAudio,
      rawMotionAvg: avgMotion,
    };

    this.lastState = metrics;
    return metrics;
  }

  getSystemContext(): string {
    const m = this.getMetrics();
    const trendStr = m.trend === "stable" ? "" : ` (en ${m.trend === "increasing" ? "augmentation" : "baisse"})`;
    const focusStr = m.mood === "focus" ? " | L'utilisateur semble en état de concentration profonde (Deep Work). Ne le dérange pas sauf si on te parle." : "";
    const stressStr = m.mood === "stressé" ? " | L'utilisateur semble stressé. Sois rassurant et propose de l'aide calmement." : "";
    const sadStr = m.mood === "triste" ? " | L'utilisateur semble fatigué ou triste. Sois particulièrement empathique et chaleureux." : "";
    
    return `CONTEXTE ÉMOTIONNEL : ${m.moodEmoji} Énergie ${m.energy}${trendStr}, Humeur ${m.mood}. Confiance ${Math.round(m.confidence * 100)}%.${focusStr}${stressStr}${sadStr}`;
  }
}
