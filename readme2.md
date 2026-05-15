# 🧠 NeuroChat

> **Your AI-Powered Desktop Copilot** — A multimodal, voice-first personal assistant with persistent memory, autonomous file manipulation, and a self-evolving intelligence engine.

<div align="center">
  <img src="./public/header.png" alt="NeuroChat Banner" width="100%">

  ![build](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)
  ![version](https://img.shields.io/badge/version-2.1.0--beta-blueviolet?style=for-the-badge)
  ![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
  ![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=for-the-badge)

  **[Features](#-features)** · **[Quick Start](#-quick-start)** · **[Architecture](#-architecture)** · **[Agent Runtime](#-agent-runtime--skills)** · **[Contributing](#-contributing)**
</div>

---

## 🌟 Why NeuroChat?

Most AI assistants live in a browser tab and forget you the moment the page closes. **NeuroChat is different.** It runs natively on your desktop, remembers every conversation through semantic memory, autonomously reads and writes files, and continuously learns from your feedback to get better over time — all while keeping your data 100% local.

---

## ✨ Features

### 🎙️ Voice-First Multimodal Interaction
Talk naturally with your assistant using full-duplex audio powered by Gemini Live.

| Capability | Description |
|:---|:---|
| **Real-time Speech** | Full-duplex audio via WebSocket — speak and listen simultaneously |
| **Voice Activity Detection** | Smart silence/speech boundary detection with configurable sensitivity |
| **Audio Processing** | Noise suppression, echo cancellation, auto gain via AudioWorklet pipeline |
| **Live Transcription** | Real-time transcription of both user and assistant speech |
| **Multi-voice TTS** | Natural voice synthesis with configurable voice profiles (Puck, etc.) |

### 👁️ Contextual Vision
NeuroChat sees what you see and understands your visual context.
- **Screen Sharing** — Capture via Electron's `desktopCapturer` for real-time screen analysis
- **Multi-Camera Support** — Switch between front/rear/external cameras dynamically
- **Optimized Video Pipeline** — JPEG frames sent to Gemini with adaptive frame rates

### 🌐 Autonomous Browser Control (v2)
Give voice commands to navigate the web with zero manual interaction.
- **CommandParser v2** — Semantic analysis with confidence scoring (>0.7) and negative lookaheads to filter natural language from actual commands
- **Multi-Command Sequencing** — *"Search for AI news, then scroll down"* executes as a pipeline
- **Full Browser Control** — Tab management, zoom, screenshots, clipboard, scrolling, navigation
- **32/34 Test Coverage** — Built-in regression test suite runs on every startup

### 📂 Agentic File System (NEW)
The assistant autonomously manipulates your local filesystem through a secure IPC bridge.

```
User: "List the files in my project folder"
→ AI emits `list_files` → BrowserController executes via IPC
→ Electron reads directory → Result injected via sendClientContent()
→ AI responds: "I found 17 files including..."
```

| Command | Description |
|:---|:---|
| `pick_workdir` | Open native OS folder picker |
| `list_files` | List directory contents |
| `read_file <name>` | Read file content (up to 5KB) |
| `write_file <name>` | Write/create file |
| `delete_file <name>` | Delete file or folder |

- **Persistent Workdir** — Selected folder persists across sessions via localStorage
- **Smart Path Resolution** — Relative paths auto-resolve against `currentWorkdir`
- **Bidirectional IPC** — Results flow back to the AI via `sendClientContent()` with `turnComplete: true`

### 🧠 Long-Term Memory & RAG
NeuroChat remembers what matters across sessions.
- **Local Vector Store** — Secure embeddings (`text-embedding-004`, 3072 dims) stored on your machine
- **Semantic Search** — Find relevant past conversations by meaning, not keywords
- **Weekly Summaries** — Auto-generated session digests via DeepSeek v4 Flash (OpenRouter)
- **Conversation Vault** — Browse, search, and manage your full conversation history

### 🚀 NeuroLearning: Self-Evolution Engine
The assistant that learns from its mistakes and improves autonomously.
- **Implicit Feedback** — Detects user satisfaction signals (repetitions, corrections, follow-ups)
- **Learning Cycles** — Periodic analysis generates system prompt improvement proposals
- **Regression Monitoring** — Automatic rollback if a prompt version performs worse
- **Version History** — Full audit trail of personality and capability evolution
- **Transparent UI** — View applied improvements and their reasoning in the Learning tab

### 🔒 Privacy-First Desktop Native
- **100% Local Data** — Conversations, vectors, and preferences never leave your machine
- **No Cloud Storage** — All data lives in LocalStorage/Electron user data
- **OS Integration** — Native dialogs, file system access, screen capture without browser limitations

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **Gemini API Key** — Required for multimodal live sessions and embeddings
- **OpenRouter API Key** — Optional, for session summaries and LLM failover

### Installation

```bash
# Clone the repository
git clone https://github.com/moonback/NeuroChat.git
cd NeuroChat

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

| Variable | Description | Required |
|:---|:---|:---|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for multimodal live sessions | ✅ Yes |
| `VITE_OPENROUTER_API_KEY` | OpenRouter key for summaries & failover | Optional |

### Running

```bash
# Desktop (Electron) — Recommended
npm run electron:dev

# Web only (Browser)
npm run dev

# Mobile access (LAN)
npm run dev:lan
```

### Building

```bash
# Production build (Web)
npm run build

# Production build (Electron)
npm run build:electron

# Package as .exe installer
npm run package
```

---

## 🛠 Tech Stack

| Technology | Role | Version |
|:---|:---|:---|
| **React** | UI Framework | 19.0.1 |
| **Vite** | Build & Dev Server | 6.2.3 |
| **Electron** | Desktop Runtime | 35.0.0 |
| **TypeScript** | Language | 5.8.2 |
| **Tailwind CSS** | Styling | 4.1.14 |
| **Google Gemini** | Live Multimodal AI (Vision, Audio, Text) | `@google/genai` 1.29+ |
| **OpenRouter** | LLM Failover & Summaries (DeepSeek v4 Flash) | API |
| **Motion** | UI Animations | 12.23 |
| **Vitest** | Testing Framework | 4.1.6 |

---

## 🏗 Architecture

```
NeuroChat/
├── electron/                    # Electron main process
│   ├── main.cjs                 # Window management, IPC handlers (fs, dialog)
│   └── preload.cjs              # Secure bridge: neurochatElectron API
│
├── src/
│   ├── App.tsx                  # Main orchestration: turn lifecycle & tool dispatch
│   ├── main.tsx                 # React entry point
│   │
│   ├── components/
│   │   ├── AnimatedCharacter     # Avatar animation engine
│   │   ├── AvatarSelector        # Multi-avatar picker with personality config
│   │   ├── BrowserControlPanel   # Browser automation UI
│   │   ├── BrowserWindow         # Embedded browser view
│   │   ├── ConversationVault     # Memory browser & session manager
│   │   ├── DebugPanel            # Real-time debug console & test runner
│   │   ├── layout/               # Header, Footer, responsive shells
│   │   └── learning/             # NeuroLearning dashboard
│   │
│   ├── hooks/
│   │   ├── useGeminiSession      # Gemini Live WebSocket session manager
│   │   ├── useAIConversation     # High-level AI conversation orchestrator
│   │   └── useBrowserControl     # Browser action executor bridge
│   │
│   ├── lib/
│   │   ├── systemPrompt.ts       # Dynamic system prompt builder
│   │   ├── commandParser.ts      # Intent detection engine (32/34 tests passing)
│   │   ├── browserControl.ts     # BrowserController: IPC execution & workdir
│   │   ├── conversationMemory.ts # Session persistence & user profiles
│   │   ├── vectorStore.ts        # Local embedding storage & cosine similarity
│   │   ├── ragSearch.ts          # Retrieval-Augmented Generation pipeline
│   │   ├── conversationSummary.ts# Weekly digest generation via OpenRouter
│   │   ├── OpenRouterService.ts  # OpenRouter API client (failover)
│   │   ├── Audio*.ts             # AudioWorklet recorder/player pipeline
│   │   ├── agent/                # Agentic runtime (orchestrator, planner, executor)
│   │   ├── skills/               # Hardcoded skill definitions & registry
│   │   └── learning/             # Self-improvement engine
│   │
│   ├── skills-md/                # Markdown skill definitions (hot-loaded)
│   │   ├── FileSystem.md
│   │   ├── ResearchAssistant.md
│   │   ├── DataAnalysis.md
│   │   └── EmailDrafting.md
│   │
│   └── test/                     # Unit & integration tests
│
└── public/
    ├── audio-processor.js        # AudioWorklet processor (downsample + RMS)
    └── header.png                # Project banner
```

---

## 🤖 Agent Runtime & Skills

NeuroChat uses a modular agentic runtime inspired by Claude/OpenAI agent architectures, optimized for real-time voice interaction.

### How the Tool Loop Works

```
┌────────────────────┐
│   User speaks       │
│   "List my files"   │
└────────┬───────────┘
         │ audio → Gemini Live
         ▼
┌────────────────────┐
│   AI responds       │
│   "list_files"      │
└────────┬───────────┘
         │ turnComplete
         ▼
┌────────────────────┐
│   CommandParser     │  ← Detects intent from AI transcription
│   detectAllMatches  │
└────────┬───────────┘
         │ action: listDir
         ▼
┌────────────────────┐
│   BrowserController │  ← Executes via IPC bridge
│   executeAction     │
└────────┬───────────┘
         │ {success: true, files: [...]}
         ▼
┌────────────────────┐
│   sendClientContent │  ← Injects result into AI context
│   turnComplete:true │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│   AI responds       │
│   "Found 17 files…" │  ← AI sees the data and responds vocally
└────────────────────┘
```

### Skill System (Hybrid)

| Type | Location | Description |
|:---|:---|:---|
| **Hardcoded Skills** | `src/lib/skills/` | Complex actions requiring system access (browser, fs, OS) |
| **Markdown Skills** | `src/skills-md/*.md` | Prompt-injected competencies. Add a `.md` file and it's auto-loaded |

### Built-in Skills

| Skill | Type | Description |
|:---|:---|:---|
| `pick_workdir` | Filesystem | Open native folder picker |
| `list_files` | Filesystem | List directory contents |
| `read_file` | Filesystem | Read file content |
| `write_file` | Filesystem | Write/create files |
| `open_website` | Browser | Navigate to URL |
| `extract_page` | Browser | Extract page content |
| `save_memory_note` | Memory | Store persistent note |
| `retrieve_context` | Memory | Semantic memory search |
| `summarize_text` | AI | Text summarization |

### Agent Architecture

```
src/lib/agent/
├── orchestrator.ts        # Plan → Tool → Observation → Response loop
├── planner.ts             # Planning prompt construction
├── parser.ts              # Model output validation & parsing
├── executor.ts            # Tool execution via SkillRegistry
├── modelGateway.ts        # Gemini/OpenRouter + fallback chain
├── createAgentRuntime.ts  # Default runtime wiring
├── service.ts             # Singleton agent execution service
└── traceStore.ts          # Local trace persistence & observability

src/lib/skills/
├── registry.ts            # Registration, lookup, execution, cooldowns
├── policies.ts            # Authorization & confirmation flows
├── browser/               # Browser automation skills
├── memory/                # Memory persistence skills
├── desktop/               # OS-level skills
└── ai/                    # AI utility skills
```

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# With UI
npm run test:ui

# Coverage report
npm run test:coverage
```

The CommandParser includes an embedded regression suite (32/34 cases passing) that runs automatically on startup in dev mode.

---

## 📊 Key Metrics

| Metric | Value |
|:---|:---|
| CommandParser accuracy | 94% (32/34 tests) |
| Embedding dimensions | 3072 (text-embedding-004) |
| Max file read size | 5,000 characters |
| Audio format | PCM 16kHz mono |
| Session persistence | Unlimited (localStorage) |
| Vector store capacity | Unlimited (localStorage) |
| Agent fallback chain | Gemini → OpenRouter (DeepSeek v4 Flash) |

---

## 🗺️ Roadmap

- [x] Multimodal voice interaction (Gemini Live)
- [x] Persistent long-term memory with RAG
- [x] Autonomous browser control (v2)
- [x] Self-evolution engine (NeuroLearning)
- [x] Agentic file system manipulation
- [x] Bidirectional IPC tool bridge (`sendClientContent`)
- [ ] Multi-agent collaboration
- [ ] Plugin marketplace for community skills
- [ ] End-to-end encryption for memory store
- [ ] Mobile companion app (React Native)
- [ ] MCP (Model Context Protocol) server integration

---

## 🤝 Contributing

Contributions are welcome! Please check our [Contributing Guide](CONTRIBUTING.md) for workflow details and code standards.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/moonback">moonback</a></sub>
</div>
