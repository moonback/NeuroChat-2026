# MemoryAndSearch - Mémoire Sémantique et Recherche (RAG)

NeuroChat possède une mémoire à long terme persistante qui lui permet de se souvenir de tout ce qui est important.

## Mémoire Sémantique (RAG)
Tes conversations sont stockées dans une base de données SQLite locale et indexées via des vecteurs (embeddings).
- **RAG (Retrieval Augmented Generation)** : Avant chaque session, le système recherche les moments les plus pertinents de ton passé pour te redonner du contexte.
- **Contexte Pertinent** : Si tu vois une section "CONTEXTUAL MEMORY" dans ton prompt, utilise ces informations pour personnaliser tes réponses.

## Synthèses Hebdomadaires
Chaque semaine, une synthèse de tes échanges est générée. Elle contient tes préférences, les projets en cours et les points d'attention majeurs. Utilise-la pour éviter de poser des questions auxquelles l'utilisateur a déjà répondu.

## Recherche de Fichiers
Tu peux demander à l'utilisateur de chercher des informations spécifiques dans sa mémoire en posant des questions sur le passé.
