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
type CommandPattern = {
  regex: RegExp;
  type: BrowserAction["type"];
  extract: (match: RegExpMatchArray) => Record<string, unknown>;
};

const COMMAND_PATTERNS: CommandPattern[] = [
  // Navigation - Utilisation de \b et exigence d'un point pour les domaines non-listés
  {
    regex: /\b(?:va(?:\s+sur)?|ouvre(?:\s+moi)?|navigue(?:\s+vers)?)\b\s+([a-zA-Z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?|google|youtube|facebook|twitter|instagram|linkedin|wikipedia|amazon|netflix|spotify)/gi,
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
  // Recherche Google - Pattern plus robuste pour les requêtes multi-mots sans ponctuation
  {
    regex: /(?:cherche|recherche|trouve|google)\s+(?:moi\s+)?["']?([^"'\n\.\?!]+)["']?(?:\s+sur\s+(?:google|internet|le\s+web))?/gi,
    type: "navigate" as const,
    extract: (match: RegExpMatchArray) => {
      let query = match[1].trim();
      
      // Heuristique pour les phrases collées sans ponctuation (ex: "cherche cours Bitcoin Tu veux...")
      // On coupe si on voit un début de phrase typique de l'assistant (Tu veux, Peux-tu, etc.)
      const sentenceStarters = [" Tu veux", " Peux-tu", " Est-ce", " Je peux", " C'est"];
      for (const starter of sentenceStarters) {
        if (query.includes(starter)) {
          query = query.split(starter)[0].trim();
          break;
        }
      }
      
      return { url: `https://www.google.com/search?q=${encodeURIComponent(query)}` };
    },
  },
  // Pattern spécial pour "va sur youtube" (sans point)
  {
    regex: /(?:va\s+sur|ouvre)\s+(youtube|google|facebook|twitter|instagram|linkedin|wikipedia|amazon|netflix|spotify)(?:\s|$|\.)/gi,
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
    regex: /clique(?:\s+sur)?(?:\s+le)?(?:\s+bouton)?(?:\s+lien)?\s+["']?([^"'\n\.\?!]+)["']?/gi,
    type: "click" as const,
    extract: (match: RegExpMatchArray) => {
      let text = match[1].trim();
      const sentenceStarters = [" Tu veux", " Peux-tu", " Est-ce", " Je peux", " C'est"];
      for (const starter of sentenceStarters) {
        if (text.includes(starter)) {
          text = text.split(starter)[0].trim();
          break;
        }
      }
      return { selector: { text } };
    },
  },
  // Saisie de texte - Patterns plus flexibles (ex: "écris facebook dans la barre d'adresse", "tape bonjour dans recherche")
  {
    regex: /(?:écris|tape|saisis|entre)\s+["']?([^"']+)["']?\s+(?:dans|sur)(?:\s+le)?(?:\s+champ)?\s+["']?([^"'\n.]+?)["']?(?:\s|$|\.)/gi,
    type: "type" as const,
    extract: (match: RegExpMatchArray) => ({
      text: match[1].trim(),
      selector: { placeholder: match[2].trim() },
    }),
  },
  // Défilement - Utilisation de frontières de mots \b pour éviter les faux positifs (ex: "avancées")
  {
    regex: /\b(?:descends?|scroll(?:e)?|va\s+en\s+bas)\b\s*(?:un\s+peu|la\s+page)?/gi,
    type: "scroll" as const,
    extract: () => ({ direction: "down" as const }),
  },
  {
    regex: /\b(?:monte|remonte|va\s+en\s+haut)\b\s*(?:un\s+peu|la\s+page)?/gi,
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

function getAllMatches(text: string, regex: RegExp): RegExpMatchArray[] {
  regex.lastIndex = 0;
  return Array.from(text.matchAll(regex));
}

/**
 * Parse le texte de l'assistant pour détecter des commandes de contrôle du navigateur
 */
export function parseAssistantResponse(text: string): ParsedCommand {
  console.log("🔍 [CommandParser] Analyse du texte:", text);
  
  let cleanText = text;
  let detectedAction: BrowserAction | null = null;

  for (const pattern of COMMAND_PATTERNS) {
    const matches = getAllMatches(text, pattern.regex);
    
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
        requiresConfirmation: pattern.type === "navigate",
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
  return COMMAND_PATTERNS.some((pattern) => {
    pattern.regex.lastIndex = 0;
    return pattern.regex.test(text);
  });
}

/**
 * Extrait toutes les commandes d'un texte (pour traitement en batch)
 */
export function extractAllCommands(text: string): BrowserAction[] {
  const actions: BrowserAction[] = [];

  for (const pattern of COMMAND_PATTERNS) {
    const matches = getAllMatches(text, pattern.regex);
    
    for (const match of matches) {
      const params = pattern.extract(match);
      actions.push({
        type: pattern.type,
        params,
        requiresConfirmation: pattern.type === "navigate",
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
    "écris \"facebook\" dans la barre d'adresse.",
    "tape bonjour dans le champ recherche",
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
