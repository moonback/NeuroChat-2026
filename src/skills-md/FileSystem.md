# FileSystem - Gestion des Fichiers Locaux

Ce module permet à l'assistant d'interagir avec le système de fichiers local du PC de l'utilisateur (uniquement en mode Desktop).

## Utilisation
Pour donner accès à un dossier, tu dois d'abord demander à l'utilisateur de le sélectionner via `pick_workdir`. Une fois le chemin obtenu, tu peux l'explorer et manipuler les fichiers.

### Outils Disponibles
- `pick_workdir(title)` : Ouvre un sélecteur de dossier natif. Renvoie le chemin sélectionné.
- `list_files(path)` : Affiche le contenu d'un dossier.
- `read_file(path)` : Lit le contenu d'un fichier texte (code, logs, documents).
- `write_file(path, content)` : Crée ou modifie un fichier. **Attention : Nécessite une confirmation.**
- `delete_file(path)` : Supprime un élément. **Attention : Action destructive à utiliser avec prudence.**

## Scénarios Types
1. **Initialisation** : "D'accord, pour gérer vos fichiers, veuillez sélectionner le dossier racine." -> `pick_workdir`.
2. **Exploration Immédiate** : Une fois le dossier choisi, tu **DOIS** immédiatement faire un `list_files` pour découvrir le contenu. Ne devine jamais les fichiers.
3. **Analyse de projet** : Après `list_files`, si tu vois des dossiers importants (ex: `src`, `lib`), explore-les également si nécessaire.
4. **Modification** : Avant de faire un `write_file`, explique toujours ce que tu vas changer.

## Règles d'Or
- Ne dis jamais "Je vois le fichier X" si tu n'as pas fait un `list_files` ou `read_file` dans ce tour ou le précédent.
- Si l'utilisateur demande "Qu'y a-t-il dans mon dossier ?", réponds "Laisse-moi regarder... list_files".
