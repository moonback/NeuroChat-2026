/**
 * Command Parser - Détecte et extrait les commandes de contrôle du navigateur
 * depuis les réponses de l'assistant
 */

import type { BrowserAction } from "./browserControl";

export interface ParsedCommand {
  originalText: string;
  cleanText: string; // Texte sans la commande
  action: BrowserAction | null;
}

/**
 * Patterns de commandes reconnus
 */
const COMMAND_PATTERNS = [
  // Navigation - patterns plus flexibles
  {
    regex: /(?:va(?:\s+sur)?|ouvre(?:\s+moi)?|navigue(?:\s+vers)?|cherche(?:\s+sur)?|recherche(?:\s+sur)?)\s+([a-zA-Z0-9.-]+(?:\.[a-zA-Z]{2,})?(?:\/[^\s]*)?)/gi,
    type: "navigate" as const,
    extract: (match: RegExpMatchArray) => {
      let url = match[1].trim();
      
      // Gérer les sites communs sans extension
      const commonSites: Record<string, string> = {
        "google": "google.com",
        "youtube": "youtube.com",
        "facebook": "facebook.com",
        "twitter": "twitter.com",
        "instagram": "instagram.com",
        "linkedin": "linkedin.com",
        "wikipedia": "wikipedia.org",
        "amazon": "amazon.fr",
        "netflix": "netflix.com",
        "spotify": "spotify.com",
      };
      
      const lowerUrl = url.toLowerCase();
      if (commonSites[lowerUrl]) {
        url = commonSites[lowerUrl];
      }
      
      // Ajouter https:// si nécessaire
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      
      return { url };
    },
  },
  // Recherche Google
  {
    regex: /(?:cherche|recherche|trouve|google)\s+(?:moi\s+)?["']?([^"'\n]+?)["']?(?:\s+sur\s+(?:google|internet|le\s+web))?(?:\s|$|\.)/gi,
    type: "navigate" as const,
    extract: (match: RegExpMatchArray) => {
      const query = encodeURIComponent(match[1].trim());
      return { url: `https://www.google.com/search?q=${query}` };
    },
  },
  // Clic
  {
    regex: /clique(?:\s+sur)?(?:\s+le)?(?:\s+bouton)?(?:\s+lien)?\s+["']?([^"'\n]+?)["']?(?:\s|$|\.)/gi,
    type: "click" as const,
    extract: (match: RegExpMatchArray) => ({
      selector: { text: match[1].trim() },
    }),
  },
  // Saisie de texte
  {
    regex: /(?:écris|tape|saisis|entre)\s+["']([^"']+)["']\s+(?:dans|sur)(?:\s+le)?(?:\s+champ)?\s+["']?([^"'\n]+?)["']?(?:\s|$|\.)/gi,
    type: "type" as const,
    extract: (match: RegExpMatchArray) => ({
      text: match[1],
      selector: { placeholder: match[2].trim() },
    }),
  },
  // Défilement
  {
    regex: /(?:descends?|scroll(?:e)?|va(?:\s+en\s+bas)?)\s*(?:un\s+peu|la\s+page)?/gi,
    type: "scroll" as const,
    extract: () => ({ direction: "down" as const }),
  },
  {
    regex: /(?:monte|remonte|va(?:\s+en\s+haut)?)\s*(?:un\s+peu|la\s+page)?/gi,
    type: "scroll" as const,
    extract: () => ({ direction: "up" as const }),
  },
  // Lecture de contenu
  {
    regex: /(?:lis|extrais|récupère|montre)(?:\s+moi)?(?:\s+le\s+contenu\s+de)?(?:\s+la)?(?:\s+cette)?\s+page/gi,
    type: "extract" as const,
    extract: () => ({}),
  },
  // Navigation historique
  {
    regex: /(?:retour|page\s+précédente|reviens(?:\s+en\s+arrière)?)/gi,
    type: "back" as const,
    extract: () => ({}),
  },
  {
    regex: /(?:suivant|page\s+suivante|avance)/gi,
    type: "forward" as const,
    extract: () => ({}),
  },
  // Rechargement
  {
    regex: /(?:recharge|actualise|rafraîchis|reload)(?:\s+la)?\s*page/gi,
    type: "reload" as const,
    extract: () => ({}),
  },
];

/**
 * Parse le texte de l'assistant pour détecter des commandes de contrôle du navigateur
 */
export function parseAssistantResponse(text: string): ParsedCommand {
  let cleanText = text;
  let detectedAction: BrowserAction | null = null;

  for (const pattern of COMMAND_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern.regex));
    
    if (matches.length > 0) {
      const match = matches[0];
      
      // Extraire les paramètres de la commande
      const params = pattern.extract(match);
      
      // Créer l'action
      detectedAction = {
        type: pattern.type,
        params,
        requiresConfirmation: pattern.type === "navigate" || pattern.type === "submit_form",
      };

      // Nettoyer le texte en retirant la commande
      cleanText = text.replace(match[0], "").trim();
      
      // Nettoyer les doubles espaces et ponctuations orphelines
      cleanText = cleanText.replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1");
      
      break; // On ne traite qu'une commande à la fois
    }
  }

  return {
    originalText: text,
    cleanText: cleanText || text,
    action: detectedAction,
  };
}

/**
 * Vérifie si un texte contient une commande de contrôle du navigateur
 */
export function containsBrowserCommand(text: string): boolean {
  return COMMAND_PATTERNS.some((pattern) => pattern.regex.test(text));
}

/**
 * Extrait toutes les commandes d'un texte (pour traitement en batch)
 */
export function extractAllCommands(text: string): BrowserAction[] {
  const actions: BrowserAction[] = [];

  for (const pattern of COMMAND_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern.regex));
    
    for (const match of matches) {
      const params = pattern.extract(match);
      actions.push({
        type: pattern.type,
        params,
        requiresConfirmation: pattern.type === "navigate" || pattern.type === "submit_form",
      });
    }
  }

  return actions;
}

/**
 * Formate une action en texte lisible pour l'utilisateur
 */
export function formatActionForUser(action: BrowserAction): string {
  switch (action.type) {
    case "navigate":
      return `Naviguer vers ${action.params?.url}`;
    case "click":
      return `Cliquer sur "${action.params?.selector?.text || "un élément"}"`;
    case "type":
      return `Saisir "${action.params?.text}" dans ${action.params?.selector?.placeholder || "un champ"}`;
    case "scroll":
      return `Défiler vers ${action.params?.direction === "up" ? "le haut" : "le bas"}`;
    case "extract":
      return "Lire le contenu de la page";
    case "back":
      return "Retour en arrière";
    case "forward":
      return "Avancer";
    case "reload":
      return "Recharger la page";
    default:
      return "Action inconnue";
  }
}
