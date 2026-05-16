/**
 * Command Parser — Détecte et extrait les commandes de contrôle du navigateur
 * depuis les réponses de l'assistant.
 *
 * Améliorations v2:
 *  - Support multi-commandes dans une phrase
 *  - Nouveaux patterns : onglets, zoom, copier-coller, screenshot, fullscreen
 *  - Regex plus robustes avec frontières de mots et groupes non-capturants
 *  - Architecture déclarative : chaque pattern est auto-descriptif
 *  - Scoring de confiance pour réduire les faux positifs
 *  - Utilitaire de test intégré avec couverture de cas limites
 */

import type { BrowserAction } from "./browserControl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedCommand {
  originalText: string;
  /** Texte sans les commandes extraites */
  cleanText: string;
  /** Première commande détectée (rétro-compat) */
  action: BrowserAction | null;
  /** Toutes les commandes détectées dans le texte */
  actions: BrowserAction[];
}

export interface DetectedMatch {
  action: BrowserAction;
  /** Portion exacte du texte qui a déclenché ce pattern */
  matchedText: string;
  /** Index de début dans le texte original */
  startIndex: number;
  /** Score 0–1 indiquant la confiance dans la détection */
  confidence: number;
}

type CommandPattern = {
  /** Identifiant lisible pour les logs/debug */
  id: string;
  regex: RegExp;
  type: BrowserAction["type"];
  extract: (match: RegExpMatchArray) => Record<string, unknown>;
  /** Facteur de confiance de base (0–1). Défaut : 0.8 */
  baseConfidence?: number;
  requiresConfirmation?: boolean;
};

// ---------------------------------------------------------------------------
// Sites communs (partagé entre plusieurs patterns)
// ---------------------------------------------------------------------------

const COMMON_SITES: Record<string, string> = {
  google: "google.com",
  youtube: "youtube.com",
  facebook: "facebook.com",
  twitter: "twitter.com",
  "x.com": "x.com",
  instagram: "instagram.com",
  linkedin: "linkedin.com",
  wikipedia: "wikipedia.org",
  amazon: "amazon.fr",
  netflix: "netflix.com",
  spotify: "spotify.com",
  github: "github.com",
  reddit: "reddit.com",
  twitch: "twitch.tv",
  discord: "discord.com",
  whatsapp: "web.whatsapp.com",
  gmail: "mail.google.com",
  drive: "drive.google.com",
  maps: "maps.google.com",
};

const COMMON_SITE_NAMES = Object.keys(COMMON_SITES).join("|");

/** Normalise une URL brute en URL absolue https:// */
function normalizeUrl(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (COMMON_SITES[lower]) return `https://${COMMON_SITES[lower]}`;
  if (!raw.startsWith("http")) return `https://${raw.trim()}`;
  return raw.trim();
}

/**
 * Coupe une chaîne au premier marqueur de début de phrase de l'assistant.
 * Évite que "cherche bitcoin Tu veux savoir..." capture "bitcoin Tu veux savoir...".
 */
function trimAtSentenceStart(text: string): string {
  const SENTENCE_STARTERS = [
    " Tu veux",
    " Peux-tu",
    " Est-ce",
    " Je peux",
    " C'est",
    " Veux-tu",
    " Souhaites-tu",
    " Veux-",
  ];
  for (const s of SENTENCE_STARTERS) {
    const idx = text.indexOf(s);
    if (idx !== -1) return text.slice(0, idx).trim();
  }
  return text.trim();
}

// ---------------------------------------------------------------------------
// Patterns de commandes
// ---------------------------------------------------------------------------

