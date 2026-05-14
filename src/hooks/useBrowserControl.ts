/**
 * Hook React pour le contrôle du navigateur par l'assistant
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  BrowserController,
  BrowserAction,
  BrowserActionResult,
  parseNaturalLanguageCommand,
} from "../lib/browserControl";

export interface BrowserControlState {
  isEnabled: boolean;
  currentAction: BrowserAction | null;
  lastResult: BrowserActionResult | null;
  pendingConfirmation: BrowserAction | null;
  actionHistory: BrowserAction[];
  browserWindowOpen: boolean;
  currentUrl: string;
}

export function useBrowserControl() {
  const [state, setState] = useState<BrowserControlState>({
    isEnabled: false,
    currentAction: null,
    lastResult: null,
    pendingConfirmation: null,
    actionHistory: [],
    browserWindowOpen: false,
    currentUrl: "",
  });

  const controllerRef = useRef<BrowserController | null>(null);
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  // Initialiser le contrôleur
  useEffect(() => {
    if (state.isEnabled && !controllerRef.current) {
      controllerRef.current = new BrowserController(async (action) => {
        // Demander confirmation à l'utilisateur
        return new Promise<boolean>((resolve) => {
          setState((prev) => ({
            ...prev,
            pendingConfirmation: action,
          }));
          confirmationResolverRef.current = resolve;
        });
      });
    }
  }, [state.isEnabled]);

  /**
   * Active ou désactive le contrôle du navigateur
   */
  const toggleBrowserControl = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      isEnabled: enabled,
    }));
  }, []);

  /**
   * Ouvre la fenêtre du navigateur intégré
   */
  const openBrowserWindow = useCallback((url?: string) => {
    setState((prev) => ({
      ...prev,
      browserWindowOpen: true,
      currentUrl: url || prev.currentUrl,
    }));
  }, []);

  /**
   * Ferme la fenêtre du navigateur intégré
   */
  const closeBrowserWindow = useCallback(() => {
    setState((prev) => ({
      ...prev,
      browserWindowOpen: false,
    }));
  }, []);

  /**
   * Navigue vers une URL dans la fenêtre intégrée
   */
  const navigateInBrowser = useCallback((url: string) => {
    setState((prev) => ({
      ...prev,
      currentUrl: url,
      browserWindowOpen: true,
    }));
  }, []);

  /**
   * Exécute une action sur le navigateur
   */
  const executeAction = useCallback(
    async (action: BrowserAction): Promise<BrowserActionResult> => {
      if (!controllerRef.current) {
        return {
          success: false,
          error: "Le contrôle du navigateur n'est pas activé",
        };
      }

      setState((prev) => ({
        ...prev,
        currentAction: action,
      }));

      // Si c'est une navigation, ouvrir la fenêtre intégrée
      if (action.type === "navigate" && action.params?.url) {
        navigateInBrowser(action.params.url);
        
        setState((prev) => ({
          ...prev,
          currentAction: null,
          lastResult: { success: true, data: { navigated: true, url: action.params?.url } },
          actionHistory: [...prev.actionHistory, action].slice(-20),
        }));

        return { success: true, data: { navigated: true, url: action.params.url } };
      }

      const result = await controllerRef.current.executeAction(action);

      setState((prev) => ({
        ...prev,
        currentAction: null,
        lastResult: result,
        actionHistory: [...prev.actionHistory, action].slice(-20),
      }));

      return result;
    },
    [navigateInBrowser]
  );

  /**
   * Exécute une commande en langage naturel
   */
  const executeNaturalCommand = useCallback(
    async (command: string): Promise<BrowserActionResult> => {
      const action = parseNaturalLanguageCommand(command);
      
      if (!action) {
        return {
          success: false,
          error: "Je n'ai pas compris cette commande",
        };
      }

      return executeAction(action);
    },
    [executeAction]
  );

  /**
   * Confirme ou refuse une action en attente
   */
  const respondToConfirmation = useCallback((confirmed: boolean) => {
    if (confirmationResolverRef.current) {
      confirmationResolverRef.current(confirmed);
      confirmationResolverRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      pendingConfirmation: null,
    }));
  }, []);

  /**
   * Obtient le contexte de la page actuelle pour l'assistant
   */
  const getPageContext = useCallback(async (): Promise<string> => {
    if (!controllerRef.current) {
      return "Le contrôle du navigateur n'est pas activé.";
    }

    const result = await controllerRef.current.executeAction({
      type: "extract",
    });

    if (!result.success || !result.data) {
      return "Impossible d'extraire le contexte de la page.";
    }

    const { title, url, headings, links, forms } = result.data;

    let context = `Page actuelle: ${title}\nURL: ${url}\n\n`;

    if (headings && headings.length > 0) {
      context += `Titres principaux:\n${headings.slice(0, 5).join("\n")}\n\n`;
    }

    if (links && links.length > 0) {
      context += `Liens disponibles (${links.length} au total):\n`;
      context += links
        .slice(0, 10)
        .map((link: any) => `- ${link.text}: ${link.href}`)
        .join("\n");
      context += "\n\n";
    }

    if (forms && forms.length > 0) {
      context += `Formulaires disponibles:\n`;
      context += forms
        .map(
          (form: any, i: number) =>
            `Formulaire ${i + 1}: ${form.method.toUpperCase()} vers ${form.action}\nChamps: ${form.fields.join(", ")}`
        )
        .join("\n\n");
    }

    return context;
  }, []);

  /**
   * Efface l'historique des actions
   */
  const clearHistory = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.clearHistory();
    }
    setState((prev) => ({
      ...prev,
      actionHistory: [],
      lastResult: null,
    }));
  }, []);

  return {
    ...state,
    toggleBrowserControl,
    executeAction,
    executeNaturalCommand,
    respondToConfirmation,
    getPageContext,
    clearHistory,
    openBrowserWindow,
    closeBrowserWindow,
    navigateInBrowser,
  };
}
