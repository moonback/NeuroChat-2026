/**
 * EmotionEngine - Analyseur d'énergie et d'humeur en temps réel.
 * 
 * Agrège les signaux audio (RMS) et visuels (mouvement) pour inférer
 * l'état émotionnel de l'utilisateur et adapter le ton de NeuroChat.
 */

export type UserEnergyState = "calme" | "neutre" | "élevée" | "agitation";
export type UserMoodInference = "calme" | "joyeux" | "stressé" | "triste" | "neutre";

export interface EmotionMetrics {
  energy: UserEnergyState;
  mood: UserMoodInference;
  lastUpdate: number;
}

export class EmotionEngine {
  private audioHistory: number[] = [];
  private motionHistory: number[] = [];
  private readonly HISTORY_SIZE = 50; // Environ 5 secondes à 10Hz

  /**
   * Ajoute une mesure de niveau audio (0-1)
   */
  addAudioSignal(level: number) {
    this.audioHistory.push(level);
    if (this.audioHistory.length > this.HISTORY_SIZE) this.audioHistory.shift();
  }

  /**
   * Ajoute un signal de mouvement visuel (0-1)
   */
  addMotionSignal(intensity: number) {
    this.motionHistory.push(intensity);
    if (this.motionHistory.length > this.HISTORY_SIZE) this.motionHistory.shift();
  }

  /**
   * Calcule l'énergie moyenne actuelle
   */
  getEnergyState(): UserEnergyState {
    if (this.audioHistory.length === 0) return "neutre";
    
    const avgAudio = this.audioHistory.reduce((a, b) => a + b, 0) / this.audioHistory.length;
    const peakAudio = Math.max(...this.audioHistory);

    if (avgAudio > 0.4 || peakAudio > 0.8) return "agitation";
    if (avgAudio > 0.15) return "élevée";
    if (avgAudio < 0.02) return "calme";
    return "neutre";
  }

  /**
   * Infère l'humeur probable basée sur les patterns d'énergie et de mouvement
   */
  getMoodInference(): UserMoodInference {
    const energy = this.getEnergyState();
    const avgMotion = this.motionHistory.reduce((a, b) => a + b, 0) / (this.motionHistory.length || 1);

    // Pattern: Agitation audio + Fort mouvement = Stress/Urgence
    if (energy === "agitation" && avgMotion > 0.3) return "stressé";
    
    // Pattern: Énergie calme + Faible mouvement = Calme/Repos
    if (energy === "calme" && avgMotion < 0.05) return "calme";

    // Par défaut, neutre
    return "neutre";
  }

  /**
   * Retourne un résumé pour le prompt système
   */
  getSystemContext(): string {
    const energy = this.getEnergyState();
    const mood = this.getMoodInference();
    return `État utilisateur détecté : Énergie ${energy}, Humeur probable ${mood}.`;
  }
}