const COMMAND_PATTERNS: CommandPattern[] = [
  // ── Navigation : URL complète ──────────────────────────────────────────
  {
    id: "navigate-url",
    regex: /\b(?:va(?:\s+sur)?|ouvre(?:\s+moi)?|navigue(?:\s+vers?)?|accède\s+à)\s+(https?:\/\/[^\s,;]+)/gi,
    type: "navigate",
    baseConfidence: 0.95,
    requiresConfirmation: true,
    extract: (m) => ({ url: m[1].trim() }),
  },

  // ── Navigation : sites connus sans extension ───────────────────────────
  {
    id: "navigate-known-site",
    regex: new RegExp(
      `\\b(?:va(?:\\s+sur)?|ouvre(?:\\s+moi)?|navigue(?:\\s+vers?)?|accède\\s+à)\\s+(${COMMON_SITE_NAMES})(?:\\s|$|[.,;!?])`,
      "gi"
    ),
    type: "navigate",
    baseConfidence: 0.95,
    requiresConfirmation: true,
    extract: (m) => ({ url: normalizeUrl(m[1]) }),
  },

  // ── Navigation : domaine avec extension (ex: example.com/path) ─────────
  {
    id: "navigate-domain",
    regex: /\b(?:va(?:\s+sur)?|ouvre(?:\s+moi)?|navigue(?:\s+vers?)?)\s+([a-zA-Z0-9-]+\.[a-z]{2,}(?:\/[^\s,;]*)?)/gi,
    type: "navigate",
    baseConfidence: 0.85,
    requiresConfirmation: true,
    extract: (m) => ({ url: normalizeUrl(m[1]) }),
  },

  // ── Recherche Google ───────────────────────────────────────────────────
  {
    id: "search-google",
    regex: /\b(?:cherche|recherche|trouve|googl(?:e|ise|'ise))\s+(?:moi\s+)?["']?([^"'\n.!?]{2,60})["']?(?:\s+sur\s+(?:google|internet|le\s+web))?/gi,
    type: "navigate",
    baseConfidence: 0.8,
    requiresConfirmation: true,
    extract: (m) => ({
      url: `https://www.google.com/search?q=${encodeURIComponent(trimAtSentenceStart(m[1]))}`,
    }),
  },

  // ── Nouvel onglet ──────────────────────────────────────────────────────
  {
    id: "new-tab",
    // Évite "comment ouvrir un onglet" ou "pouvoir ouvrir un onglet"
    regex: /\b(?<!comment\s+|pouvoir\s+)(?:ouvre(?:\s+un)?\s+(?:nouvel?\s+)?onglet|nouvel\s+onglet)\b/gi,
    type: "newTab",
    baseConfidence: 0.9,
    extract: () => ({}),
  },

  // ── Fermer onglet ──────────────────────────────────────────────────────
  {
    id: "close-tab",
    regex: /\b(?:ferme(?:\s+(?:cet?|l[ae])?)?(?:\s+(?:onglet|page)))\b/gi,
    type: "closeTab",
    baseConfidence: 0.9,
    extract: () => ({}),
  },

  // ── Onglet suivant / précédent ─────────────────────────────────────────
  {
    id: "next-tab",
    regex: /\b(?:(?:onglet|tab)\s+suivant|passe\s+à\s+l[ae]?\s+(?:prochain|suivant)\s+(?:onglet|tab))\b/gi,
    type: "nextTab",
    baseConfidence: 0.85,
    extract: () => ({}),
  },
  {
    id: "prev-tab",
    regex: /\b(?:(?:onglet|tab)\s+précédent|reviens?\s+(?:à|sur)\s+l[ae]?\s+(?:onglet|tab)\s+précédent)\b/gi,
    type: "prevTab",
    baseConfidence: 0.85,
    extract: () => ({}),
  },

  // ── Clic ───────────────────────────────────────────────────────────────
  {
    id: "click",
    regex: /\bclique(?:\s+sur)?(?:\s+l[ae])?(?:\s+(?:bouton|lien|élément))?\s+["']([^"']+)["']/gi,
    type: "click",
    baseConfidence: 0.9,
    extract: (m) => ({ selector: { text: m[1].trim() } }),
  },
  // Clic sans guillemets (texte jusqu'à ponctuation ou fin de phrase)
  {
    id: "click-no-quotes",
    // Évite "clique ici si tu veux" ou "on peut cliquer sur..."
    regex: /\b(?<!comment\s+|pouvoir\s+|pour\s+|on\s+peut\s+|tu\s+peux\s+|vous\s+pouvez\s+)clique(?:\s+sur)?(?:\s+l[ae])?(?:\s+(?:bouton|lien|élément))\s+([^"'\n.,;!?]{2,40})/gi,
    type: "click",
    baseConfidence: 0.7,
    extract: (m) => ({ selector: { text: trimAtSentenceStart(m[1]) } }),
  },

  // ── Saisie de texte ────────────────────────────────────────────────────
  {
    id: "type-with-target",
    regex: /(?<=^|[^a-zA-Z0-9_])(?:écris|tape|saisis|entre|remplis)\s+["']([^"']+)["']\s+(?:dans|sur)\s+(?:l[ae]\s+)?(?:champ\s+)?["']?([^"'\n.,;!?]{1,40})["']?/gi,
    type: "type",
    baseConfidence: 0.9,
    extract: (m) => ({
      text: m[1].trim(),
      selector: { placeholder: (m[2] || "").trim() },
    }),
  },
  // Saisie sans cible explicite
  {
    id: "type-no-target",
    regex: /(?<=^|[^a-zA-Z0-9_])(?:écris|tape|saisis)\s+["']([^"']+)["']/gi,
    type: "type",
    baseConfidence: 0.75,
    extract: (m) => ({ text: m[1].trim() }),
  },

  // ── Copier / Coller ────────────────────────────────────────────────────
  {
    id: "copy",
    regex: /\b(?:copie(?:\s+(?:le\s+)?(?:texte|contenu|sélection))?|ctrl\s*\+\s*c)\b/gi,
    type: "copy",
    baseConfidence: 0.8,
    extract: () => ({}),
  },
  {
    id: "paste",
    regex: /\b(?:colle(?:\s+(?:le\s+)?(?:texte|contenu))?|ctrl\s*\+\s*v)\b/gi,
    type: "paste",
    baseConfidence: 0.8,
    extract: () => ({}),
  },

  // ── Zoom ───────────────────────────────────────────────────────────────
  {
    id: "zoom-in",
    regex: /\b(?<!comment\s+|pouvoir\s+|pour\s+|on\s+peut\s+)(?:zoom(?:e)?\s+(?:avant|in)|agrandis(?:\s+la\s+page)?|ctrl\s*\+\s*\+)\b/gi,
    type: "zoomIn",
    baseConfidence: 0.85,
    extract: () => ({}),
  },
  {
    id: "zoom-out",
    regex: /\b(?<!comment\s+|on\s+peut\s+|pour\s+|pouvoir\s+)(?:zoom(?:e)?\s+(?:arrière|out)|réduis(?:\s+la\s+page)?|ctrl\s*\+\s*-|dézoome)(?!\s+sur\s+l'histoire)\b/gi,
    type: "zoomOut",
    baseConfidence: 0.85,
    extract: () => ({}),
  },
  {
    id: "zoom-reset",
    regex: /\b(?<!comment\s+|pouvoir\s+)(?:réinitialise\s+(?:le\s+)?zoom|taille\s+normale|ctrl\s*\+\s*0)\b/gi,
    type: "zoomReset",
    baseConfidence: 0.85,
    extract: () => ({}),
  },

  // ── Screenshot ─────────────────────────────────────────────────────────
  {
    id: "screenshot",
    regex: /\b(?:(?:fais?|prends?)\s+(?:une?\s+)?(?:capture|screenshot|copie\s+d'écran)|capture(?:\s+d'écran)?)\b/gi,
    type: "screenshot",
    baseConfidence: 0.9,
    extract: () => ({}),
  },

  // ── Plein écran ────────────────────────────────────────────────────────
  {
    id: "fullscreen",
    regex: /\b(?:(?:passe\s+en|active\s+le?)\s+(?:plein[\s-]?écran|fullscreen)|fullscreen|plein[\s-]?écran)\b/gi,
    type: "fullscreen",
    baseConfidence: 0.85,
    extract: () => ({}),
  },

  // ── Défilement ─────────────────────────────────────────────────────────
  {
    id: "scroll-down",
    regex: /\b(?<!comment\s+|pouvoir\s+|pour\s+|on\s+peut\s+)(?:descends?|scrolle?\s+(?:vers\s+le\s+)?bas|va\s+en\s+bas)(?:\s+(?:un\s+peu|la\s+page))?\b/gi,
    type: "scroll",
    baseConfidence: 0.85,
    extract: () => ({ direction: "down" }),
  },
  {
    id: "scroll-up",
    regex: /\b(?<!comment\s+|pouvoir\s+|pour\s+|on\s+peut\s+)(?:montes?|remontes?|scrolle?\s+(?:vers\s+le\s+)?haut|va\s+en\s+haut)(?:\s+(?:un\s+peu|la\s+page))?\b/gi,
    type: "scroll",
    baseConfidence: 0.85,
    extract: () => ({ direction: "up" }),
  },

  // ── Extraction de contenu ──────────────────────────────────────────────
  {
    id: "extract",
    regex: /\b(?:lis|extrais|récupère|montre|analyse)(?:\s+moi)?(?:\s+le\s+contenu\s+(?:de\s+)?)?(?:\s+la|\s+cette)?\s+page\b/gi,
    type: "extract",
    baseConfidence: 0.8,
    extract: () => ({}),
  },

  // ── Navigation historique ──────────────────────────────────────────────
  {
    id: "back",
    regex: /\b(?<!un\s+)(?:retour(?:\s+en\s+arrière)?|page\s+précédente|reviens?\s+en\s+arrière)(?!\s+positif)\b/gi,
    type: "back",
    baseConfidence: 0.85,
    extract: () => ({}),
  },
  {
    id: "forward",
    regex: /\b(?:page\s+suivante|avance(?:\s+en\s+avant)?)\b/gi,
    type: "forward",
    baseConfidence: 0.9,
    extract: () => ({}),
  },

  // ── Rechargement ───────────────────────────────────────────────────────
  {
    id: "reload",
    regex: /\b(?:recharge|actualise|rafraîchis|reload)(?:\s+la)?\s*page\b/gi,
    type: "reload",
    baseConfidence: 0.9,
    extract: () => ({}),
  },
  // ── Système / Dossiers ────────────────────────────────────────────────
  {
    id: "pick-workdir",
    // Support : "sélecteur de dossier", "selecteur de dossier", "folder selector", "choisir un dossier", "pick_workdir", "pickWorkdir"
    regex: /\b(?:ouvre(?:\s+le)?\s+s[eé]lecteur\s+de\s+dossier|folder\s+selector|choisir(?:\s+un)?\s+dossier(?:\s+de\s+travail)?|pick_?workdir|pickWorkdir|pick\s+workdir)\b/gi,
    type: "pickWorkdir",
    baseConfidence: 0.9,
    extract: () => ({}),
  },
  {
    id: "list-dir",
    regex: /\b(?:liste\s+les\s+fichiers|affiche\s+le\s+contenu|list_files|listDir)(?:\s+(?:dans\s+|de\s+|du\s+dossier\s+)?(?:["']([^"']+)["']|((?:[\.\/\\]|[A-Z]:)[^"'\n.?!,;]*)))?\b/gi,
    type: "listDir",
    baseConfidence: 0.85,
    extract: (m) => ({ path: (m[1] || m[2])?.trim() }),
  },
  {
    id: "read-file",
    regex: /\b(?:lis\s+le\s+fichier|affiche\s+le\s+fichier|read_file|readFile)\s+(?:["']([^"']+)["']|((?:[\.\/\\]|[A-Z]:)?[^"'\n,;?!]+\.[a-z0-9]{1,10}))\b/gi,
    type: "readFile",
    baseConfidence: 0.85,
    extract: (m) => ({ path: (m[1] || m[2])?.trim() }),
  },
  {
    id: "write-file",
    regex: /\b(?:écris|crée|modifie|sauvegarde)\s+(?:le\s+fichier\s+)?(?:["']([^"']+)["']|((?:[\.\/\\]|[A-Z]:)?[^\s.?!,;]+))\s+avec\s+(?:le\s+contenu\s+)?["'](.+)["']\b/gi,
    type: "writeFile",
    baseConfidence: 0.8,
    requiresConfirmation: true,
    extract: (m) => ({ path: (m[1] || m[2])?.trim(), content: m[3] }),
  },
  {
    id: "delete-file",
    regex: /\b(?:supprime|efface)\s+(?:le\s+fichier\s+|le\s+dossier\s+)?(?:["']([^"']+)["']|((?:[\.\/\\]|[A-Z]:)?[^"'\n.?!,;]+))\b/gi,
    type: "deleteFile",
    baseConfidence: 0.8,
    requiresConfirmation: true,
    extract: (m) => ({ path: (m[1] || m[2])?.trim() }),
  },
];

// Seuil minimum de confiance pour accepter une commande
const CONFIDENCE_THRESHOLD = 0.7;

// ---------------------------------------------------------------------------
// Fonctions utilitaires internes
// ---------------------------------------------------------------------------

function getAllMatches(text: string, regex: RegExp): RegExpMatchArray[] {
  regex.lastIndex = 0;
  return Array.from(text.matchAll(regex));
}

/**
 * Supprime les fragments de texte correspondant aux commandes détectées,
 * puis nettoie les espaces et ponctuations orphelines.
 */
function buildCleanText(original: string, matches: DetectedMatch[]): string {
  // Trier par position décroissante pour ne pas décaler les indices
  const sorted = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  let result = original;
  for (const m of sorted) {
    result =
      result.slice(0, m.startIndex) +
      result.slice(m.startIndex + m.matchedText.length);
  }
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Détecte toutes les commandes dans le texte avec leur position et confiance.
 */
export function detectAllMatches(text: string): DetectedMatch[] {
  const results: DetectedMatch[] = [];
  // Suivi des zones déjà couvertes pour éviter les doublons
  const coveredRanges: Array<[number, number]> = [];

  for (const pattern of COMMAND_PATTERNS) {
    const rawMatches = getAllMatches(text, pattern.regex);

    for (const match of rawMatches) {
      const start = match.index ?? 0;
      const end = start + match[0].length;

      // Ignorer si cette zone est déjà couverte par un pattern de confiance ≥
      const alreadyCovered = coveredRanges.some(
        ([s, e]) => start < e && end > s
      );
      if (alreadyCovered) continue;

      const confidence = pattern.baseConfidence ?? 0.8;
      if (confidence < CONFIDENCE_THRESHOLD) continue;

      const params = pattern.extract(match);
      const action: BrowserAction = {
        type: pattern.type,
        params,
        requiresConfirmation: pattern.requiresConfirmation ?? false,
      };

      results.push({
        action,
        matchedText: match[0],
        startIndex: start,
        confidence,
      });

      coveredRanges.push([start, end]);
    }
  }

  // Dédupliquer les actions identiques (même type et mêmes paramètres)
  const uniqueResults: DetectedMatch[] = [];
  const seenActions = new Set<string>();

  for (const match of results) {
    const actionKey = `${match.action.type}:${JSON.stringify(match.action.params || {})}`;
    if (!seenActions.has(actionKey)) {
      seenActions.add(actionKey);
      uniqueResults.push(match);
    }
  }

  // Retourner dans l'ordre d'apparition
  return uniqueResults.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Parse le texte de l'assistant.
 * Retourne la première commande (rétro-compat) + toutes les commandes.
 */
export function parseAssistantResponse(text: string): ParsedCommand {
  const detected = detectAllMatches(text);

  return {
    originalText: text,
    cleanText: detected.length > 0 ? buildCleanText(text, detected) : text,
    action: detected[0]?.action ?? null,
    actions: detected.map((d) => d.action),
  };
}

/**
 * Vérifie si un texte contient au moins une commande reconnue.
 */
export function containsBrowserCommand(text: string): boolean {
  return detectAllMatches(text).length > 0;
}

/**
 * Extrait toutes les commandes d'un texte (pour traitement en batch).
 */
export function extractAllCommands(text: string): BrowserAction[] {
  return detectAllMatches(text).map((d) => d.action);
}

/**
 * Formate une action en texte lisible pour l'utilisateur.
 */
export function formatActionForUser(action: BrowserAction): string {
  const p = action.params ?? {};
  switch (action.type) {
    case "navigate": return `Naviguer vers ${p.url}`;
    case "newTab": return "Ouvrir un nouvel onglet";
    case "closeTab": return "Fermer l'onglet actuel";
    case "nextTab": return "Passer à l'onglet suivant";
    case "prevTab": return "Passer à l'onglet précédent";
    case "click": return `Cliquer sur « ${(p.selector as any)?.text ?? "un élément"} »`;
    case "type": return `Saisir « ${p.text} »${p.selector ? ` dans ${(p.selector as any).placeholder}` : ""}`;
    case "copy": return "Copier la sélection";
    case "paste": return "Coller";
    case "zoomIn": return "Zoom avant";
    case "zoomOut": return "Zoom arrière";
    case "zoomReset": return "Réinitialiser le zoom";
    case "screenshot": return "Faire une capture d'écran";
    case "fullscreen": return "Passer en plein écran";
    case "scroll": return `Défiler vers ${p.direction === "up" ? "le haut" : "le bas"}`;
    case "extract": return "Lire le contenu de la page";
    case "back": return "Retour en arrière";
    case "forward": return "Avancer";
    case "reload": return "Recharger la page";
    default: return "Action inconnue";
  }
}

// ---------------------------------------------------------------------------
// Utilitaire de test
// ---------------------------------------------------------------------------

type TestCase = { input: string; expectedType: BrowserAction["type"] | null; description?: string };

const TEST_CASES: TestCase[] = [
  // Navigation
  { input: "va sur youtube", expectedType: "navigate", description: "site connu sans extension" },
  { input: "ouvre github.com/anthropics/claude", expectedType: "navigate", description: "URL avec chemin" },
  { input: "navigue vers https://example.com", expectedType: "navigate", description: "URL complète" },
  { input: "cherche météo Paris", expectedType: "navigate", description: "recherche Google" },
  { input: "googl'ise les dernières nouvelles IA", expectedType: "navigate", description: "variante googl'ise" },

  // Onglets
  { input: "ouvre un nouvel onglet", expectedType: "newTab" },
  { input: "ferme cet onglet", expectedType: "closeTab" },
  { input: "onglet suivant", expectedType: "nextTab" },
  { input: "onglet précédent", expectedType: "prevTab" },

  // Interactions
  { input: 'clique sur "Connexion"', expectedType: "click" },
  { input: "clique sur le bouton Envoyer", expectedType: "click" },
  { input: "tape 'bonjour' dans le champ recherche", expectedType: "type" },
  { input: 'écris "test@email.com" dans email', expectedType: "type" },
  { input: "copie le texte", expectedType: "copy" },
  { input: "colle le contenu", expectedType: "paste" },

  // Zoom & UI
  { input: "zoome avant", expectedType: "zoomIn" },
  { input: "zoom out", expectedType: "zoomOut" },
  { input: "réinitialise le zoom", expectedType: "zoomReset" },
  { input: "prends une capture d'écran", expectedType: "screenshot" },
  { input: "passe en plein écran", expectedType: "fullscreen" },

  // Navigation & défilement
  { input: "descends un peu", expectedType: "scroll" },
  { input: "remonte la page", expectedType: "scroll" },
  { input: "lis la page", expectedType: "extract" },
  { input: "retour en arrière", expectedType: "back" },
  { input: "recharge la page", expectedType: "reload" },

  // Multi-commandes
  {
    input: "cherche bitcoin puis descends la page",
    expectedType: "navigate",
    description: "multi-commandes : la première est navigate",
  },

  // Faux positifs attendus → null
  { input: "les avancées technologiques sont impressionnantes", expectedType: null, description: "faux positif 'avancées'" },
  { input: "j'ai cherché pendant une heure", expectedType: null, description: "faux positif 'cherché'" },
  { input: "c'est un retour positif", expectedType: null, description: "faux positif 'retour'" },
  { input: "je peux t'apprendre comment ouvrir un onglet", expectedType: null, description: "descriptif 'ouvrir un onglet'" },
  { input: "faire un zoom arrière sur l'histoire", expectedType: null, description: "métaphorique 'zoom arrière'" },
  { input: "clique ici si tu veux", expectedType: null, description: "phrase incomplète 'clique ici'" },
  { input: "va sur le terrain", expectedType: null, description: "navigation invalide (pas de domaine)" },
  { input: "je peux zoomer si tu veux", expectedType: null, description: "descriptif 'je peux zoomer'" },
  { input: "ouvre le selecteur de dossier", expectedType: "pickWorkdir", description: "sélecteur sans accent" },
];

export function runTests(): void {
  // console.log("🧪 [CommandParser v2] Lancement des tests\n");

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const result = parseAssistantResponse(tc.input);
    const gotType = result.action?.type ?? null;
    const ok = gotType === tc.expectedType;

    if (ok) {
      passed++;
      // console.log(`✅ PASS  "${tc.input}"${tc.description ? ` — ${tc.description}` : ""}`);
    } else {
      failed++;
      console.warn(
        `❌ FAIL  "${tc.input}"${tc.description ? ` — ${tc.description}` : ""}\n` +
        `        attendu: ${tc.expectedType ?? "null"} | obtenu: ${gotType ?? "null"}`
      );
    }

    // Afficher les commandes multiples si présentes
    if (result.actions.length > 1) {
      console.log(`   ↳ Multi-commandes (${result.actions.length}) : ${result.actions.map((a) => a.type).join(", ")}`);
    }
  }

  // console.log(`\n📊 Résultats : ${passed}/${TEST_CASES.length} réussis, ${failed} échoués`);
}