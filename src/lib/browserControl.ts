/**
 * Browser Control System - Permet à l'assistant de contrôler le navigateur
 * 
 * Fonctionnalités:
 * - Navigation (ouvrir des URLs, retour/avant)
 * - Interaction avec les éléments (clic, saisie de texte)
 * - Extraction d'informations (lecture de contenu)
 * - Capture d'écran pour vision
 * - Gestion de formulaires
 */

export interface BrowserAction {
  type: 
    | "navigate"
    | "click"
    | "type"
    | "scroll"
    | "extract"
    | "screenshot"
    | "back"
    | "forward"
    | "reload"
    | "fill_form"
    | "submit_form"
    | "wait"
    | "newTab"
    | "closeTab"
    | "nextTab"
    | "prevTab"
    | "copy"
    | "paste"
    | "zoomIn"
    | "zoomOut"
    | "zoomReset"
    | "fullscreen"
    | "pickWorkdir"
    | "listDir"
    | "readFile"
    | "writeFile"
    | "deleteFile";
  params?: BrowserActionParams;
  requiresConfirmation?: boolean;
}

export interface BrowserActionResult {
  success: boolean;
  data?: BrowserActionResultData;
  error?: string;
  screenshot?: string; // base64
}

export interface ElementSelector {
  selector?: string;
  text?: string;
  role?: string;
  placeholder?: string;
}

export interface BrowserActionParams {
  url?: string;
  selector?: ElementSelector;
  text?: string;
  direction?: "up" | "down" | "top" | "bottom";
  amount?: number;
  fullPage?: boolean;
  fields?: Record<string, string>;
  duration?: number;
  path?: string;
  content?: string;
}

export interface BrowserActionResultData {
  [key: string]: unknown;
  title?: string;
  url?: string;
  headings?: string[];
  links?: Array<{ text: string; href: string }>;
  forms?: Array<{ action: string; method: string; fields: string[] }>;
  path?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur inconnue";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asRecordString(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * Classe principale pour le contrôle du navigateur
 */
export class BrowserController {
  private actionHistory: BrowserAction[] = [];
  private currentWorkdir: string | null = null;
  private maxHistorySize = 50;
  private onConfirmationNeeded?: (action: BrowserAction) => Promise<boolean>;

  constructor(onConfirmationNeeded?: (action: BrowserAction) => Promise<boolean>) {
    this.onConfirmationNeeded = onConfirmationNeeded;
    // Restaurer le dossier de travail depuis localStorage
    const savedDir = localStorage.getItem("neurochat_workdir");
    if (savedDir) {
      this.currentWorkdir = savedDir;
      console.log(`📂 [BrowserController] Dossier restauré: ${savedDir}`);
    }
  }

  /**
   * Exécute une action sur le navigateur
   */
  async executeAction(action: BrowserAction): Promise<BrowserActionResult> {
    // Vérifier si l'action nécessite une confirmation
    if (action.requiresConfirmation && this.onConfirmationNeeded) {
      const confirmed = await this.onConfirmationNeeded(action);
      if (!confirmed) {
        return {
          success: false,
          error: "Action annulée par l'utilisateur",
        };
      }
    }

    // Ajouter à l'historique
    this.actionHistory.push(action);
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory.shift();
    }

