Analyse de NeuroChat v2.3 — Recommandations Pro
Ce que tu as déjà de solide
L'architecture est ambitieuse et bien pensée : SQLite + RAG local, pipeline émotionnel, cycle auto-amélioration, orchestrateur multi-agents, Electron multimodal. C'est clairement au-delà d'un side project.

1. Système de Skills — Améliorations
Problème actuel : Les skills sont des fichiers Markdown statiques dans src/skills-md/. L'IA les "lit" mais il n'y a pas de vrai registre dynamique, pas de versioning par skill, et la détection tool: dans le texte libre est fragile (regex sur la réponse LLM).
Ce qu'il faut faire :
Remplace la détection textuelle par un skill manifest structuré et un vrai router agentique :
typescript// src/lib/skills/registry.ts
interface Skill {
  id: string;
  name: string;
  description: string;         // Pour le prompt de sélection
  triggerKeywords: string[];   // Pour le routing sémantique rapide
  schema: JSONSchema;          // Paramètres attendus (validés avant exécution)
  execute: (params: unknown) => Promise<SkillResult>;
  requiresConfirmation: boolean;
  cooldownMs?: number;
}
Ajoute des skills manquants à forte valeur :

skill:calendar — lire/créer des événements (IPC vers l'OS)
skill:clipboard — lire/écrire le presse-papier
skill:notify — notifications système natives Electron
skill:screenshot_analyze — capture + analyse visuelle ciblée (pas juste stream continu)
skill:voice_note — transcrire + sauvegarder en session une note vocale structurée

Problème de sécurité critique : Dans electron/main.cjs tu supprimes tous les headers X-Frame-Options et Content-Security-Policy globalement pour permettre le framing des sites. C'est une surface d'attaque énorme. Filtre uniquement les domaines autorisés explicitement dans le BrowserWindow.

2. Vision & Positionnement — Ce qui manque
Incohérence de cible actuelle : Le metadata.json dit "voice assistant for kids", le MEMORY_SYSTEM.md parle d'enfants et de parents, mais le README et la Roadmap parlent d'un compagnon adulte pro avec contrôle du navigateur, agents web, filesystem... Tu as deux produits dans un seul repo.
Choix à faire (vision claire) :
Option A — Compagnon Personnel AdulteOption B — Assistant Éducatif EnfantAgent desktop autonomeLimites parentales strictesSkills pro (calendar, code, web)Skills pédagogiques (quiz, histoire, dessin)Mémoire de vie longue duréeMémoire courte sécurisée COPPA/RGPDMonétisation B2C premiumMonétisation via établissements
Si tu vises le compagnon adulte (ce que l'architecture suggère), supprime toutes les références enfants/childName/child et repositionne clairement : "NeuroChat — votre second cerveau vocal, local et privé."
Roadmap manquante mais critique :

Chiffrement at-rest de SQLite (SQLCipher) — les conversations sont en clair
Export/Import de la mémoire (portabilité)
Mode hors-ligne total (embeddings locaux via ONNX plutôt que Gemini API)
Plugin/extension système (tray icon, raccourcis globaux)


3. System Prompt — Réécriture Pro
Problème principal actuel : Le prompt actuel (dans systemPrompt.ts) est construit dynamiquement mais de façon monolithique. Il mélange personnalité, mémoire, état émotionnel, instructions browser, et commandes agent dans un seul bloc. Gemini Live a un contexte limité et ça pollue la qualité des réponses vocales.
Structure recommandée — séparer en couches :
LAYER 1 — IDENTITY (immuable, ~200 tokens)
LAYER 2 — BEHAVIORAL CONTEXT (rituel du moment, émotion, ~100 tokens)
LAYER 3 — MEMORY INJECTION (RAG dynamique, top-3 pertinents, ~300 tokens max)
LAYER 4 — ACTIVE CAPABILITIES (uniquement les skills activés dans cette session)
LAYER 5 — CURRENT TASK CONTEXT (si agent actif, sinon vide)
Prompt Layer 1 rewrite (exemple) :
Tu es NeuroChat, un assistant personnel vocal qui vit sur l'ordinateur de [userName].
Tu n'es PAS un chatbot générique — tu es un compagnon persistant avec une mémoire de vie.

RÈGLES FONDAMENTALES :
- Réponds TOUJOURS en moins de 3 phrases à l'oral. Tu peux développer si demandé.
- Tu as accès à la mémoire des conversations passées. Utilise-la naturellement, sans dire "je me souviens que tu m'as dit".
- Si tu dois exécuter une action système, émets UNIQUEMENT le tag JSON structuré, rien d'autre dans cette réponse.
- Langue : adapte-toi à la langue de l'utilisateur. Par défaut : français.
- Tu exprimes une personnalité constante : curieux, direct, légèrement sarcastique si taquiné, toujours bienveillant.
Amélioration critique du parsing agent :
Actuellement tu fais fullText.toLowerCase().includes("tool:") — c'est cassé dès que Gemini reformule. Remplace par une tool call structurée dans la config Gemini :
typescript// Dans useAIConversation.ts, config Gemini Live
tools: [{
  functionDeclarations: [
    {
      name: "execute_skill",
      description: "Exécuter une compétence système",
      parameters: {
        type: "object",
        properties: {
          skill_id: { type: "string", enum: ["web_search", "read_file", "navigate", ...] },
          params: { type: "object" }
        }
      }
    }
  ]
}]
Gemini Live supporte les function calls — utilise-les plutôt que de parser du texte libre.

Priorités concrètes (ordre recommandé)
Semaine 1 — Stabilité

Corriger la CSP globale dans main.cjs (sécurité critique)
Résoudre le ReferenceError: Cannot access 'ah' (dépendance circulaire)
Passer la détection tool: aux function calls Gemini

Semaine 2 — Vision

Choisir et documenter la cible utilisateur (adulte vs enfant)
Nettoyer les incohérences de la codebase (metadata.json, MEMORY_SYSTEM.md)
Ajouter SQLCipher pour chiffrement at-rest

Semaine 3 — Skills

Implémenter le skill manifest typé
Ajouter skill:notify, skill:clipboard, skill:screenshot_analyze
Réécrire le system prompt en 5 couches séparées

Semaine 4 — Qualité

Tests E2E Playwright sur les flows critiques (session start/stop, agent task)
Mode debug désactivable en prod (VITE_DEBUG)
Sentry ou Highlight pour monitoring des erreurs Electron