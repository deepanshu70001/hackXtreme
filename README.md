<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-react/lucide/main/icons/layers.svg" width="80" height="80" alt="Vizora Desk Logo" />
  <h1>Vizora Desk</h1>
  <p><strong>The Privacy-First AI Workspace for Content & Insights</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Status-Hackathon_Ready-success?style=for-the-badge" alt="Status" />
    <img src="https://img.shields.io/badge/AI-100%25_Local-blueviolet?style=for-the-badge" alt="AI" />
    <img src="https://img.shields.io/badge/Stack-React_|_TS_|_Vite-blue?style=for-the-badge" alt="Stack" />
    <img src="https://img.shields.io/badge/CSS-Tailwind_v4-38b2ac?style=for-the-badge" alt="CSS" />
  </p>
</div>

---

## ⚡ Overview

**Vizora Desk** is a high-performance, privacy-centric workspace designed to convert noisy content into structured, actionable intelligence—all directly in your browser. Whether it's a 50-page PDF, a complex YouTube lecture, or raw meeting notes, Vizora processes everything **locally**, ensuring your data never leaves your device.

Built by **Team Visualizer** for the modern knowledge worker.

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **🧠 Local LLM** | Powered by `RunAnywhere SDK` and `llama.cpp`. Zero API costs, zero data tracking. |
| **📄 PDF Intelligence** | Extract text and perform local OCR on scanned documents using Tesseract.js. |
| **📺 YouTube Sync** | Auto-fetch transcripts and generate smart timelines for any video link. |
| **📑 Structured Outlines** | Instantly generate summaries, action items, timelines, and slide outlines. |
| **💡 Study Tools** | Automatic flashcard generation for concept reinforcement and review. |
| **💬 Context Chat** | Chat with your documents using a RAG-inspired local context window. |

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Style**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Engine**: [@runanywhere/web](https://runanywhere.ai/) (WASM/WebGPU Acceleration)
- **Logic**: [Zustand](https://zustand-demo.pmnd.rs/) (State), [Motion](https://motion.dev/) (Animations)
- **Extraction**: [Tesseract.js](https://tesseract.projectnaptha.com/) & [PDF.js](https://mozilla.github.io/pdf.js/)

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- Modern browser with WebGPU/WASM support (Chrome/Edge/Arc recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/deepanshu70001/hackXtreme.git
   cd local-ai-content-copilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Launch the engine**
   ```bash
   npm run dev
   ```

## 🏗️ Deployment Notes

This project uses a custom Vite plugin to bundle `RunAnywhere` WASM assets locally. 

> [!IMPORTANT]
> To run the AI engine in production (e.g., Vercel), ensure your hosting platform supports **Cross-Origin Opener Policy (COOP)** and **Cross-Origin Embedder Policy (COEP)**. These are configured in `vercel.json` for this project.

## 🤝 Community & Team

- **Team**: Visualizer
- **Inspiration**: Built to prove that local AI can replace cloud-based alternatives for daily productivity.

---

<div align="center">
  <p>Built with ❤️ for <strong>HackXtreme</strong></p>
</div>