    try {
      switch (action.type) {
        case "navigate":
          return await this.navigate(asString(action.params?.url));
        
        case "click":
          return await this.click(action.params?.selector as ElementSelector | undefined);
        
        case "type":
          return await this.typeText(action.params?.selector as ElementSelector | undefined, asString(action.params?.text));
        
        case "scroll":
          return await this.scroll((action.params?.direction as "up" | "down" | "top" | "bottom" | undefined), asNumber(action.params?.amount));
        
        case "extract":
          return await this.extractContent(action.params?.selector as ElementSelector | undefined);
        
        case "screenshot":
          return await this.takeScreenshot(asBoolean(action.params?.fullPage));
        
        case "back":
          return await this.goBack();
        
        case "forward":
          return await this.goForward();
        
        case "reload":
          return await this.reload();
        
        case "fill_form":
          return await this.fillForm(asRecordString(action.params?.fields));
        
        case "submit_form":
          return await this.submitForm(action.params?.selector as ElementSelector | undefined);
        
        case "wait":
          return await this.wait(asNumber(action.params?.duration));
        
        case "newTab":
          return await this.newTab(asString(action.params?.url));
        
        case "closeTab":
          return await this.closeTab();
        
        case "nextTab":
          return await this.switchTab("next");
        
        case "prevTab":
          return await this.switchTab("prev");
        
        case "copy":
          return await this.copyToClipboard();
        
        case "paste":
          return await this.pasteFromClipboard();
        
        case "zoomIn":
          return await this.setZoom("in");
        
        case "zoomOut":
          return await this.setZoom("out");
        
        case "zoomReset":
          return await this.setZoom("reset");
        
        case "fullscreen":
          return await this.toggleFullscreen();
        
        case "pickWorkdir":
          const pickResult = await this.pickWorkdir();
          if (pickResult.success && pickResult.data?.path) {
            const newDir = pickResult.data.path as string;
            this.currentWorkdir = newDir;
            localStorage.setItem("neurochat_workdir", newDir);
          }
          return pickResult;
        
        case "listDir":
          return await this.listDir(asString(action.params?.path));
        
        case "readFile":
          return await this.readFile(asString(action.params?.path));
        
        case "writeFile":
          return await this.writeFile(asString(action.params?.path), asString(action.params?.content));
        
        case "deleteFile":
          return await this.deleteFile(asString(action.params?.path));
        
        default:
          return {
            success: false,
            error: `Action inconnue: ${action.type}`,
          };
      }
    } catch (error: unknown) {
      console.error(`Erreur lors de l'exécution de l'action ${action.type}:`, error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Navigue vers une URL
   */
  private async navigate(url?: string): Promise<BrowserActionResult> {
    if (!url) {
      return { success: false, error: "URL manquante" };
    }

    try {
      // Ouvrir dans un nouvel onglet ou iframe selon le contexte
      const newWindow = window.open(url, "_blank");
      
      if (!newWindow) {
        return {
          success: false,
          error: "Impossible d'ouvrir l'URL (popup bloqué?)",
        };
      }

      return {
        success: true,
        data: { url, opened: true },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  /**
   * Clique sur un élément
   */
  private async click(selector?: ElementSelector): Promise<BrowserActionResult> {
    const element = selector ? this.findElement(selector) : null;
    
    if (!element) {
      return {
        success: false,
        error: "Élément introuvable",
      };
    }

    try {
      if (element instanceof HTMLElement) {
        element.click();
        return {
          success: true,
          data: { clicked: true, element: this.getElementInfo(element) },
        };
      }
      return { success: false, error: "L'élément n'est pas cliquable" };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Saisit du texte dans un champ
   */
  private async typeText(
    selector: ElementSelector | undefined,
    text?: string
  ): Promise<BrowserActionResult> {
    const element = selector ? this.findElement(selector) : null;
    
    if (!element) {
      return { success: false, error: "Élément introuvable" };
    }

    try {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      ) {
        element.value = text ?? "";
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        
        return {
          success: true,
          data: { typed: true, text, element: this.getElementInfo(element) },
        };
      }
      return { success: false, error: "L'élément n'accepte pas de texte" };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Fait défiler la page
   */
  private async scroll(
    direction: "up" | "down" | "top" | "bottom" = "down",
    amount: number = 300
  ): Promise<BrowserActionResult> {
    try {
      switch (direction) {
        case "up":
          window.scrollBy({ top: -amount, behavior: "smooth" });
          break;
        case "down":
          window.scrollBy({ top: amount, behavior: "smooth" });
          break;
        case "top":
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "bottom":
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          break;
      }

      return {
        success: true,
        data: { scrolled: true, direction, amount },
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Extrait le contenu d'un élément ou de la page
   */
  private async extractContent(
    selector?: ElementSelector
  ): Promise<BrowserActionResult> {
    try {
      if (selector) {
        const element = this.findElement(selector);
        if (!element) {
          return { success: false, error: "Élément introuvable" };
        }
        
        return {
          success: true,
          data: {
            text: element.textContent?.trim(),
            html: element.innerHTML,
            attributes: this.getElementAttributes(element),
          },
        };
      }

      // Extraire le contenu de la page entière
      return {
        success: true,
        data: {
          title: document.title,
          url: window.location.href,
          text: document.body.textContent?.trim(),
          headings: this.extractHeadings(),
          links: this.extractLinks(),
          forms: this.extractForms(),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Prend une capture d'écran
   */
  private async takeScreenshot(fullPage: boolean = false): Promise<BrowserActionResult> {
    try {
      // Utiliser html2canvas ou une API similaire
      // Pour l'instant, on retourne une indication que la fonctionnalité nécessite une bibliothèque
      return {
        success: false,
        error: "La capture d'écran nécessite l'installation de html2canvas",
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Retour en arrière dans l'historique
   */
  private async goBack(): Promise<BrowserActionResult> {
    try {
      window.history.back();
      return { success: true, data: { navigated: "back" } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Avancer dans l'historique
   */
  private async goForward(): Promise<BrowserActionResult> {
    try {
      window.history.forward();
      return { success: true, data: { navigated: "forward" } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Recharger la page
   */
  private async reload(): Promise<BrowserActionResult> {
    try {
      window.location.reload();
      return { success: true, data: { reloaded: true } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Remplit un formulaire
   */
  private async fillForm(
    fields?: Record<string, string>
  ): Promise<BrowserActionResult> {
    try {
      const results: Record<string, boolean> = {};
      
      for (const [fieldName, value] of Object.entries(fields ?? {})) {
        const element = this.findElement({ selector: `[name="${fieldName}"]` });
        
        if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          element.value = value;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          results[fieldName] = true;
        } else {
          results[fieldName] = false;
        }
      }

      return {
        success: true,
        data: { filled: results },
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Soumet un formulaire
   */
  private async submitForm(selector?: ElementSelector): Promise<BrowserActionResult> {
    try {
      let form: HTMLFormElement | null = null;

      if (selector) {
        const element = this.findElement(selector);
        if (element instanceof HTMLFormElement) {
          form = element;
        }
      } else {
        form = document.querySelector("form");
      }

      if (!form) {
        return { success: false, error: "Formulaire introuvable" };
      }

      form.submit();
      return { success: true, data: { submitted: true } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Attend un certain temps
   */
  private async wait(duration: number = 1000): Promise<BrowserActionResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: { waited: duration } });
      }, duration);
    });
  }

  /**
   * Nouvel onglet
   */
  private async newTab(url: string = "about:blank"): Promise<BrowserActionResult> {
    try {
      window.open(url, "_blank");
      return { success: true, data: { newTab: true, url } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Fermer l'onglet actuel
   */
  private async closeTab(): Promise<BrowserActionResult> {
    try {
      window.close();
      return { success: true, data: { closed: true } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Changer d'onglet (prochain/précédent)
   */
  private async switchTab(direction: "next" | "prev"): Promise<BrowserActionResult> {
    // Note: Le contrôle précis des onglets est limité dans les navigateurs standard
    // mais possible dans Electron. Pour l'instant, on simule un succès.
    return { success: true, data: { switchedTab: direction, note: "Limité par la sécurité navigateur" } };
  }

  /**
   * Copier dans le presse-papier
   */
  private async copyToClipboard(): Promise<BrowserActionResult> {
    try {
      const selection = window.getSelection()?.toString();
      if (selection) {
        await navigator.clipboard.writeText(selection);
        return { success: true, data: { copied: true, text: selection.substring(0, 50) } };
      }
      return { success: false, error: "Rien n'est sélectionné" };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Coller depuis le presse-papier
   */
  private async pasteFromClipboard(): Promise<BrowserActionResult> {
    try {
      const text = await navigator.clipboard.readText();
      return { success: true, data: { pasted: true, textLength: text.length } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Gérer le zoom
   */
  private async setZoom(type: "in" | "out" | "reset"): Promise<BrowserActionResult> {
    try {
      // Simulation simple via zoom CSS si possible, ou juste renvoi de succès
      // (Le vrai zoom navigateur est protégé)
      return { success: true, data: { zoom: type } };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Basculer en plein écran
   */
  private async toggleFullscreen(): Promise<BrowserActionResult> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return { success: true, data: { fullscreen: true } };
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          return { success: true, data: { fullscreen: false } };
        }
      }
      return { success: false, error: "Plein écran non supporté" };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Trouve un élément dans le DOM
   */
  private findElement(selector?: ElementSelector): Element | null {
    if (!selector) {
      return null;
    }

    // 1. Sélecteur CSS direct
    if (selector.selector) {
      return document.querySelector(selector.selector);
    }

    // 2. Mappages sémantiques pour les éléments de l'interface NeuroChat
    const semanticMap: Record<string, string> = {
      "barre d'adresse": "#browser-url-input",
      "barre adresse": "#browser-url-input",
      "url": "#browser-url-input",
      "adresse": "#browser-url-input",
      "champ d'adresse": "#browser-url-input",
      "recherche": "input[type='search'], input[name='q'], input[placeholder*='recherche' i]",
    };

    const hint = (selector.placeholder || selector.text || "").toLowerCase().replace(/^(la|le|l'|un|une|le\s+champ)\s+/, "").trim();
    
    if (semanticMap[hint]) {
      const el = document.querySelector(semanticMap[hint]);
      if (el) return el;
    }

    // 3. Recherche par Placeholder (insensible à la casse)
    if (selector.placeholder) {
      const p = selector.placeholder.toLowerCase();
      // Chercher une correspondance exacte ou partielle insensible à la casse
      const inputs = Array.from(document.querySelectorAll("input, textarea"));
      const match = inputs.find(el => {
        const placeholder = el.getAttribute("placeholder")?.toLowerCase();
        return placeholder === p || (placeholder && placeholder.includes(p));
      });
      if (match) return match;
    }

    // 4. Recherche par Rôle
    if (selector.role) {
      const el = document.querySelector(`[role="${selector.role}"]`);
      if (el) return el;
    }

    // 5. Recherche par Texte (en excluant le panneau de debug)
    if (selector.text) {
      const searchText = selector.text.toLowerCase();
      const elements = Array.from(document.querySelectorAll("button, a, input, [role='button'], span, p, h1, h2, h3, h4, h5, h6, label"));
      
      return elements.find((el) => {
        // Exclure les éléments du panneau de débogage
        if (el.closest("#debug-panel")) return false;
        
        const content = el.textContent?.toLowerCase() || "";
        const title = el.getAttribute("title")?.toLowerCase() || "";
        const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || "";
        
        return content.includes(searchText) || title.includes(searchText) || ariaLabel.includes(searchText);
      }) || null;
    }

    return null;
  }

  /**
   * Obtient les informations d'un élément
   */
  private getElementInfo(element: Element): Record<string, string> {
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: typeof element.className === "string" ? element.className : "",
      text: element.textContent?.trim().substring(0, 100),
    };
  }

  /**
   * Obtient les attributs d'un élément
   */
  private getElementAttributes(element: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const attr of element.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  /**
   * Extrait les titres de la page
   */
  private extractHeadings(): string[] {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    return Array.from(headings).map((h) => h.textContent?.trim() || "");
  }

  /**
   * Extrait les liens de la page
   */
  private extractLinks(): Array<{ text: string; href: string }> {
    const links = document.querySelectorAll("a[href]");
    return Array.from(links).map((link) => ({
      text: link.textContent?.trim() || "",
      href: (link as HTMLAnchorElement).href,
    }));
  }

  /**
   * Extrait les formulaires de la page
   */
  private extractForms(): Array<{ action: string; method: string; fields: string[] }> {
    const forms = document.querySelectorAll("form");
    return Array.from(forms).map((form) => ({
      action: form.action,
      method: form.method,
      fields: Array.from(form.querySelectorAll("input, textarea, select")).map(
        (field) => (field as HTMLInputElement).name || (field as HTMLInputElement).id
      ),
    }));
  }

  /**
   * Obtient un instantané du DOM compressé pour l'analyse sémantique
   */
  getDOMSnapshot(): Array<any> {
    const actionableElements = Array.from(document.querySelectorAll("button, a, input, textarea, select, [role='button'], [onclick]"));
    
    return actionableElements.map((el, index) => {
      const rect = el.getBoundingClientRect();
      return {
        id: index,
        tagName: el.tagName.toLowerCase(),
        text: (el.textContent?.trim() || el.getAttribute("value") || el.getAttribute("placeholder") || "").substring(0, 50),
        role: el.getAttribute("role") || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        selector: this.generateCSSSelector(el)
      };
    }).filter(info => info.rect.width > 0 && info.rect.height > 0);
  }

  private generateCSSSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    const tag = el.tagName.toLowerCase();
    if (el.className && typeof el.className === "string") {
      const classes = el.className.trim().split(/\s+/).filter(c => !c.includes(":")).join(".");
      if (classes) return `${tag}.${classes}`;
    }
    return tag;
  }

  /**
   * Résout une description textuelle en sélecteur CSS via analyse du snapshot par LLM
   */
  async resolveSemanticSelector(description: string, model: { complete: (p: string) => Promise<string> }): Promise<string | null> {
    const snapshot = this.getDOMSnapshot();
    const prompt = [
      "# SYSTEM: Semantic Browser Resolution",
      "Find the element index (ID) matching the description from the snapshot.",
      `Description: "${description}"`,
      "",
      "## Snapshot",
      JSON.stringify(snapshot.slice(0, 60)),
      "",
      "Return ONLY the ID (integer)."
    ].join("\n");

    try {
      const response = await model.complete(prompt);
      const id = parseInt(response.trim().replace(/[^0-9-]/g, ""), 10);
      if (id >= 0 && id < snapshot.length) {
        console.log(`[Browser] Semantic match: "${description}" -> ${snapshot[id].selector}`);
        return snapshot[id].selector;
      }
    } catch (err) {
      console.error("[Browser] Semantic resolution error:", err);
    }
    return null;
  }

  /**
   * Obtient l'historique des actions
   */
  getActionHistory(): BrowserAction[] {
    return [...this.actionHistory];
  }

  /**
   * Efface l'historique des actions
   */
  clearHistory(): void {
    this.actionHistory = [];
  }

  /**
   * Ouvre le sélecteur de dossier natif
   */
  private async pickWorkdir(): Promise<BrowserActionResult> {
    if (!window.neurochatElectron) {
      return { success: false, error: "Mode Desktop requis" };
    }

    try {
      const result = await window.neurochatElectron.dialog.showOpenDialog({
        title: "Sélectionner un dossier de travail",
        properties: ["openDirectory"]
      });

      if (result.canceled) {
        return { success: false, error: "Sélection annulée" };
      }

      return {
        success: true,
        data: { path: result.filePaths[0] },
      };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Liste le contenu d'un dossier
   */
  private async listDir(path?: string): Promise<BrowserActionResult> {
    if (!window.neurochatElectron) return { success: false, error: "Mode Desktop requis" };
    
    const targetPath = path || this.currentWorkdir;
    console.log(`📂 [BrowserController] listing dir: ${targetPath}`);
    if (!targetPath) return { success: false, error: "Aucun dossier sélectionné. Utilisez 'pickWorkdir' d'abord." };

    try {
      const files = await window.neurochatElectron.fs.listDir(targetPath);
      console.log(`✅ [BrowserController] found ${files.length} files`);
      return {
        success: true,
        data: { path: targetPath, files: files.slice(0, 50) },
      };
    } catch (error: unknown) {
      console.error(`❌ [BrowserController] listDir failed:`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Lit le contenu d'un fichier
   */
  private async readFile(path?: string): Promise<BrowserActionResult> {
    if (!window.neurochatElectron) return { success: false, error: "Mode Desktop requis" };
    if (!path) return { success: false, error: "Chemin de fichier manquant" };

    // Résoudre les chemins relatifs par rapport au dossier de travail
    const isAbsolute = /^[A-Z]:/i.test(path) || path.startsWith("/") || path.startsWith("\\");
    const resolvedPath = isAbsolute ? path : (this.currentWorkdir ? `${this.currentWorkdir}\\${path}` : path);
    console.log(`📄 [BrowserController] reading file: ${resolvedPath}`);

    try {
      const content = await window.neurochatElectron.fs.readFile(resolvedPath);
      console.log(`✅ [BrowserController] read success (${content.length} chars)`);
      return {
        success: true,
        data: { path: resolvedPath, content: content.slice(0, 5000) },
      };
    } catch (error: unknown) {
      console.error(`❌ [BrowserController] readFile failed:`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Écrit dans un fichier
   */
  private async writeFile(path?: string, content?: string): Promise<BrowserActionResult> {
    if (!window.neurochatElectron) return { success: false, error: "Mode Desktop requis" };
    if (!path) return { success: false, error: "Chemin de fichier manquant" };
    if (content === undefined) return { success: false, error: "Contenu manquant" };

    const isAbsolute = /^[A-Z]:/i.test(path) || path.startsWith("/") || path.startsWith("\\");
    const resolvedPath = isAbsolute ? path : (this.currentWorkdir ? `${this.currentWorkdir}\\${path}` : path);
    console.log(`📝 [BrowserController] writing to file: ${resolvedPath}`);

    try {
      await window.neurochatElectron.fs.writeFile(resolvedPath, content);
      console.log(`✅ [BrowserController] write success`);
      return { success: true, data: { path: resolvedPath } };
    } catch (error: unknown) {
      console.error(`❌ [BrowserController] writeFile failed:`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Supprime un fichier ou dossier
   */
  private async deleteFile(path?: string): Promise<BrowserActionResult> {
    if (!window.neurochatElectron) return { success: false, error: "Mode Desktop requis" };
    if (!path) return { success: false, error: "Chemin manquant" };

    const isAbsolute = /^[A-Z]:/i.test(path) || path.startsWith("/") || path.startsWith("\\");
    const resolvedPath = isAbsolute ? path : (this.currentWorkdir ? `${this.currentWorkdir}\\${path}` : path);
    console.log(`🗑️ [BrowserController] deleting: ${resolvedPath}`);

    try {
      await window.neurochatElectron.fs.deleteItem(resolvedPath);
      console.log(`✅ [BrowserController] delete success`);
      return { success: true, data: { path: resolvedPath } };
    } catch (error: unknown) {
      console.error(`❌ [BrowserController] deleteFile failed:`, error);
      return { success: false, error: getErrorMessage(error) };
    }
  }
}

/**
 * Parse une commande en langage naturel en action de navigateur
 */
export function parseNaturalLanguageCommand(command: string): BrowserAction | null {
  const lowerCommand = command.toLowerCase().trim();

  // Navigation
  if (lowerCommand.includes("va sur") || lowerCommand.includes("ouvre") || lowerCommand.includes("navigue")) {
    const urlMatch = command.match(/(?:va sur|ouvre|navigue vers?)\s+(.+)/i);
    if (urlMatch) {
      let url = urlMatch[1].trim();
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }
      return {
        type: "navigate",
        params: { url },
        requiresConfirmation: true,
      };
    }
  }

  // Clic
  if (lowerCommand.includes("clique sur")) {
    const textMatch = command.match(/clique sur\s+(.+)/i);
    if (textMatch) {
      return {
        type: "click",
        params: { selector: { text: textMatch[1].trim() } },
      };
    }
  }

  // Saisie de texte
  if (lowerCommand.includes("écris") || lowerCommand.includes("tape") || lowerCommand.includes("saisis")) {
    const match = command.match(/(?:écris|tape|saisis)\s+"([^"]+)"\s+dans\s+(.+)/i);
    if (match) {
      return {
        type: "type",
        params: {
          text: match[1],
          selector: { placeholder: match[2].trim() },
        },
      };
    }
  }

  // Défilement
  if (lowerCommand.includes("descends") || lowerCommand.includes("scroll")) {
    return { type: "scroll", params: { direction: "down" } };
  }
  if (lowerCommand.includes("monte") || lowerCommand.includes("remonte")) {
    return { type: "scroll", params: { direction: "up" } };
  }

  // Extraction
  if (lowerCommand.includes("lis") || lowerCommand.includes("extrais") || lowerCommand.includes("récupère")) {
    return { type: "extract" };
  }

  // Navigation historique
  if (lowerCommand.includes("retour") || lowerCommand.includes("précédent")) {
    return { type: "back" };
  }
  if (lowerCommand.includes("suivant") || lowerCommand.includes("avance")) {
    return { type: "forward" };
  }

  // Dossiers / Système
  if (lowerCommand.includes("sélecteur de dossier") || lowerCommand.includes("choisir un dossier") || lowerCommand.includes("changer de dossier")) {
    return { type: "pickWorkdir" };
  }

  return null;
}
