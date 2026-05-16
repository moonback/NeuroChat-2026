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
  confidence: number; // 0-1
  privacyAlert: boolean; // True if third parties detected
  lastUpdate: number;
}

export class EmotionEngine {
  private audioHistory: number[] = [];
  private motionHistory: number[] = [];
  private faceCountHistory: number[] = [];
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
   * Ajoute le nombre de visages détectés
   */
  addFaceDetection(count: number) {
    this.faceCountHistory.push(count);
    if (this.faceCountHistory.length > this.HISTORY_SIZE) this.faceCountHistory.shift();
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

    if (energy === "agitation" && avgMotion > 0.3) return "stressé";
    if (energy === "calme" && avgMotion < 0.05) return "calme";

    return "neutre";
  }

  /**
   * Calcule l'indice de confiance de l'inférence actuelle (0-1)
   */
  getConfidenceScore(): number {
    const dataPoints = Math.min(this.audioHistory.length, this.motionHistory.length);
    if (dataPoints < 10) return 0.5; // Pas assez de données
    
    // Plus on a de données stables, plus la confiance est élevée
    const stability = 1.0; // Simplifié
    return Math.min(0.95, 0.7 + (dataPoints / this.HISTORY_SIZE) * 0.25);
  }

  /**
   * Détecte si la vie privée doit être protégée (plusieurs personnes)
   */
  isPrivacyAlertActive(): boolean {
    if (this.faceCountHistory.length === 0) return false;
    const maxFaces = Math.max(...this.faceCountHistory);
    return maxFaces > 1;
  }

  /**
   * Retourne un résumé pour le prompt système
   */
  getSystemContext(): string {
    if (this.isPrivacyAlertActive()) {
      return "ALERTE CONFIDENTIALITÉ : Plusieurs personnes détectées. N'utilise pas les informations visuelles et bascule en mode discrétion.";
    }

    const energy = this.getEnergyState();
    const mood = this.getMoodInference();
    const confidence = Math.round(this.getConfidenceScore() * 100);

    if (confidence < 85) {
      return "État utilisateur : Incertain (signaux trop faibles pour une conclusion).";
    }

    return `État utilisateur détecté : Énergie ${energy}, Humeur probable ${mood} (Confiance ${confidence}%).`;
  }
}
