# Vizora Desk

Vizora Desk is a privacy-first productivity workspace that converts PDFs, notes, and transcripts into structured outputs directly in the browser.

Brand inspiration: built by **Team Visualizer**, with a name inspired by your team identity.

## App Name
- Product: `Vizora Desk`
- Project/Package: `vizora-desk`

## What It Does
- Ingests content from:
  - Manual text input
  - PDF extraction
  - YouTube transcript paste
- Generates:
  - Summary
  - Timeline
  - Action items
  - Flashcards
  - Slide outline
  - Follow-up email
  - Context chat
- Supports:
  - Resizable split layout (input vs insights)
  - Exporting outputs
  - Local cached results

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand
- Motion
- RunAnywhere Web SDK + llama.cpp WebAssembly
- Tesseract.js (bundled local OCR assets)

## Local Development
1. Install dependencies
```bash
npm install
```

2. Start development server
```bash
npm run dev
```

3. Open in browser
- Default Vite URL is usually `http://localhost:5173`

## Production Build
```bash
npm run build
```

Build output is generated in:
- `frontend/dist`

## Deployment Notes (Important)
This project includes a Vite build plugin that copies required RunAnywhere WASM files into `frontend/dist/assets`:
- `racommons-llamacpp.wasm`
- `racommons-llamacpp-webgpu.wasm`

This prevents SDK startup failures caused by missing WASM assets in production.

## Project Structure
```text
frontend/
  public/
    tesseract/                 # Local OCR assets
    favicon.svg
  src/
    components/                # UI
    hooks/                     # Orchestration hooks
    lib/ai/                    # RunAnywhere integration and prompts
    lib/extractors/            # PDF/YouTube extraction
    store/                     # Zustand state
```

## Scripts
- `npm run dev` - Start Vite dev server
- `npm run lint` - Type check
- `npm run build` - Production build
- `npm run preview` - Preview production build
