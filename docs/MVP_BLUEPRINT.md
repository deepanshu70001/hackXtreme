# Local AI Content Copilot MVP Blueprint

## 1. System Architecture Diagram

```text
+----------------------------- Browser UI -----------------------------+
| React + Vite + Tailwind + Zustand                                  |
|                                                                    |
|  InputPanel                                                        |
|  - Text paste                                                      |
|  - PDF upload                                                      |
|  - YouTube URL + pasted transcript                                 |
|                                                                    |
|  OutputPanel                                                       |
|  - Summary                                                         |
|  - Action items + deadlines                                        |
|  - Flashcards                                                      |
|  - PPT outline                                                     |
+------------------------------+--------------------------------------+
                               |
                               v
+--------------------- Local Browser Processing ----------------------+
| Preprocessing                                                      |
| - PDF text extraction via bundled pdfjs worker                     |
| - YouTube URL validation + local transcript paste                  |
| - Content normalization                                            |
|                                                                    |
| RunAnywhere SDK                                                    |
| - RunAnywhere.init({ model, device, precision })                   |
| - ai.generate({ input, format: "json", stream: true })             |
|                                                                    |
| Structured Output                                                  |
| - summary                                                          |
| - key_points                                                       |
| - action_items                                                     |
| - deadlines                                                        |
| - flashcards                                                       |
| - slides                                                           |
| - notes                                                            |
+------------------------------+--------------------------------------+
                               |
                               v
+--------------------------- Local Storage ---------------------------+
| Zustand persisted history                                          |
| localStorage result cache                                          |
+--------------------------------------------------------------------+

+---------------------- Optional Local Dev Server --------------------+
| Express + Vite middleware                                          |
| - static serving only                                              |
| - /api/health                                                      |
| No inference and no external transcript fetching                   |
+--------------------------------------------------------------------+
```

## 2. Folder Structure

```text
root/
|-- backend/
|   `-- server.ts
|-- docs/
|   `-- MVP_BLUEPRINT.md
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |   |-- input/
|   |   |   |-- layout/
|   |   |   |-- output/
|   |   |   `-- shared/
|   |   |-- hooks/
|   |   |   `-- useLocalCopilot.ts
|   |   |-- lib/
|   |   |   |-- ai/
|   |   |   |   |-- prompts.ts
|   |   |   |   `-- runAnywhere.ts
|   |   |   |-- extractors/
|   |   |   `-- utils/
|   |   |-- store/
|   |   |-- types/
|   |   |-- App.tsx
|   |   |-- index.css
|   |   `-- main.tsx
|   |-- index.html
|   `-- vite.config.ts
|-- .env.example
|-- package.json
`-- README.md
```

## 3. Tech Stack

- Frontend: React 19, Vite 6, TypeScript
- Styling: Tailwind CSS v4, Motion, Lucide icons
- State: Zustand with persistence
- Local preprocessing: `pdfjs-dist`
- Local AI: `runanywhere-browser-sdk`
- Dev server: Express + Vite middleware

## 4. Step-By-Step Implementation Plan

1. Initialize a cached RunAnywhere model in the browser.
2. Build a single `runLocalAI(prompt)` wrapper and route all generation through it.
3. Enforce structured JSON output for every generation request.
4. Keep PDF extraction local with a bundled worker.
5. Replace YouTube transcript fetching with URL validation plus pasted captions.
6. Persist history and cache outputs on-device for smooth demos.
7. Surface model readiness and runtime state in the UI.
8. Keep the backend out of the inference path entirely.

## 5. Prompt Templates

### Summary

```text
Produce a concise summary that a busy teammate can understand in under 30 seconds.
```

### Key Points

```text
Extract the highest-signal ideas, decisions, risks, or learnings without repeating the summary.
```

### Action Items

```text
Identify concrete tasks, suggested owners if inferable, and mark urgency with high, medium, or low priority.
```

### Flashcards

```text
Turn the content into short recall prompts with crisp answers that can be studied quickly.
```

### PPT Outline

```text
Create a presentation outline with strong slide titles and supporting bullets that can drop into a deck.
```

### Structured Output Contract

```json
{
  "summary": "...",
  "key_points": ["..."],
  "action_items": [
    { "task": "...", "priority": "high", "deadline": "optional" }
  ],
  "deadlines": [
    { "label": "...", "due": "...", "confidence": "explicit" }
  ],
  "flashcards": [
    { "question": "...", "answer": "..." }
  ],
  "slides": [
    { "title": "...", "points": ["..."] }
  ],
  "notes": ["..."]
}
```

## 6. RunAnywhere Integration

The integration lives in `frontend/src/lib/ai/runAnywhere.ts`.

- `getModel()` lazily initializes and caches `RunAnywhere.init(...)`.
- WebGPU is attempted first and WASM is used if WebGPU init fails.
- `runLocalAI(prompt)` calls `ai.generate(...)` with `format: "json"` and `stream: true`.
- All app generation flows call this wrapper only.

## 7. YouTube Feature Implementation

1. User pastes a YouTube URL.
2. User pastes transcript or captions from YouTube or a local browser extension.
3. The browser validates the URL locally.
4. The pasted transcript is processed locally through RunAnywhere SDK.

## 8. Performance Optimization Techniques

- Lazy load the RunAnywhere model on first use.
- Cache the initialized model instance globally.
- Use streaming generation in the SDK request.
- Cache completed outputs in `localStorage`.
- Persist recent history locally for fast demo replay.
- Keep preprocessing asynchronous to avoid blocking the UI.
