/**
 * Skills pour la gestion du système de fichiers local
 */

import { SkillDefinition, SkillContext } from "../types";

// Extension de l'objet window pour TypeScript
declare global {
  interface Window {
    neurochatElectron?: {
      isElectron: boolean;
      fs: {
        listDir: (path: string) => Promise<any[]>;
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<boolean>;
        deleteItem: (path: string) => Promise<boolean>;
        mkdir: (path: string) => Promise<boolean>;
        exists: (path: string) => Promise<boolean>;
        getStats: (path: string) => Promise<any>;
      };
      dialog: {
        showOpenDialog: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
      };
      db?: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        loadVectors: (userName?: string) => Promise<any[]>;
        addVector: (entry: any) => Promise<boolean>;
        clearVectors: (userName?: string) => Promise<boolean>;
      };
    };
  }
}

/**
 * Skill: Sélectionner un dossier de travail
 */
export const pickWorkdirSkill: SkillDefinition<{ title?: string }, { path: string | null }> = {
  name: "pick_workdir",
  description: "Ouvre une boîte de dialogue pour permettre à l'utilisateur de sélectionner un dossier de travail sur son PC.",
  category: "system",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titre de la boîte de dialogue" }
    }
  },
  permissions: [{ resource: "dialog", level: "execute" }],
  riskLevel: "low",
  requiresConfirmation: true,
  execute: async (params) => {
    if (!window.neurochatElectron) {
      throw new Error("Cette fonctionnalité n'est disponible que dans l'application Desktop.");
    }
    const result = await window.neurochatElectron.dialog.showOpenDialog({
      title: params.title || "Sélectionner un dossier de travail",
      properties: ["openDirectory"]
    });
    return { path: result.canceled ? null : result.filePaths[0] };
  }
};

/**
 * Skill: Lister les fichiers d'un dossier
 */
export const listFilesSkill: SkillDefinition<{ path: string }, any[]> = {
  name: "list_files",
  description: "Liste le contenu d'un dossier spécifié sur le PC.",
  category: "system",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Chemin absolu du dossier" }
    },
    required: ["path"]
  },
  permissions: [{ resource: "filesystem", level: "read" }],
  riskLevel: "low",
  execute: async (params) => {
    if (!window.neurochatElectron) throw new Error("Desktop mode required");
    return await window.neurochatElectron.fs.listDir(params.path);
  }
};

/**
 * Skill: Lire un fichier
 */
export const readFileSkill: SkillDefinition<{ path: string }, string> = {
  name: "read_file",
  description: "Lit le contenu textuel d'un fichier sur le PC.",
  category: "system",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Chemin absolu du fichier" }
    },
    required: ["path"]
  },
  permissions: [{ resource: "filesystem", level: "read" }],
  riskLevel: "low",
  execute: async (params) => {
    if (!window.neurochatElectron) throw new Error("Desktop mode required");
    return await window.neurochatElectron.fs.readFile(params.path);
  }
};

/**
 * Skill: Écrire dans un fichier
 */
export const writeFileSkill: SkillDefinition<{ path: string; content: string }, boolean> = {
  name: "write_file",
  description: "Crée ou modifie un fichier avec le contenu spécifié.",
  category: "system",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Chemin absolu du fichier" },
      content: { type: "string", description: "Contenu à écrire" }
    },
    required: ["path", "content"]
  },
  permissions: [{ resource: "filesystem", level: "write" }],
  riskLevel: "medium",
  requiresConfirmation: true,
  execute: async (params) => {
    if (!window.neurochatElectron) throw new Error("Desktop mode required");
    return await window.neurochatElectron.fs.writeFile(params.path, params.content);
  }
};

/**
 * Skill: Supprimer un élément
 */
export const deleteItemSkill: SkillDefinition<{ path: string }, boolean> = {
  name: "delete_file",
  description: "Supprime définitivement un fichier ou un dossier du PC.",
  category: "system",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Chemin absolu de l'élément à supprimer" }
    },
    required: ["path"]
  },
  permissions: [{ resource: "filesystem", level: "write" }],
  riskLevel: "high",
  requiresConfirmation: true,
  execute: async (params) => {
    if (!window.neurochatElectron) throw new Error("Desktop mode required");
    return await window.neurochatElectron.fs.deleteItem(params.path);
  }
};
