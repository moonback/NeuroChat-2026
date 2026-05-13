# Schéma de Base de Données 🗄️

> **⚠️ AVERTISSEMENT MVP :** 
> L'application a été initialement construite en mode "Serverless" et entièrement cliente (Direct to Gemini). Ce fichier modélise la structure de données via **Supabase (PostgreSQL)** à venir, comme stipulé dans la Roadmap (V1 / V2). L'application MVP en fonctionnement ne l'utilise pas encore.

Une fois branchée à **Supabase**, voici la structure d'organisation relationnelle imaginée.

## 📋 Tables de la base (PostgreSQL)

### 1. Table `profiles`
Stocke les données parentales ou le compte global de la famille.
Étendu de la table système `auth.users` de Supabase.

| Colonne | Type | Propriétés | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, References `auth.users.id` | Identifiant du profil |
| `created_at` | `timestamptz` | default `now()` | Date de création |
| `full_name` | `text` | non null | Nom d'affichage ou rôle (ex: Parent) |
| `subscription_plan` | `text` | default `free` | Niveau du compte |

### 2. Table `children`
La gestion des multiples profils enfants au sein d'un compte parent.

| Colonne | Type | Propriétés | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, Default `uuid_generate_v4()` | Identifiant unique de l'enfant |
| `parent_id` | `uuid` | References `profiles.id` | Lier au compte qui détient l'avatar |
| `name` | `text` | non null | Prénom de l'enfant |
| `age` | `integer` | nullable | Âge pour adapter le ton de l'IA |
| `avatar_theme` | `text` | default `'robot'` | Thème de l'avatar UI |

### 3. Table `sessions`
Chaque appel WebSocket à l'IA représente une session. Cela permet aux parents d'avoir des statistiques de durée.

| Colonne | Type | Propriétés | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK | Identifiant de la session de log |
| `child_id` | `uuid` | References `children.id` | Quel enfant a parlé |
| `started_at` | `timestamptz` | non null | Début d'écoute |
| `ended_at` | `timestamptz` | nullable | Fin d'écoute |
| `duration_sec` | `integer` | nullable | Temps calculé dynamiquement |

### 4. Table `transcripts` (Optionnelle - Soumise au RGPD)
Si l'option "Sytème de Résumé" est activée, l'app enverra la synthèse textuelle pour des parents curieux.

| Colonne | Type | Propriétés | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK | ID du message texte |
| `session_id` | `uuid` | References `sessions.id` | Relié à la session |
| `role` | `enum('user', 'ai')` | non null | Qui a parlé |
| `content` | `text` | non null | Le texte transcrit de l'audio |
| `created_at` | `timestamptz` | default `now()` | Date et heure de la réplique |

## 🔒 Row Level Security (RLS)

Avec Supabase, les politiques RLS sécurisent la base au plus près des tables, ce qui est vitale pour des données liées à des enfants.

- **Politique Profiles** : `SELECT, UPDATE USING (auth.uid() = id)`
- **Politique Children** : `ALL USING (auth.uid() = parent_id)`
- **Politique Sessions** : `ALL USING (auth.uid() IN (SELECT parent_id FROM children WHERE children.id = child_id))`

*Seul le parent authentifié peut écrire et lire les informations appartenant à ses `children` et ses `sessions` associées.*
