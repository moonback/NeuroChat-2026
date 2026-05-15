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
  // Visualisation de données (UI Dynamique) - FALLBACK ROBUSTE
  {
    regex: /visualise\s*:\s*(\{[\s\S]*?\})(?:\s|$)/gi,
    type: "render_ui" as const,
    extract: (match: RegExpMatchArray) => {
      try {
        // Nettoyage agressif du JSON au cas où l'IA aurait ajouté du texte après
        const jsonStr = match[1].trim();
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("❌ [CommandParser] Erreur de parsing JSON pour render_ui:", e);
        // Tentative de récupération : on cherche la dernière accolade fermante
        try {
          const lastBrace = match[1].lastIndexOf("}");
          if (lastBrace !== -1) {
             return JSON.parse(match[1].substring(0, lastBrace + 1));
          }
        } catch {}
        return { error: "JSON invalide" };
      }
    },
  },
  // Navigation - exige des termes plus explicites pour éviter les collisions avec le langage naturel
  {
    regex: /\b(?:va\s+sur|ouvre\s+le\s+site|navigue\s+vers)\s+([a-zA-Z0-9.-]+(?:\.[a-zA-Z]{2,})?(?:\/[^\s]*)?)/gi,
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
    regex: /\b(?:cherche|recherche|trouve|google)\s+(?:moi\s+)?["']?([^"'\n]+?)["']?(?:\s+sur\s+(?:google|internet|le\s+web))?(?:\s|$|\.)/gi,
    type: "navigate" as const,
    extract: (match: RegExpMatchArray) => {
      const query = encodeURIComponent(match[1].trim());
      return { url: `https://www.google.com/search?q=${query}` };
    },
  },
  // Pattern spécial pour "va sur youtube" (sans point)
  {
    regex: /\b(?:va\s+sur|ouvre)\s+(youtube|google|facebook|twitter|instagram|linkedin|wikipedia|amazon|netflix|spotify)(?:\s|$|\.)/gi,
    type: "navigate" as const,
    extract: (match: RegExpMatchArray) => {
      const site = match[1].toLowerCase();
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
      
      return { url: `https://${commonSites[site]}` };
    },
  },
  // Clic
  {
    regex: /\bclique(?:\s+sur)?(?:\s+le)?(?:\s+bouton)?(?:\s+lien)?\s+["']?([^"'\n]+?)["']?(?:\s|$|\.)/gi,
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
    regex: /\b(?:descends?|scroll(?:e)?|va(?:\s+en\s+bas)?)\s*(?:un\s+peu|la\s+page)?/gi,
    type: "scroll" as const,
    extract: () => ({ direction: "down" as const }),
  },
  {
    regex: /\b(?:monte|remonte|va(?:\s+en\s+haut)?)\s*(?:un\s+peu|la\s+page)?/gi,
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
  console.log("🔍 [CommandParser] Analyse du texte:", text);
  
  let cleanText = text;
  let detectedAction: BrowserAction | null = null;

  for (const pattern of COMMAND_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern.regex));
    
    if (matches.length > 0) {
      const match = matches[0];
      console.log("✅ [CommandParser] Pattern détecté:", {
        type: pattern.type,
        match: match[0],
        fullMatch: match,
      });
      
      // Extraire les paramètres de la commande
      const params = pattern.extract(match);
      console.log("📦 [CommandParser] Paramètres extraits:", params);
      
      // Créer l'action
      detectedAction = {
        type: pattern.type,
        params,
        requiresConfirmation: pattern.type === "navigate" || pattern.type === "submit_form",
      };

      console.log("🎯 [CommandParser] Action créée:", detectedAction);

      // Nettoyer le texte en retirant la commande
      cleanText = text.replace(match[0], "").trim();
      
      // Nettoyer les doubles espaces et ponctuations orphelines
      cleanText = cleanText.replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1");
      
      console.log("✂️ [CommandParser] Texte nettoyé:", cleanText);
      
      break; // On ne traite qu'une commande à la fois
    }
  }

  if (!detectedAction) {
    console.log("❌ [CommandParser] Aucune commande détectée dans:", text);
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
 * Teste les patterns de commandes avec des exemples
 */
export function testCommandPatterns(): void {
  const testCases = [
    "Je t'ouvre YouTube tout de suite. va sur youtube",
    "D'accord, je vais sur Google. va sur google",
    "Je cherche ça pour toi. cherche météo Paris",
    "ouvre facebook",
    "va sur netflix",
    "clique sur le bouton connexion",
    "descends un peu",
    "lis la page",
  ];

  console.log("🧪 [CommandParser] Test des patterns:");
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: "${testCase}" ---`);
    const result = parseAssistantResponse(testCase);
    
    if (result.action) {
      console.log("✅ Commande détectée:", result.action);
      console.log("📝 Texte nettoyé:", result.cleanText);
    } else {
      console.log("❌ Aucune commande détectée");
    }
  });
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
